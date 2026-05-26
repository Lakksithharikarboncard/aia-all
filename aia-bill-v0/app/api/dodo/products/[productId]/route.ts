import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import type { TimeInterval } from "dodopayments/resources/subscriptions";

function toInterval(freq: string): { count: number; interval: TimeInterval } {
  switch (freq) {
    case "quarterly": return { count: 3, interval: "Month" };
    case "annual":    return { count: 1, interval: "Year" };
    default:          return { count: 1, interval: "Month" };
  }
}

// PATCH /api/dodo/products/[productId]
// Updates name, price, and description on an existing Dodo product.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const { productId } = await params;

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { name, price, billingFrequency, description } = body;

  try {
    const { count, interval } = toInterval(billingFrequency ?? "monthly");
    const paise = Math.round((price ?? 0) * 100);

    await dodo.products.update(productId, {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(price != null ? {
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
      } : {}),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/dodo/products error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to update product" }, { status: 500 });
  }
}
