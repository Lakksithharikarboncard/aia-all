import { NextResponse } from "next/server";
import { getPolar, getPolarOrgId } from "@/lib/polar/client";
import { saveCustomer, addAuditEntry } from "@/lib/billing/server-store";

export async function POST(request: Request) {
  const polar = getPolar();
  const orgId = getPolarOrgId();
  if (!polar || !orgId) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { customerAccountId, name, email } = body;

    const polarCustomer = await polar.customers.create({
      name: name ?? undefined,
      email: email ?? undefined,
      externalId: customerAccountId,
      organizationId: orgId,
    });

    addAuditEntry({
      actor: "CS User",
      action: "polar_customer_created",
      entityType: "customer",
      entityId: customerAccountId,
      newValue: polarCustomer.id,
      reason: `Customer created in billing software: ${polarCustomer.id}`,
    });

    return NextResponse.json({ polarCustomerId: polarCustomer.id });
  } catch (error) {
    console.error("POST /api/polar/customers error:", error);
    return NextResponse.json(
      { error: "Failed to create customer in billing software" },
      { status: 500 }
    );
  }
}
