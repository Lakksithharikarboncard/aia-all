import { NextResponse } from "next/server";
import { getPolar } from "@/lib/polar/client";

export async function POST(request: Request) {
  const polar = getPolar();
  if (!polar) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { customerAccountId } = body;

    const session = await polar.customerSessions.create({
      externalCustomerId: customerAccountId,
    });

    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error("POST /api/polar/customer-session error:", error);
    return NextResponse.json(
      { error: "Failed to create customer session" },
      { status: 500 }
    );
  }
}
