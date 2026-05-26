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

// POST /api/dodo/products
// Creates a Dodo product from our plan preset.
export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { name, price, billingFrequency, description } = body;
  if (!name || !price || !billingFrequency) {
    return NextResponse.json({ error: "name, price, and billingFrequency required" }, { status: 400 });
  }

  try {
    const { count, interval } = toInterval(billingFrequency);
    const paise = Math.round(price * 100);
    const product = await dodo.products.create({
      name,
      description: description || `AI Accountant subscription — ${billingFrequency}`,
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

    return NextResponse.json({ dodoProductId: product.product_id });
  } catch (err: any) {
    console.error("POST /api/dodo/products error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to create product" }, { status: 500 });
  }
}
