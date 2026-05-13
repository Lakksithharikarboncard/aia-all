import { NextResponse } from "next/server";
import { polar, POLAR_ORG_ID } from "@/lib/polar/client";
import { saveCustomer, addAuditEntry } from "@/lib/billing/server-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerAccountId, name, email } = body;

    const polarCustomer = await polar.customers.create({
      name: name ?? undefined,
      email: email ?? undefined,
      externalId: customerAccountId,
      organizationId: POLAR_ORG_ID,
    });

    addAuditEntry({
      actor: "CS User",
      action: "polar_customer_created",
      entityType: "customer",
      entityId: customerAccountId,
      newValue: polarCustomer.id,
      reason: `Polar customer created: ${polarCustomer.id}`,
    });

    return NextResponse.json({ polarCustomerId: polarCustomer.id });
  } catch (error) {
    console.error("POST /api/polar/customers error:", error);
    return NextResponse.json(
      { error: "Failed to create Polar customer" },
      { status: 500 }
    );
  }
}
