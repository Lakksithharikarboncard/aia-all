import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { addAuditEntry, saveCustomer, getCustomer } from "@/lib/billing/server-store";
import type { CustomerAccount } from "@/lib/billing/types";

// POST /api/dodo/checkout
// Accepts customer + plan data inline so it works even if billing.json is empty.
// Full customerSnapshot (the full CustomerAccount object) should be sent so webhooks
// can find this customer via billing.json after the checkout session is created.
export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const body = await request.json();
  const {
    customerAccountId,
    primaryName,
    primaryEmail,
    primaryPhone,
    dodoCustomerId: existingDodoCustomerId,
    dodoProductId,
    trialDays,
    customerSnapshot, // full CustomerAccount from localStorage
  } = body;

  if (!customerAccountId || !dodoProductId) {
    return NextResponse.json({ error: "customerAccountId and dodoProductId required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5660";

  try {
    // Create or reuse Dodo customer
    let dodoCustomerId: string = existingDodoCustomerId ?? "";
    if (!dodoCustomerId) {
      if (!primaryEmail) {
        return NextResponse.json({ error: "primaryEmail required to create Dodo customer" }, { status: 400 });
      }
      // Only send phone if it's valid E.164 (starts with +, 10-15 digits after)
      const stripped = (primaryPhone ?? "").replace(/\s+/g, "").replace(/[^\d+]/g, "");
      const validPhone = /^\+\d{10,15}$/.test(stripped) ? stripped : undefined;
      const dc = await dodo.customers.create({
        name: primaryName ?? primaryEmail,
        email: primaryEmail,
        phone_number: validPhone,
      });
      dodoCustomerId = dc.customer_id;
    }

    // Create checkout session
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: dodoProductId, quantity: 1 }],
      customer: { customer_id: dodoCustomerId },
      billing_address: { country: "IN" },
      return_url: `https://app.aiaccountant.com/`,
      metadata: { customer_account_id: customerAccountId },
      ...(trialDays != null && trialDays > 0
        ? { subscription_data: { trial_period_days: trialDays } }
        : {}),
    });

    const checkoutUrl = session.checkout_url ?? "";

    // Persist to billing.json — webhook handler needs to find this customer
    const base: CustomerAccount = customerSnapshot ?? getCustomer(customerAccountId) ?? {
      id: customerAccountId,
      companyName: primaryName ?? customerAccountId,
      primaryName: primaryName ?? "",
      primaryEmail: primaryEmail ?? "",
      primaryPhone: primaryPhone ?? "",
      billingName: "",
      billingEmail: primaryEmail ?? "",
      billingPhone: "",
      csOwner: "",
      bdOwner: "",
      status: "payment_pending" as const,
      purchasedModules: [],
      notes: "",
      createdAt: new Date().toISOString(),
    };
    saveCustomer({ ...base, dodoCustomerId, checkoutUrl, status: "payment_pending" });

    addAuditEntry({
      actor: "CS User",
      action: "checkout_link_generated",
      entityType: "customer",
      entityId: customerAccountId,
      newValue: checkoutUrl,
      reason: "Dodo checkout session created",
    });

    return NextResponse.json({ url: checkoutUrl, sessionId: session.session_id, dodoCustomerId });
  } catch (err: any) {
    console.error("POST /api/dodo/checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to create checkout" }, { status: 500 });
  }
}
