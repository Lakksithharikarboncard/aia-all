import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import fs from "fs";
import path from "path";
import {
  getCustomer,
  saveCustomer,
  addAuditEntry,
} from "@/lib/billing/server-store";
import type {
  CustomerAccount,
  AccountStatus,
} from "@/lib/billing";

// ─── Deduplication file ────────────────────────────────────────────────
const DEDUP_FILE = path.resolve(process.cwd(), ".data", "webhook-events.json");

function loadProcessedIds(): Set<string> {
  try {
    const raw = fs.readFileSync(DEDUP_FILE, "utf-8");
    const ids: string[] = JSON.parse(raw);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function markProcessed(id: string) {
  const ids = loadProcessedIds();
  ids.add(id);
  // Keep only last 1000 to avoid unbounded growth
  const arr = Array.from(ids).slice(-1000);
  fs.writeFileSync(DEDUP_FILE, JSON.stringify(arr), "utf-8");
}

// ─── Signature verification helper ─────────────────────────────────────
function verifySignature(
  payload: string,
  headers: Headers
): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("POLAR_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }

  try {
    const wh = new Webhook(secret);

    // standardwebhooks expects specific header keys
    const headerMap: Record<string, string> = {};
    for (const [key, value] of headers.entries()) {
      headerMap[key.toLowerCase()] = value;
    }

    const timestampAge = Math.floor(Date.now() / 1000) - 300; // 5 min tolerance
    wh.verify(payload, headerMap);
    return true;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

// ─── Main handler ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = request.headers;

  // Verify signature
  if (!verifySignature(rawBody, headers)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Deduplicate
  const webhookId = headers.get("webhook-id") ?? "";
  if (webhookId) {
    const processed = loadProcessedIds();
    if (processed.has(webhookId)) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  // Parse event
  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Process event
  await handleEvent(event.type, event.data as any);

  // Mark as processed
  if (webhookId) markProcessed(webhookId);

  return NextResponse.json({ ok: true });
}

// ─── Event handler ─────────────────────────────────────────────────────
async function handleEvent(type: string, data: any) {
  console.log(`Webhook event: ${type}`);

  switch (type) {
    case "checkout.created":
      handleCheckoutCreated(data);
      break;
    case "customer.created":
      handleCustomerCreated(data);
      break;
    case "customer.updated":
      handleCustomerUpdated(data);
      break;
    case "customer.state_changed":
      handleCustomerStateChanged(data);
      break;
    case "subscription.created":
      handleSubscriptionCreated(data);
      break;
    case "subscription.active":
      handleSubscriptionActive(data);
      break;
    case "subscription.updated":
      handleSubscriptionUpdated(data);
      break;
    case "subscription.canceled":
      handleSubscriptionCanceled(data);
      break;
    case "subscription.revoked":
      handleSubscriptionRevoked(data);
      break;
    case "order.paid":
      handleOrderPaid(data);
      break;
    default:
      console.log(`Unhandled webhook event type: ${type}`);
  }
}

// ─── Individual event handlers ─────────────────────────────────────────

function handleCheckoutCreated(data: any) {
  const metadata = data.metadata as Record<string, string> | undefined;
  const customerAccountId = metadata?.customer_account_id;
  if (!customerAccountId) return;

  const customer = getCustomer(customerAccountId);
  if (!customer) return;

  customer.checkoutUrl = data.url;
  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "checkout_created",
    entityType: "customer",
    entityId: customerAccountId,
    newValue: data.id,
    reason: `Checkout created: ${data.id}`,
  });
}

function handleCustomerCreated(data: any) {
  const externalId = data.external_id ?? data.externalId;
  if (!externalId) return;

  const customer = getCustomer(externalId);
  if (!customer) return;

  customer.polarCustomerId = data.id;
  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "customer_created",
    entityType: "customer",
    entityId: externalId,
    newValue: data.id,
    reason: "Polar customer created via webhook",
  });
}

function handleCustomerUpdated(data: any) {
  const externalId = data.external_id ?? data.externalId;
  if (!externalId) return;

  addAuditEntry({
    actor: "polar:webhook",
    action: "customer_updated",
    entityType: "customer",
    entityId: externalId,
    reason: "Customer updated in Polar",
  });
}

function handleCustomerStateChanged(data: any) {
  const customerId = data.customer_id ?? data.customerId;
  if (!customerId) return;

  // Find customer by polarCustomerId
  const allCustomers = (() => {
    const { loadCustomers } = require("@/lib/billing/server-store");
    return loadCustomers() as CustomerAccount[];
  })();

  const customer = allCustomers.find((c) => c.polarCustomerId === customerId);
  if (!customer) return;

  // Sync purchased modules from granted benefits
  const benefits: { key: string }[] = data.granted_benefits ?? data.grantedBenefits ?? [];
  const moduleIds = benefits
    .map((b) => b.key)
    .filter((k) =>
      ["dashboard", "accounts_payable", "accounts_receivable", "transactions",
        "gst_reconciliation", "reporting", "tally_zoho"].includes(k)
    );

  if (moduleIds.length > 0) {
    customer.purchasedModules = moduleIds as any;
    saveCustomer(customer);
  }

  addAuditEntry({
    actor: "polar:webhook",
    action: "customer_state_changed",
    entityType: "customer",
    entityId: customer.id,
    reason: "Customer state changed in Polar, modules synced",
  });
}

function handleSubscriptionCreated(data: any) {
  const externalCustomerId =
    data.customer_external_id ?? data.customerExternalId ?? data.customer?.externalId;
  if (!externalCustomerId) return;

  const customer = getCustomer(externalCustomerId);
  if (!customer) return;

  const status = data.status;
  const currentPeriodStart = data.current_period_start ?? data.currentPeriodStart;
  const currentPeriodEnd = data.current_period_end ?? data.currentPeriodEnd;

  if (status === "trialing") {
    customer.status = "trial";
    customer.trialStartsAt = currentPeriodStart
      ? new Date(currentPeriodStart).toISOString()
      : new Date().toISOString();
    customer.trialEndsAt = currentPeriodEnd
      ? new Date(currentPeriodEnd).toISOString()
      : undefined;
    customer.activatedAt = new Date().toISOString();
  } else if (status === "active") {
    customer.status = "active";
    customer.activatedAt = new Date().toISOString();
    customer.renewalDueDate = currentPeriodEnd
      ? new Date(currentPeriodEnd).toISOString()
      : undefined;
    customer.trialStartsAt = undefined;
    customer.trialEndsAt = undefined;
  }

  customer.polarSubscriptionId = data.id;
  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "subscription_created",
    entityType: "customer",
    entityId: externalCustomerId,
    newValue: status,
    reason: `Subscription created with status: ${status}`,
  });
}

function handleSubscriptionActive(data: any) {
  const externalCustomerId =
    data.customer_external_id ?? data.customerExternalId ?? data.customer?.externalId;
  if (!externalCustomerId) return;

  const customer = getCustomer(externalCustomerId);
  if (!customer) return;

  // Trial → active transition
  const wasTrial = customer.status === "trial";
  customer.status = "active";
  customer.activatedAt = customer.activatedAt ?? new Date().toISOString();
  customer.trialStartsAt = undefined;
  customer.trialEndsAt = undefined;

  const currentPeriodEnd = data.current_period_end ?? data.currentPeriodEnd;
  if (currentPeriodEnd) {
    customer.renewalDueDate = new Date(currentPeriodEnd).toISOString();
  }

  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "subscription_activated",
    entityType: "customer",
    entityId: externalCustomerId,
    newValue: wasTrial ? "trial→active" : "active",
    reason: wasTrial
      ? "Subscription transitioned from trial to active"
      : "Subscription became active",
  });
}

function handleSubscriptionUpdated(data: any) {
  const externalCustomerId =
    data.customer_external_id ?? data.customerExternalId ?? data.customer?.externalId;
  if (!externalCustomerId) return;

  const customer = getCustomer(externalCustomerId);
  if (!customer) return;

  const currentPeriodEnd = data.current_period_end ?? data.currentPeriodEnd;
  if (currentPeriodEnd) {
    customer.renewalDueDate = new Date(currentPeriodEnd).toISOString();
  }

  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "subscription_updated",
    entityType: "customer",
    entityId: externalCustomerId,
    reason: "Subscription updated in Polar",
  });
}

function handleSubscriptionCanceled(data: any) {
  const externalCustomerId =
    data.customer_external_id ?? data.customerExternalId ?? data.customer?.externalId;
  if (!externalCustomerId) return;

  const customer = getCustomer(externalCustomerId);
  if (!customer) return;

  customer.status = "inactive";
  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "subscription_canceled",
    entityType: "customer",
    entityId: externalCustomerId,
    reason: "Subscription canceled",
  });
}

function handleSubscriptionRevoked(data: any) {
  const externalCustomerId =
    data.customer_external_id ?? data.customerExternalId ?? data.customer?.externalId;
  if (!externalCustomerId) return;

  const customer = getCustomer(externalCustomerId);
  if (!customer) return;

  customer.status = "frozen";
  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "subscription_revoked",
    entityType: "customer",
    entityId: externalCustomerId,
    reason: "Subscription revoked — account frozen",
  });
}

function handleOrderPaid(data: any) {
  const externalCustomerId =
    data.customer_external_id ?? data.customerExternalId ?? data.customer?.externalId;
  if (!externalCustomerId) return;

  const customer = getCustomer(externalCustomerId);
  if (!customer) return;

  // Bump renewalDueDate
  const currentPeriodEnd = data.current_period_end ?? data.currentPeriodEnd;
  if (currentPeriodEnd) {
    customer.renewalDueDate = new Date(currentPeriodEnd).toISOString();
  }

  // If was grace, flip to active
  if (customer.status === "grace") {
    customer.status = "active";
  }

  saveCustomer(customer);

  addAuditEntry({
    actor: "polar:webhook",
    action: "order_paid",
    entityType: "customer",
    entityId: externalCustomerId,
    reason: "Order paid — subscription renewed",
  });
}
