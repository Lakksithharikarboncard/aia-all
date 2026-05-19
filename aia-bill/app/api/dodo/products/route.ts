import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { addAuditEntry } from "@/lib/billing/server-store";
import type { TimeInterval } from "dodopayments/resources/subscriptions";

function toInterval(freq: string): { count: number; interval: TimeInterval } {
  switch (freq) {
    case "quarterly": return { count: 3, interval: "Month" };
    case "annual":    return { count: 1, interval: "Year" };
    default:          return { count: 1, interval: "Month" };
  }
}

// POST /api/dodo/products — create a Dodo product from plan data
// Accepts full plan data inline (admin UI uses localStorage, not billing.json)
export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const body = await request.json();
  const { planMappingId, name, description, amount, billingFrequency } = body;

  if (!name || !amount || !billingFrequency) {
    return NextResponse.json({ error: "name, amount, billingFrequency required" }, { status: 400 });
  }

  const { count, interval } = toInterval(billingFrequency);
  const paise = Math.round(Number(amount) * 100);

  try {
    const product = await dodo.products.create({
      name,
      description: description ?? undefined,
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

    addAuditEntry({
      actor: "system",
      action: "dodo_product_created",
      entityType: "plan_mapping",
      entityId: planMappingId ?? name,
      newValue: product.product_id,
      reason: `Dodo product created for plan: ${name}`,
    });

    return NextResponse.json({ productId: product.product_id });
  } catch (err: any) {
    console.error("POST /api/dodo/products error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to create product" }, { status: 500 });
  }
}
