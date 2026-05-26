import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { getCustomer } from "@/lib/billing/server-store";

// GET /api/dodo/payments?customer_id=cust_xxx
// Returns payment history for a customer from Dodo Payments.
export async function GET(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const url = new URL(request.url);
  const customerAccountId = url.searchParams.get("customer_id");
  if (!customerAccountId) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const customer = getCustomer(customerAccountId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (!customer.dodoCustomerId) {
    return NextResponse.json({ error: "No Dodo customer linked" }, { status: 400 });
  }

  try {
    const page = await dodo.payments.list({ customer_id: customer.dodoCustomerId });
    const items = (page as any).items ?? [];

    const payments = items.map((p: any) => ({
      paymentId: p.payment_id ?? "—",
      amount: p.total_amount ?? 0,
      currency: p.currency ?? "INR",
      status: p.status ?? "unknown",
      paymentMethod: p.payment_method ?? "—",
      paymentMethodType: p.payment_method_type ?? null,
      createdAt: p.created_at ?? null,
      errorMessage: p.error_message ?? null,
      invoiceUrl: p.invoice_url ?? null,
    }));

    return NextResponse.json({ payments });
  } catch (err: any) {
    console.error("GET /api/dodo/payments error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to fetch payments" }, { status: 500 });
  }
}
