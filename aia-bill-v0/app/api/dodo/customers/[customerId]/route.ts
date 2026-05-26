import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";

// PATCH /api/dodo/customers/{customerId}
// Update a Dodo customer (name, email, phone)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const { customerId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const updated = await dodo.customers.update(customerId, {
      name: body.name ?? undefined,
      email: body.email ?? undefined,
      phone_number: body.phone ?? undefined,
    });
    return NextResponse.json({ success: true, customer: updated });
  } catch (err: any) {
    console.error("PATCH /api/dodo/customers error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to update Dodo customer" },
      { status: 500 }
    );
  }
}
