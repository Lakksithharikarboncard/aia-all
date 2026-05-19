import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { getCustomer } from "@/lib/billing/server-store";

export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const { customerAccountId } = await request.json();
  const customer = getCustomer(customerAccountId);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (!customer.dodoCustomerId) {
    return NextResponse.json({ error: "No Dodo customer linked yet" }, { status: 400 });
  }

  try {
    const portal = await dodo.customers.customerPortal.create(customer.dodoCustomerId, {
      return_url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5660",
    });
    return NextResponse.json({ url: portal.link });
  } catch (err: any) {
    console.error("POST /api/dodo/customer-portal error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to create portal session" }, { status: 500 });
  }
}
