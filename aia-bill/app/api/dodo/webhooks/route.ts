import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import fs from "fs";
import path from "path";
import { getCustomer, loadCustomers, saveCustomer, addAuditEntry } from "@/lib/billing/server-store";
import type { CustomerAccount } from "@/lib/billing";

const DEDUP_FILE = path.resolve(process.cwd(), ".data", "webhook-events.json");

function loadProcessedIds(): Set<string> {
  try {
    return new Set(JSON.parse(fs.readFileSync(DEDUP_FILE, "utf-8")) as string[]);
  } catch {
    return new Set();
  }
}

function markProcessed(id: string) {
  const ids = loadProcessedIds();
  ids.add(id);
  const arr = Array.from(ids).slice(-1000);
  fs.mkdirSync(path.dirname(DEDUP_FILE), { recursive: true });
  fs.writeFileSync(DEDUP_FILE, JSON.stringify(arr), "utf-8");
}

function verifySignature(payload: string, headers: Headers): boolean {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("DODO_PAYMENTS_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }
  try {
    const headerMap: Record<string, string> = {};
    for (const [k, v] of headers.entries()) headerMap[k.toLowerCase()] = v;
    new Webhook(secret).verify(payload, headerMap);
    return true;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return false;
  }
}

function findCustomer(data: any): CustomerAccount | undefined {
  // Primary: our internal ID passed as metadata
  const internalId = data?.metadata?.customer_account_id;
  if (internalId) {
    const c = getCustomer(internalId);
    if (c) return c;
  }
  // Fallback: match by dodoCustomerId
  const dodoId = data?.customer?.customer_id ?? data?.customer_id;
  if (dodoId) {
    return loadCustomers().find((c) => c.dodoCustomerId === dodoId);
  }
  return undefined;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const webhookId = request.headers.get("webhook-id") ?? "";
  if (webhookId && loadProcessedIds().has(webhookId)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  let event: { type: string; data: any };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  handleEvent(event.type, event.data);
  if (webhookId) markProcessed(webhookId);

  return NextResponse.json({ ok: true });
}

function handleEvent(type: string, data: any) {
  console.log(`Dodo webhook: ${type}`);
  switch (type) {
    case "subscription.active":     return handleSubscriptionActive(data);
    case "subscription.renewed":    return handleSubscriptionRenewed(data);
    case "subscription.on_hold":    return handleSubscriptionOnHold(data);
    case "subscription.cancelled":  return handleSubscriptionCancelled(data);
    case "subscription.failed":     return handleSubscriptionFailed(data);
    case "subscription.expired":    return handleSubscriptionExpired(data);
    case "subscription.plan_changed": return handleSubscriptionActive(data);
    case "payment.succeeded":       return handlePaymentSucceeded(data);
    default:
      console.log(`Unhandled Dodo event: ${type}`);
  }
}

function handleSubscriptionActive(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  customer.status = "active";
  customer.dodoSubscriptionId = data.subscription_id ?? customer.dodoSubscriptionId;
  customer.activatedAt = customer.activatedAt ?? new Date().toISOString();
  customer.trialStartsAt = undefined;
  customer.trialEndsAt = undefined;
  if (data.next_billing_date) {
    customer.renewalDueDate = new Date(data.next_billing_date).toISOString();
  }
  saveCustomer(customer);

  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_activated",
    entityType: "customer",
    entityId: customer.id,
    newValue: "active",
    reason: "Subscription became active via Dodo webhook",
  });
}

function handleSubscriptionRenewed(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  customer.status = "active";
  if (data.next_billing_date) {
    customer.renewalDueDate = new Date(data.next_billing_date).toISOString();
  }
  saveCustomer(customer);

  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_renewed",
    entityType: "customer",
    entityId: customer.id,
    reason: "Subscription renewed via Dodo webhook",
  });
}

function handleSubscriptionOnHold(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  customer.status = "grace";
  // Grace window: 10 days from now (Dodo doesn't give exact end date)
  const graceEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  customer.graceEndsAt = graceEnd.toISOString();
  saveCustomer(customer);

  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_on_hold",
    entityType: "customer",
    entityId: customer.id,
    newValue: "grace",
    reason: "Subscription on hold — entered grace period",
  });
}

function handleSubscriptionCancelled(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  customer.status = "inactive";
  saveCustomer(customer);

  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_cancelled",
    entityType: "customer",
    entityId: customer.id,
    newValue: "inactive",
    reason: "Subscription cancelled via Dodo webhook",
  });
}

function handleSubscriptionFailed(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  if (customer.status !== "grace") {
    customer.status = "grace";
    customer.graceEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    saveCustomer(customer);
  }

  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_payment_failed",
    entityType: "customer",
    entityId: customer.id,
    reason: "Subscription payment failed",
  });
}

function handleSubscriptionExpired(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  customer.status = "frozen";
  customer.frozenAt = new Date().toISOString();
  saveCustomer(customer);

  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_expired",
    entityType: "customer",
    entityId: customer.id,
    newValue: "frozen",
    reason: "Subscription expired — account frozen",
  });
}

function handlePaymentSucceeded(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;

  if (customer.status === "grace") {
    customer.status = "active";
    customer.graceEndsAt = undefined;
    saveCustomer(customer);
  }

  addAuditEntry({
    actor: "dodo:webhook",
    action: "payment_succeeded",
    entityType: "customer",
    entityId: customer.id,
    reason: "Payment succeeded via Dodo webhook",
  });
}
