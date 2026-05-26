import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";

// PATCH /api/dodo/subscriptions/{subscriptionId}
// Updates a Dodo subscription (e.g. next_billing_date).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const { subscriptionId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await dodo.subscriptions.update(subscriptionId, {
      next_billing_date: body.next_billing_date ?? undefined,
      metadata: body.metadata ?? undefined,
    });
    return NextResponse.json({ success: true, subscription: result });
  } catch (err: any) {
    console.error("PATCH /api/dodo/subscriptions error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to update subscription" },
      { status: 500 }
    );
  }
}
