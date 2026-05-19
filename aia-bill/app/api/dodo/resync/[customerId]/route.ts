import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { getCustomer, saveCustomer, addAuditEntry } from "@/lib/billing/server-store";
import type { AccountStatus } from "@/lib/billing/types";

function dodoStatusToAccount(status: string): AccountStatus {
  switch (status) {
    case "active":    return "active";
    case "on_hold":   return "grace";
    case "cancelled": return "inactive";
    case "expired":   return "frozen";
    case "failed":    return "grace";
    default:          return "payment_pending";
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const { customerId } = await params;
  const customer = getCustomer(customerId);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (!customer.dodoCustomerId) {
    return NextResponse.json({ error: "No Dodo customer linked" }, { status: 400 });
  }

  try {
    const page = await dodo.subscriptions.list({ customer_id: customer.dodoCustomerId });
    const subs = page.items ?? [];

    // Use most recent active subscription first, then any subscription
    const active = subs.find((s) => s.status === "active");
    const latest = active ?? subs[0];

    if (!latest) {
      return NextResponse.json({ status: customer.status, message: "No subscriptions found in Dodo" });
    }

    const newStatus = dodoStatusToAccount(latest.status);
    const updated = {
      ...customer,
      status: newStatus,
      dodoSubscriptionId: latest.subscription_id,
      ...(newStatus === "active" && {
        activatedAt: customer.activatedAt ?? new Date().toISOString(),
        trialStartsAt: undefined,
        trialEndsAt: undefined,
        renewalDueDate: latest.next_billing_date
          ? new Date(latest.next_billing_date).toISOString()
          : customer.renewalDueDate,
      }),
      ...(newStatus === "grace" && {
        graceEndsAt: customer.graceEndsAt ?? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    };

    saveCustomer(updated);

    addAuditEntry({
      actor: "CS User",
      action: "dodo_resync",
      entityType: "customer",
      entityId: customerId,
      oldValue: customer.status,
      newValue: newStatus,
      reason: `Resynced from Dodo — subscription ${latest.subscription_id} is ${latest.status}`,
    });

    return NextResponse.json({ status: newStatus, dodoStatus: latest.status, subscriptionId: latest.subscription_id });
  } catch (err: any) {
    console.error("POST /api/dodo/resync error:", err);
    return NextResponse.json({ error: err?.message ?? "Resync failed" }, { status: 500 });
  }
}
