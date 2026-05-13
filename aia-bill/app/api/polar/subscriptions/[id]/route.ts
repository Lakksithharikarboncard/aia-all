import { NextResponse } from "next/server";
import { polar } from "@/lib/polar/client";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
