import { NextResponse } from "next/server";
import { getSnapshot, mergeFromClient } from "@/lib/billing/server-store";
import type { BillingData } from "@/lib/billing/server-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = getSnapshot();
  return NextResponse.json(snapshot);
}

// Called by AdminDashboard on mount to push localStorage → billing.json
// Only writes if server store is empty (first boot or fresh deploy)
export async function POST(request: Request) {
  const data = await request.json() as BillingData;
  const existing = getSnapshot();
  if (existing.customers.length === 0) {
    mergeFromClient(data);
    return NextResponse.json({ ok: true, seeded: true });
  }
  return NextResponse.json({ ok: true, seeded: false });
}
