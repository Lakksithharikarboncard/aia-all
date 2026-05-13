import { NextResponse } from "next/server";
import { getPolar } from "@/lib/polar/client";
import {
  getCustomer,
  saveCustomer,
  addAuditEntry,
} from "@/lib/billing/server-store";

export async function POST(request: Request) {
  const polar = getPolar();
  if (!polar) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { customerAccountId, planMappingId } = body;

    const customer = getCustomer(customerAccountId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5660"}/checkout/success?checkout_id={CHECKOUT_ID}`;

    const checkout = await polar.checkouts.create({
      products: [planMappingId],
      externalCustomerId: customerAccountId,
      successUrl,
      metadata: {
        customer_account_id: customerAccountId,
        plan_mapping_id: planMappingId,
      } as Record<string, string | number | boolean>,
    });

    if (customer.status === "draft" || customer.status === "trial") {
      const updated = { ...customer, status: "payment_pending" as const };
      saveCustomer(updated);
    }

    addAuditEntry({
      actor: "CS User",
      action: "checkout_link_generated",
      entityType: "customer",
      entityId: customerAccountId,
      newValue: checkout.url,
      reason: "Checkout link generated",
    });

    return NextResponse.json({ url: checkout.url, id: checkout.id });
  } catch (error) {
    console.error("POST /api/polar/checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
