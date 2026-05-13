import { NextResponse } from "next/server";
import { getPolar } from "@/lib/polar/client";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const polar = getPolar();
  if (!polar) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    await polar.subscriptions.revoke({ id });

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("DELETE /api/polar/subscriptions error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
