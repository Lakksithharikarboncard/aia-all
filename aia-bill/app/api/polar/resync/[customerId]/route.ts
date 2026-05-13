import { NextResponse } from "next/server";
import { getPolar } from "@/lib/polar/client";
import {
  getCustomer,
  saveCustomer,
  addAuditEntry,
} from "@/lib/billing/server-store";
import type { AccountStatus } from "@/lib/billing";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const polar = getPolar();
  if (!polar) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  try {
    const { customerId } = await params;
    const customer = getCustomer(customerId);
    if (!customer?.polarCustomerId) {
      return NextResponse.json(
        { error: "Customer not found or no billing ID" },
        { status: 404 }
      );
    }

    const state = await polar.customers.getState({
      id: customer.polarCustomerId,
    });

    const status = (state as Record<string, unknown>)?.status;
    if (status && typeof status === "string") {
      const updated = {
        ...customer,
        status: mapPolarStatus(status) as AccountStatus,
        ...((state as Record<string, unknown>)?.currentPeriodEnd
          ? { renewalDueDate: new Date((state as any).currentPeriodEnd as string).toISOString() }
          : {}),
      };
      saveCustomer(updated);
    }

    addAuditEntry({
      actor: "CS User",
      action: "polar_resynced",
      entityType: "customer",
      entityId: customerId,
      newValue: typeof status === "string" ? status : "no subscription",
      reason: "Manually refreshed from billing software",
    });

    return NextResponse.json({ synced: true, status });
  } catch (error) {
    console.error("POST /api/polar/resync error:", error);
    return NextResponse.json(
      { error: "Failed to refresh" },
      { status: 500 }
    );
  }
}

function mapPolarStatus(status: string): string {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
      return "grace";
    case "canceled":
      return "inactive";
    case "revoked":
      return "frozen";
    default:
      return "active";
  }
}
