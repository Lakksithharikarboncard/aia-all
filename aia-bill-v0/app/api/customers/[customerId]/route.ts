import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/billing/server-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const customer = getCustomer(customerId);
  if (!customer) return NextResponse.json({ customer: null }, { status: 404 });
  return NextResponse.json({ customer });
}
