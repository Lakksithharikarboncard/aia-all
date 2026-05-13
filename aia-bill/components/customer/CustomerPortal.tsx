"use client";

import * as React from "react";
import {
  Lock, CheckCircle2, AlertTriangle, CreditCard, ExternalLink, Package, Mail, Clock, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/reui/alert";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
  MODULES, getCustomer, loadPlanMappings, saveUpgradeRequest, addAuditEntry,
} from "@/lib/billing";
import type { CustomerAccount, PlanMapping, UpgradeRequest, ModuleId } from "@/lib/billing";

// ─── Billing info URL (dynamic by customer) ────────────────────────────
function billingInfoUrl(customerId: string): string {
  return `https://sandbox.polar.sh/dashboard/korefi-dev-1/customers/${customerId}`;
}

// ─── Toast ─────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-[#1f2328] text-white px-5 py-3 rounded-md flex items-center gap-3 text-sm font-medium shadow-lg">
      <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
      {message}
      <button onClick={onClose} className="ml-2 text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  );
}

export function CustomerPortal({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = React.useState<CustomerAccount | null>(null);
  const [planMappings, setPlanMappings] = React.useState<PlanMapping[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);
  const [requestModal, setRequestModal] = React.useState<ModuleId | null>(null);
  const [requestMessage, setRequestMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const c = getCustomer(customerId);
    setCustomer(c ?? null);
    setPlanMappings(loadPlanMappings());
  }, [customerId]);

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-[#8b949e] mb-3" />
          <p className="text-[#656d76]">Customer account not found.</p>
          <p className="text-sm text-[#8b949e] mt-1">Demo data may not be initialized.</p>
        </div>
      </div>
    );
  }

  const plan = planMappings.find((p) => p.id === customer.selectedPlanMappingId);
  const packageName = customer.packageName ?? plan?.name ?? "No package assigned";
  const packageAmount = customer.packageAmount ?? plan?.amount;
  const packageBillingFrequency = customer.packageBillingFrequency ?? plan?.billingFrequency;
  const packageModules = customer.packageModules ?? plan?.modulesUnlocked ?? customer.purchasedModules;
  const isTrial = customer.status === "trial";
  const isTrialExpired = isTrial && !!customer.trialEndsAt && new Date(customer.trialEndsAt).getTime() < Date.now();
  const isFrozen = customer.status === "frozen" || customer.status === "inactive";
  const isPending = customer.status === "payment_pending" || isTrialExpired;
  const isGrace = customer.status === "grace";

  const handleRequestAccess = () => {
    if (!requestModal) return;
    setSubmitting(true);
    const reqId = `req_${Date.now()}`;
    const request: UpgradeRequest = {
      id: reqId,
      customerAccountId: customer.id,
      requestedModule: requestModal,
      message: requestMessage.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    saveUpgradeRequest(request);
    addAuditEntry({
      actor: customer.primaryName,
      action: "upgrade_request_submitted",
      entityType: "upgrade_request",
      entityId: reqId,
      newValue: requestModal,
      reason: requestMessage.trim() || "Customer requested module access",
    });
    setSubmitting(false);
    setRequestModal(null);
    setRequestMessage("");
    setToast(`Request submitted for ${MODULES.find((m) => m.id === requestModal)?.name}. Our team will review shortly.`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Request Access Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-md border border-[#d0d7de] w-full max-w-md p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[#1f2328]">Request Module Access</h3>
                <p className="text-sm text-[#656d76] mt-0.5">{MODULES.find((m) => m.id === requestModal)?.name}</p>
              </div>
              <button onClick={() => { setRequestModal(null); setRequestMessage(""); }} className="p-1 text-[#8b949e] hover:text-[#656d76]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Tell us why you need this module and how you plan to use it..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md text-sm outline-none resize-none mb-4 shadow-[0_1px_0_rgba(31,35,40,0.04)]"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setRequestModal(null); setRequestMessage(""); }}>Cancel</Button>
              <Button size="sm" loading={submitting} onClick={handleRequestAccess}>
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[#d0d7de] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0969da] rounded-md flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#1f2328]">AIA — AI Accountant</h1>
                <p className="text-xs text-[#656d76]">{customer.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadgeCustomer status={customer.status} />
              <div className="w-8 h-8 bg-[#0969da] rounded-full flex items-center justify-center text-sm font-bold text-white">
                {customer.primaryName.charAt(0)}
              </div>
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 pb-28">
        {/* Frozen / Inactive Gate */}
        {isFrozen && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full bg-white rounded-md border-2 border-[#f1b3b3] p-10 text-center">
              <div className="w-16 h-16 bg-[#ffebe9] rounded-full flex items-center justify-center mx-auto mb-5">
                <Lock className="w-8 h-8 text-[#cf222e]" />
              </div>
              <h2 className="text-xl font-bold text-[#cf222e] mb-2">Account Frozen</h2>
              <p className="text-[#656d76] leading-relaxed mb-6">
                Your account access has been suspended. Please contact our support team or manage your billing to restore access.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => alert("This would open the Polar Customer Portal to manage your subscription.")}>
                  <CreditCard className="w-4 h-4 mr-2" /> Manage Billing
                </Button>
                <Button variant="outline" onClick={() => { window.location.href = "mailto:cs@korefi.ai"; }}>
                  <Mail className="w-4 h-4 mr-2" /> Contact CS
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Pending Gate */}
        {isPending && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full bg-white rounded-md border-2 border-[#d4a72c] p-10 text-center shadow-[0_1px_3px_rgba(31,35,40,0.12),0_1px_0_rgba(31,35,40,0.04)]">
              <div className="w-16 h-16 bg-[#fff8c5] rounded-full flex items-center justify-center mx-auto mb-5">
                <CreditCard className="w-8 h-8 text-[#9a6700]" />
              </div>
              <h2 className="text-xl font-bold text-[#1f2328] mb-2">{isTrialExpired ? "Trial Ended" : "Payment Required"}</h2>
              <p className="text-[#656d76] leading-relaxed mb-6">
                {isTrialExpired
                  ? "Your 14-day trial has ended. Complete payment to continue using AIA."
                  : "Your account is pending payment. Please complete your payment to activate full access to your modules."}
              </p>
              <div className="flex flex-col gap-3">
                {customer.checkoutUrl ? (
                  <Button onClick={() => window.open(customer.checkoutUrl, "_blank")}>
                    <ExternalLink className="w-4 h-4 mr-2" /> Complete Payment
                  </Button>
                ) : (
                  <Button onClick={() => alert("Payment link not yet generated. Contact your CS team.")}>
                    Complete Payment
                  </Button>
                )}
                <Button variant="outline" onClick={() => { window.location.href = "mailto:cs@korefi.ai"; }}>
                  <Mail className="w-4 h-4 mr-2" /> Contact CS
                </Button>
              </div>
              {customer.checkoutUrl && (
                <p className="text-xs text-[#8b949e] mt-4 break-all">
                  Checkout URL: {customer.checkoutUrl}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Grace Warning Banner */}
        {isGrace && !isFrozen && !isPending && (
          <Frame variant="ghost" className="mb-6">
            <FramePanel className="overflow-hidden p-0!">
              <Alert variant="warning" className="border-0 shadow-none">
                <AlertTriangle className="size-5" />
                <AlertTitle>Payment Overdue</AlertTitle>
                <AlertDescription>
                  Your renewal payment is overdue. Please renew before{" "}
                  <strong>{customer.graceEndsAt ? new Date(customer.graceEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "grace period ends"}</strong>{" "}
                  to avoid account suspension.
                </AlertDescription>
              </Alert>
            </FramePanel>
          </Frame>
        )}

        {/* Tabs */}
        {!isFrozen && !isPending && (
          <>
            {isTrial && !isTrialExpired && (
              <Frame variant="ghost" className="mb-6">
                <FramePanel className="overflow-hidden p-0!">
                  <Alert variant="info" className="border-0 shadow-none">
                    <Clock className="size-5" />
                    <AlertTitle>Trial Active</AlertTitle>
                    <AlertDescription>
                      You have access to selected modules until{" "}
                      <strong>{customer.trialEndsAt ? new Date(customer.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "the end of your trial"}</strong>.
                    </AlertDescription>
                  </Alert>
                </FramePanel>
              </Frame>
            )}
            <BillingTab customer={customer} plan={plan} packageName={packageName} packageAmount={packageAmount} packageBillingFrequency={packageBillingFrequency} packageModules={packageModules} onRequestAccess={setRequestModal} />
          </>
        )}
      </main>
    </div>
  );
}

// ─── Status Badge (customer-friendly) ─────────────────────────────────
function StatusBadgeCustomer({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active:          { label: "Active",           color: "bg-[#dafbe1] text-[#1a7f37]" },
    trial:           { label: "Trial Active",     color: "bg-[#ddf4ff] text-[#0969da]" },
    grace:           { label: "Payment Overdue",  color: "bg-[#fff8c5] text-[#9a6700]" },
    frozen:          { label: "Account Frozen",   color: "bg-[#ffebe9] text-[#cf222e]" },
    payment_pending: { label: "Payment Required", color: "bg-[#fff8c5] text-[#9a6700]" },
    draft:           { label: "Setting up",       color: "bg-[#f6f8fa] text-[#656d76]" },
    inactive:        { label: "Inactive",         color: "bg-[#f6f8fa] text-[#8b949e]" },
    lead:            { label: "Lead",             color: "bg-[#ddf4ff] text-[#0969da]" },
  };
  const cfg = map[status] ?? map.draft;
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1", cfg.color)}>
      {cfg.label}
    </span>
  );
}

function BillingTab({
  customer, plan, packageName, packageAmount, packageBillingFrequency, packageModules, onRequestAccess,
}: {
  customer: CustomerAccount;
  plan: PlanMapping | undefined;
  packageName: string;
  packageAmount?: number;
  packageBillingFrequency?: string;
  packageModules: ModuleId[];
  onRequestAccess: (moduleId: ModuleId) => void;
}) {
  const statusLabel: Record<string, { label: string; color: string }> = {
    active:          { label: "Active",           color: "bg-[#dafbe1] text-[#1a7f37]" },
    trial:           { label: "Trial Active",     color: "bg-[#ddf4ff] text-[#0969da]" },
    grace:           { label: "Grace Period",     color: "bg-[#fff8c5] text-[#9a6700]" },
    payment_pending: { label: "Payment Pending",  color: "bg-[#fff8c5] text-[#9a6700]" },
    draft:           { label: "Draft",            color: "bg-[#f6f8fa] text-[#656d76]" },
    frozen:          { label: "Frozen",           color: "bg-[#ffebe9] text-[#cf222e]" },
    inactive:        { label: "Inactive",         color: "bg-[#f6f8fa] text-[#8b949e]" },
  };
  const sc = statusLabel[customer.status] ?? statusLabel.draft;
  const includedModules = React.useMemo(
    () => new Set<ModuleId>([...packageModules, "tally_zoho"]),
    [packageModules]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
        <h3 className="text-base font-semibold text-[#1f2328] mb-5">Billing</h3>

        <div className="bg-[#ddf4ff] rounded-md p-5 mb-5 border border-[#a6d1f6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#0969da] mb-1">
                {packageName}
              </p>
              {packageAmount ? (
                <p className="text-2xl font-bold text-[#1f2328]">
                  ₹{packageAmount.toLocaleString("en-IN")}
                  <span className="text-base font-normal text-[#656d76] ml-1">/ {packageBillingFrequency}</span>
                </p>
              ) : (
                <p className="text-[#8b949e] text-sm mt-1">Contact your CS team to get a plan assigned.</p>
              )}
            </div>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", sc.color)}>{sc.label}</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-[#f0f2f4]">
            <span className="text-[#656d76]">Billing Frequency</span>
            <span className="font-medium text-[#1f2328] capitalize">{packageBillingFrequency ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[#f0f2f4]">
            <span className="text-[#656d76]">Next Renewal</span>
            <span className="font-medium text-[#1f2328]">
              {customer.renewalDueDate
                ? new Date(customer.renewalDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          {customer.graceEndsAt && (
            <div className="flex justify-between py-2 border-b border-[#f0f2f4]">
              <span className="text-[#656d76]">Grace Period Ends</span>
              <span className="font-medium text-[#9a6700]">
                {new Date(customer.graceEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2">
            <span className="text-[#656d76]">Account Status</span>
            <span className={cn("font-medium", sc.color.split(" ")[1])}>{sc.label}</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#f0f2f4] flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(billingInfoUrl(customer.id), "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Billing Info
          </Button>
          <p className="text-xs text-[#8b949e]">
            Open the billing record in Polar to review customer billing details.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
        <h3 className="text-base font-semibold text-[#1f2328] mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULES.map((mid) => {
            const included = includedModules.has(mid.id);
            return (
              <div key={mid.id} className={cn("flex items-center justify-between gap-3 rounded-md border p-3", included ? "border-[#a6d1f6] bg-[#ddf4ff]" : "border-[#d0d7de] bg-[#f6f8fa]")}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1f2328]">{mid.name}</p>
                  <p className="text-xs text-[#656d76]">{mid.description}</p>
                </div>
                {included ? (
                  <span className="shrink-0 rounded-full border border-[#a6d1f6] bg-white px-3 py-1 text-xs font-medium text-[#0969da]">
                    Included
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onRequestAccess(mid.id)}>
                    Request Access
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {packageModules.length > 0 && (
        <div className="bg-white rounded-md border border-[#d0d7de] p-6 shadow-[0_1px_0_rgba(31,35,40,0.04)]">
          <h3 className="text-base font-semibold text-[#1f2328] mb-3">Package Includes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {packageModules.map((mid) => {
              const m = MODULES.find((mod) => mod.id === mid);
              return (
                <div key={mid} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#1a7f37] shrink-0" />
                  <span className="text-[#1f2328]">{m?.name ?? mid}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
