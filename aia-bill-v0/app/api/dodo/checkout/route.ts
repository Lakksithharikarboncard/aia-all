import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { addAuditEntry, saveCustomer, getCustomer } from "@/lib/billing/server-store";
import type { TimeInterval } from "dodopayments/resources/subscriptions";

function toInterval(freq: string): { count: number; interval: TimeInterval } {
  switch (freq) {
    case "quarterly": return { count: 3, interval: "Month" };
    case "annual":    return { count: 1, interval: "Year" };
    default:          return { count: 1, interval: "Month" };
  }
}

// POST /api/dodo/checkout
// Creates Dodo product + customer + checkout session in one call.
// Returns { signupUrl, checkoutUrl, dodoCustomerId, dodoProductId }.
// If dodoProductId / dodoCustomerId already exist on the customer, reuses them
// and only creates a fresh checkout session.
export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { customerAccountId, customerData } = body;
  if (!customerAccountId) {
    return NextResponse.json({ error: "customerAccountId required" }, { status: 400 });
  }

  // Merge stored record with incoming customerData so the client's latest values
  // (e.g. subscriptionStartDate just set in the UI) always win over a stale billing.json
  const stored = getCustomer(customerAccountId);
  const customer = stored
    ? { ...stored, ...(customerData ?? {}) }
    : (customerData ?? null);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found — pass customerData in request body" }, { status: 404 });
  }

  // Ensure this customer exists in billing.json so webhooks can find it later
  saveCustomer(customer);

  try {
    // Step 1 — Create Dodo product (skip if already exists)
    let dodoProductId = customer.dodoProductId ?? "";
    if (!dodoProductId) {
      const { count, interval } = toInterval(customer.billingFrequency);
      const paise = Math.round(customer.price * 100);
      const product = await dodo.products.create({
        name: `AIA Subscription – ${customer.companyName}`,
        description: `${customer.billingFrequency} subscription to AI Accountant`,
        tax_category: "saas",
        price: {
          type: "recurring_price",
          currency: "INR",
          discount: 0,
          price: paise,
          purchasing_power_parity: false,
          payment_frequency_count: count,
          payment_frequency_interval: interval,
          subscription_period_count: count,
          subscription_period_interval: interval,
        },
      });
      dodoProductId = product.product_id;
    }

    // Step 2 — Create Dodo customer (skip if already exists)
    let dodoCustomerId = customer.dodoCustomerId ?? "";
    if (!dodoCustomerId) {
      if (!customer.primaryEmail) {
        return NextResponse.json({ error: "primaryEmail required" }, { status: 400 });
      }
      const stripped = (customer.primaryPhone ?? "").replace(/\s+/g, "").replace(/[^\d+]/g, "");
      const validPhone = /^\+\d{10,15}$/.test(stripped) ? stripped : undefined;
      const dc = await dodo.customers.create({
        name: customer.primaryName ?? customer.primaryEmail,
        email: customer.primaryEmail,
        phone_number: validPhone,
      });
      dodoCustomerId = dc.customer_id;
    }

    // Step 3 — Compute trial days so first invoice lands on subscriptionStartDate
    let trialDays: number | undefined;
    if (customer.subscriptionStartDate) {
      const start = new Date(customer.subscriptionStartDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diff = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) trialDays = diff;
    }

    // Step 4 — Create fresh checkout session
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: dodoProductId, quantity: 1 }],
      customer: { customer_id: dodoCustomerId },
      billing_address: { country: "IN" },
      return_url: "https://app.aiaccountant.com/organisations/create-organisation",
      cancel_url: `https://app.aiaccountant.com/sign-up?ref=${customerAccountId}&cancelled=true`,
      metadata: { customer_account_id: customerAccountId },
      subscription_data: trialDays ? { trial_period_days: trialDays } : undefined,
    });

    const checkoutUrl = session.checkout_url ?? "";
    const signupUrl = `https://app.aiaccountant.com/sign-up?ref=${customerAccountId}`;

    // Persist to billing.json so webhook handler can find this customer
    saveCustomer({
      ...customer,
      dodoCustomerId,
      dodoProductId,
      checkoutUrl,
      signupUrl,
      status: "payment_pending",
    });

    addAuditEntry({
      actor: "CS User",
      action: "payment_link_generated",
      entityType: "customer",
      entityId: customerAccountId,
      newValue: signupUrl,
      reason: "Payment link generated",
    });

    return NextResponse.json({ signupUrl, checkoutUrl, dodoCustomerId, dodoProductId });
  } catch (err: any) {
    console.error("POST /api/dodo/checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to generate link" }, { status: 500 });
  }
}
