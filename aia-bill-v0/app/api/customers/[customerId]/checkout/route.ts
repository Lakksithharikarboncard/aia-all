import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { getCustomer, saveCustomer } from "@/lib/billing/server-store";
import type { TimeInterval } from "dodopayments/resources/subscriptions";

export const dynamic = "force-dynamic";

function toInterval(freq: string): { count: number; interval: TimeInterval } {
  switch (freq) {
    case "quarterly": return { count: 3, interval: "Month" };
    case "annual":    return { count: 1, interval: "Year" };
    default:          return { count: 1, interval: "Month" };
  }
}

// GET /api/customers/[customerId]/checkout
// Public — no auth. Called by the AIA sign-up page after the customer signs up.
// Accepts optional ?name= and ?email= query params (from the sign-up form).
// If provided, updates the Dodo customer record with the signup details so the
// checkout page arrives pre-filled with the customer's actual name and email.
// Always creates a fresh checkout session when name/email are supplied.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const customer = getCustomer(customerId);
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const signupName  = url.searchParams.get("name")  ?? undefined;
  const signupEmail = url.searchParams.get("email") ?? undefined;
  const hasSignupData = !!(signupName || signupEmail);

  // Return existing URL only when no signup data provided and URL is already set
  if (!hasSignupData && customer.checkoutUrl) {
    return NextResponse.json({ checkout_url: customer.checkoutUrl });
  }

  if (!customer.dodoProductId || !customer.dodoCustomerId) {
    return NextResponse.json({ error: "Payment link not yet generated" }, { status: 404 });
  }

  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  try {
    // Update Dodo customer with signup form details so checkout arrives pre-filled
    if (hasSignupData) {
      const patch: { name?: string; email?: string } = {};
      if (signupName)  patch.name  = signupName;
      if (signupEmail) patch.email = signupEmail;
      await dodo.customers.update(customer.dodoCustomerId, patch).catch(() => {/* non-critical */});
    }

    // Compute trial period if subscription start date is in the future
    let trialDays: number | undefined;
    if (customer.subscriptionStartDate) {
      const start = new Date(customer.subscriptionStartDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) trialDays = diffDays;
    }

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: customer.dodoProductId, quantity: 1 }],
      customer: { customer_id: customer.dodoCustomerId },
      billing_address: { country: "IN" },
      return_url: "https://app.aiaccountant.com/organisations/create-organisation",
      cancel_url: `https://app.aiaccountant.com/sign-up?ref=${customerId}&cancelled=true`,
      metadata: { customer_account_id: customerId },
      subscription_data: trialDays ? { trial_period_days: trialDays } : undefined,
    });

    const checkoutUrl = session.checkout_url ?? "";
    saveCustomer({ ...customer, checkoutUrl });

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err: any) {
    console.error("GET /api/customers/[customerId]/checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to regenerate checkout" }, { status: 500 });
  }
}
