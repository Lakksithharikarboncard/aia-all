import { NextResponse } from "next/server";
import { polar } from "@/lib/polar/client";

export async function POST(request: Request) {
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
