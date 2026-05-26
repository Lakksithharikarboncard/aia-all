import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";

// POST /api/dodo/customers
// Creates a Dodo customer from our customer record.
export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { primaryName, primaryEmail, primaryPhone } = body;
  if (!primaryEmail) {
    return NextResponse.json({ error: "primaryEmail required" }, { status: 400 });
  }

  try {
    const stripped = (primaryPhone ?? "").replace(/\s+/g, "").replace(/[^\d+]/g, "");
    const validPhone = /^\+\d{10,15}$/.test(stripped) ? stripped : undefined;
    const dc = await dodo.customers.create({
      name: primaryName ?? primaryEmail,
      email: primaryEmail,
      phone_number: validPhone,
    });

    return NextResponse.json({ dodoCustomerId: dc.customer_id });
  } catch (err: any) {
    console.error("POST /api/dodo/customers error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to create customer" }, { status: 500 });
  }
}
