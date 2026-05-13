"use client";

import * as React from "react";
import {
  ArrowLeft, Lock, Unlock, Edit, Link as LinkIcon, RefreshCw, Clock, Globe, Mail, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/mds/Container";
import { Header } from "@/components/mds/Header";
import { Breadcrumbs } from "@/components/mds/Breadcrumbs";
import { StatusIndicator, STATUS_MAP, STATUS_LABELS } from "@/components/mds/StatusIndicator";
import { Button } from "@/components/mds/Button";
import { Tabs } from "@base-ui/react/tabs";
import { Select as BaseSelect } from "@base-ui/react/select";
import { StatusBadge, Avatar } from "./components/StatusBadge";
import { InfoRow, InfoGrid } from "./components/InfoRow";
import { ReasonModal } from "./components/ReasonModal";
import {
  getCustomer, saveCustomer, updateCustomerStatus, updateCustomerModules,
  assignPlanToCustomer, generateSignupInviteLink,
  addNoteToCustomer, MODULES,
} from "@/lib/billing";
import { useToast } from "@/components/ui/Toast";
import type { CustomerAccount, PlanMapping, AccountStatus, ModuleId } from "@/lib/billing";

type CustomerSubTab = "overview" | "plan" | "payments" | "actions";

interface CustomerDetailViewProps {
  customerId: string;
  planMappings: PlanMapping[];
  onBack: () => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "trial", label: "Trial" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "active", label: "Active" },
  { value: "renewal", label: "Renewal" },
  { value: "grace", label: "Grace" },
  { value: "frozen", label: "Frozen" },
  { value: "inactive", label: "Inactive" },
];

export function CustomerDetailView({
  customerId,
  planMappings,
  onBack,
  onRefresh,
}: CustomerDetailViewProps) {
  const [customer, setCustomer] = React.useState<CustomerAccount | undefined>(() => getCustomer(customerId));
  const [modal, setModal] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const { addToast } = useToast();

  const reload = () => {
    const c = getCustomer(customerId);
    setCustomer(c);
  };

  React.useEffect(() => { reload(); }, [customerId]);

  const generatePolarCheckout = async () => {
    try {
      const res = await fetch("/api/polar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccountId: customerId, planMappingId: customer?.selectedPlanMappingId }),
      });
      if (!res.ok) throw new Error("Checkout creation failed");
      const data = await res.json();
      const updated = getCustomer(customerId);
      if (updated) {
        updated.checkoutUrl = data.url;
        saveCustomer(updated);
      }
      onRefresh();
      reload();
      copyToClipboard(data.url);
      addToast("Checkout link generated and copied!", "success");
    } catch {
      addToast("Failed to generate checkout link", "error");
    }
  };

  const openPolarPortal = async () => {
    try {
      const res = await fetch("/api/polar/customer-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccountId: customerId }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch {
      addToast("Failed to open Polar portal", "error");
    }
  };

  const resyncFromPolar = async () => {
    try {
      const res = await fetch(`/api/polar/resync/${customerId}`, { method: "POST" });
      if (!res.ok) throw new Error("Resync failed");
      onRefresh();
      reload();
      addToast("Status resynced from Polar", "success");
    } catch {
      addToast("Failed to resync from Polar", "error");
    }
  };

  if (!customer) return <div className="p-8 text-text-disabled">Customer not found.</div>;

  const plan = planMappings.find((p) => p.id === customer.selectedPlanMappingId);
  const packageName = customer.packageName ?? plan?.name ?? "No package assigned";
  const packageAmount = customer.packageAmount ?? plan?.amount;
  const packageBillingFrequency = customer.packageBillingFrequency ?? plan?.billingFrequency;
  const packageModules = customer.packageModules ?? plan?.modulesUnlocked ?? customer.purchasedModules;

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch { /* not supported */ }
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const doAction = (action: () => void) => {
    action();
    onRefresh();
    reload();
    setModal(null);
  };

  return (
    <div>
      {/* Modals (unchanged) */}
      {modal === "freeze" && (
        <ReasonModal
          title="Freeze Account"
          description={`Freeze ${customer.companyName}? Their access will be blocked.`}
          confirmLabel="Freeze Account"
          confirmVariant="danger"
          onConfirm={(r) => doAction(() => updateCustomerStatus(customerId, "frozen", "CS User", r))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "unfreeze" && (
        <ReasonModal
          title="Unfreeze Account"
          description={`Restore access for ${customer.companyName}?`}
          confirmLabel="Unfreeze"
          onConfirm={(r) => doAction(() => updateCustomerStatus(customerId, "active", "CS User", r))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "modules" && (
        <ModuleUpdateModal
          customer={customer}
          onConfirm={(modules, reason) => doAction(() => updateCustomerModules(customerId, modules, "CS User", reason))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "status" && (
        <StatusChangeModal
          currentStatus={customer.status}
          onConfirm={(status, reason) => doAction(() => updateCustomerStatus(customerId, status, "CS User", reason))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "note" && (
        <ReasonModal
          title="Add Note"
          description="Add an internal note to this customer."
          required={false}
          confirmLabel="Save Note"
          onConfirm={(reason) => {
            if (reason.trim()) {
              doAction(() => addNoteToCustomer(customerId, reason, "CS User"));
            }
          }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <Breadcrumbs
        items={[
          { label: "Korefi" },
          { label: "Customers", onClick: onBack },
          { label: customer.companyName },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">{customer.companyName}</h1>
          <p className="text-sm text-text-secondary mt-0.5">{customer.primaryName} · {customer.primaryEmail}</p>
        </div>
        <StatusIndicator
          type={STATUS_MAP[customer.status] ?? "pending"}
          label={STATUS_LABELS[customer.status] ?? customer.status}
        />
      </div>

      {/* Sub-tabs */}
      <Tabs.Root className="mt-6" defaultValue="overview">
        <Tabs.List className="flex gap-1 border-b border-border-default">
          <Tabs.Tab value="overview" className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors outline-none data-[active]:border-action-primary data-[active]:text-action-primary border-transparent text-text-secondary hover:text-text-heading cursor-pointer">Overview</Tabs.Tab>
          <Tabs.Tab value="plan" className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors outline-none data-[active]:border-action-primary data-[active]:text-action-primary border-transparent text-text-secondary hover:text-text-heading cursor-pointer">Plan & Modules</Tabs.Tab>
          <Tabs.Tab value="payments" className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors outline-none data-[active]:border-action-primary data-[active]:text-action-primary border-transparent text-text-secondary hover:text-text-heading cursor-pointer">Payments</Tabs.Tab>
          <Tabs.Tab value="actions" className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors outline-none data-[active]:border-action-primary data-[active]:text-action-primary border-transparent text-text-secondary hover:text-text-heading cursor-pointer">Admin Actions</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InfoGrid title="Company">
              <InfoRow label="Company Name" value={customer.companyName} />
              <InfoRow label="GSTIN" value={customer.gstin ?? ""} />
              <InfoRow label="Package" value={packageName} />
              <InfoRow label="CS Owner" value={customer.csOwner} />
              <InfoRow label="BD Owner" value={customer.bdOwner} />
              <InfoRow label="Created" value={new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
            </InfoGrid>

            <InfoGrid title="Primary User">
              <InfoRow label="Name" value={customer.primaryName} />
              <InfoRow label="Phone" value={customer.primaryPhone} />
              <InfoRow label="Email" value={customer.primaryEmail} full />
              <div className="col-span-2 pt-2 border-t border-border-divider">
                {(customer.status === "trial" || customer.status === "draft" || customer.status === "payment_pending") && (
                  <>
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
                      {customer.status === "trial" ? "Signup Invite" : "Checkout / Payment Link"}
                    </p>
                    {customer.status === "trial" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-surface-hover px-2 py-1 rounded flex-1 truncate text-text-secondary">
                            {customer.signupInviteUrl ?? "Not generated yet"}
                          </code>
                          {customer.signupInviteUrl && (
                            <button onClick={() => copyToClipboard(customer.signupInviteUrl!)} className="text-xs text-text-link hover:underline shrink-0">
                              {copied ? "Copied!" : "Copy"}
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="normal" onClick={() => {
                            const url = generateSignupInviteLink(customerId, "CS User");
                            onRefresh(); reload();
                            copyToClipboard(url);
                          }}>
                            <LinkIcon className="w-4 h-4 mr-2" /> Generate Invite
                          </Button>
                          {customer.signupInviteUrl && (
                            <a
                              href={`mailto:${customer.primaryEmail},${customer.billingEmail}?subject=${encodeURIComponent("Complete your AIA signup")}&body=${encodeURIComponent(`Hi ${customer.primaryName},\n\nUse this link to complete your AIA signup:\n${customer.signupInviteUrl}\n\nThanks,\nAI Accountant Team`)}`}
                              className="inline-flex items-center justify-center rounded-[4px] border border-border-default bg-white px-3 h-8 text-sm font-medium text-text-body hover:bg-surface-hover"
                            >
                              <Mail className="w-4 h-4 mr-2" /> Email Both
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-surface-hover px-2 py-1 rounded flex-1 truncate text-text-secondary">
                            {customer.checkoutUrl ?? "Not generated yet"}
                          </code>
                          {customer.checkoutUrl && (
                            <button onClick={() => copyToClipboard(customer.checkoutUrl!)} className="text-xs text-text-link hover:underline shrink-0">
                              {copied ? "Copied!" : "Copy"}
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="normal" onClick={generatePolarCheckout}>
                            <LinkIcon className="w-4 h-4 mr-2" /> Generate Checkout Link
                          </Button>
                          {customer.checkoutUrl && (
                            <a
                              href={`mailto:${customer.primaryEmail},${customer.billingEmail}?subject=${encodeURIComponent("Complete your payment for AI Accountant")}&body=${encodeURIComponent(`Hi ${customer.primaryName},\n\nUse this link to complete your payment and activate your AIA subscription:\n${customer.checkoutUrl}\n\nThanks,\nAI Accountant Team`)}`}
                              className="inline-flex items-center justify-center rounded-[4px] border border-border-default bg-white px-3 h-8 text-sm font-medium text-text-body hover:bg-surface-hover"
                            >
                              <Mail className="w-4 h-4 mr-2" /> Email Both
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </InfoGrid>

            <InfoGrid title="Billing Contact">
              <InfoRow label="Name" value={customer.billingName} />
              <InfoRow label="Phone" value={customer.billingPhone} />
              <InfoRow label="Email" value={customer.billingEmail} full />
            </InfoGrid>

            <InfoGrid title="Notes" columns={false}>
              <p className="text-sm text-text-body whitespace-pre-wrap leading-relaxed">
                {customer.notes || <span className="text-text-disabled italic">No notes yet.</span>}
              </p>
            </InfoGrid>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="plan" className="pt-6">
          <div className="space-y-5">
            <Container
              header={<Header variant="container" title="Assign Plan" />}
            >
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-heading mb-1.5">Package</label>
                  <BaseSelect.Root
                    value={customer.selectedPlanMappingId ?? ""}
                    onValueChange={(v) => {
                      if (v) {
                        assignPlanToCustomer(customerId, v as string, "CS User");
                        onRefresh(); reload();
                      }
                    }}
                    items={[{ value: "", label: "— No plan —" }, ...planMappings.filter((p) => p.active).map((p) => ({ value: p.id, label: `${p.name} — ₹${p.amount.toLocaleString("en-IN")}/${p.billingFrequency}` }))]}
                  >
                    <BaseSelect.Trigger className="flex h-9 w-full items-center justify-between gap-2 rounded-[4px] border border-border-default bg-white pl-3 pr-2.5 text-sm text-text-body select-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-action-primary data-[popup-open]:bg-surface-hover min-w-[200px]">
                      <BaseSelect.Value className="data-[placeholder]:text-text-disabled" placeholder="— No plan —" />
                      <BaseSelect.Icon className="flex text-text-disabled">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1L5 5L9 1" /></svg>
                      </BaseSelect.Icon>
                    </BaseSelect.Trigger>
                    <BaseSelect.Portal>
                      <BaseSelect.Positioner className="outline-hidden z-10" sideOffset={4} alignItemWithTrigger={false}>
                        <BaseSelect.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-[4px] bg-white py-1 text-text-body outline-1 outline-border-default">
                          <BaseSelect.List className="py-1 overflow-y-auto max-h-[var(--available-height)]">
                            {[{ value: "", label: "— No plan —" }, ...planMappings.filter((p) => p.active).map((p) => ({ value: p.id, label: `${p.name} — ₹${p.amount.toLocaleString("en-IN")}/${p.billingFrequency}` }))].map((opt) => (
                              <BaseSelect.Item key={opt.value} value={opt.value} className="grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-hidden select-none data-[highlighted]:bg-surface-hover data-[highlighted]:text-text-heading">
                                <BaseSelect.ItemIndicator className="col-start-1">
                                  <svg className="size-3" fill="currentColor" viewBox="0 0 10 10"><path d="M9.16 1.12c.35.23.45.7.22 1.04L5.14 8.66a.74.74 0 0 1-1.13.15L1.25 6.3a.74.74 0 1 1 1.01-1.06l2.1 1.91L8.12 1.34a.74.74 0 0 1 1.04-.22Z" /></svg>
                                </BaseSelect.ItemIndicator>
                                <BaseSelect.ItemText className="col-start-2">{opt.label}</BaseSelect.ItemText>
                              </BaseSelect.Item>
                            ))}
                          </BaseSelect.List>
                        </BaseSelect.Popup>
                      </BaseSelect.Positioner>
                    </BaseSelect.Portal>
                  </BaseSelect.Root>
                </div>
              </div>

              {(plan || customer.packageName) && (
                <div className="mt-5 flex items-baseline gap-x-6 gap-y-2 flex-wrap px-4 py-3 bg-surface-bg border border-border-default rounded-[3px]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                      Current Package
                    </span>
                    <span className="text-sm font-semibold text-text-heading mt-0.5">
                      {packageName}
                    </span>
                  </div>
                  {packageAmount && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                        Price
                      </span>
                      <span className="text-sm font-semibold text-text-heading tabular-nums mt-0.5">
                        ₹{packageAmount.toLocaleString("en-IN")}
                        <span className="text-text-secondary font-normal"> / {packageBillingFrequency}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                      Modules
                    </span>
                    <span className="text-sm font-semibold text-text-heading tabular-nums mt-0.5">
                      {packageModules.length} unlocked
                    </span>
                  </div>
                </div>
              )}
            </Container>

            <Container
              header={<Header variant="container" title="Purchased Modules" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODULES.map((m) => {
                  const has = customer.purchasedModules.includes(m.id);
                  return (
                    <div key={m.id} className={cn("flex items-center gap-3 p-3 rounded-[4px] border", has ? "border-[#037f0c]/30 bg-[#f0faf0]" : "border-border-default bg-surface-hover")}>
                      <div className={cn("w-8 h-8 rounded-[4px] flex items-center justify-center", has ? "bg-[#e6f4e6]" : "bg-white")}>
                        {has ? <CheckCircle2 className="w-4 h-4 text-status-success" /> : <Lock className="w-4 h-4 text-text-disabled" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-heading">{m.name}</p>
                        <p className="text-xs text-text-secondary">{has ? "Unlocked" : "Locked"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Container>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="payments" className="pt-6">
          <div className="space-y-5">
            <InfoGrid title="Polar Integration">
              <InfoRow label="Polar Customer ID" value={customer.polarCustomerId ?? "Not set"} mono />
              <InfoRow label="Polar Subscription ID" value={customer.polarSubscriptionId ?? "Not set"} mono />
              <InfoRow label="Subscription Status" value={customer.status} />
              {customer.status === "trial" && (
                <>
                  <InfoRow label="Trial Start" value={customer.trialStartsAt ? new Date(customer.trialStartsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                  <InfoRow label="Trial End" value={customer.trialEndsAt ? new Date(customer.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                </>
              )}
              {customer.checkoutUrl && (
                <div className="col-span-2 flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Checkout URL
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-surface-hover px-2 py-1 rounded-[2px] flex-1 truncate text-text-secondary">{customer.checkoutUrl}</code>
                    <button onClick={() => copyToClipboard(customer.checkoutUrl!)} className="text-xs text-text-link hover:underline shrink-0">
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <a
                      href={`mailto:${customer.primaryEmail},${customer.billingEmail}?subject=${encodeURIComponent("Complete your payment")}&body=${encodeURIComponent(`Hi ${customer.primaryName},\n\nComplete your payment: ${customer.checkoutUrl}`)}`}
                      className="inline-flex items-center gap-1 text-xs text-text-link hover:underline shrink-0"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  </div>
                </div>
              )}
              <InfoRow label="Next Renewal" value={customer.renewalDueDate ? new Date(customer.renewalDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
              {customer.graceEndsAt && <InfoRow label="Grace Ends" value={new Date(customer.graceEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />}
            </InfoGrid>

            <Container
              header={<Header variant="container" title="Payment Actions" />}
            >
              <div className="flex flex-wrap gap-3">
                {(customer.status === "draft" || customer.status === "payment_pending") && (
                  <Button variant="normal" onClick={generatePolarCheckout}>
                    <LinkIcon className="w-4 h-4 mr-2" /> Generate / Resend Checkout Link
                  </Button>
                )}
                {customer.status === "trial" && (
                  <>
                    <Button variant="normal" onClick={() => {
                      const nextEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                      const updated = { ...customer, trialEndsAt: nextEndDate };
                      saveCustomer(updated);
                      onRefresh(); reload();
                    }}>
                      <Clock className="w-4 h-4 mr-2" /> Extend Trial (14 days)
                    </Button>
                    <Button variant="normal" onClick={generatePolarCheckout}>
                      <LinkIcon className="w-4 h-4 mr-2" /> Convert to Paid Early
                    </Button>
                  </>
                )}
                <Button variant="normal" onClick={openPolarPortal}>
                  <Globe className="w-4 h-4 mr-2" /> Open Polar Portal
                </Button>
                <Button variant="normal" onClick={resyncFromPolar}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Resync Status
                </Button>
              </div>
            </Container>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="actions" className="pt-6">
          <div className="space-y-5">
            <Container
              header={<Header variant="container" title="Account Control" />}
            >
              <div className="flex flex-wrap gap-3">
                {customer.status !== "frozen" ? (
                  <Button variant="danger" onClick={() => setModal("freeze")}>
                    <Lock className="w-4 h-4 mr-2" /> Freeze Account
                  </Button>
                ) : (
                  <Button variant="normal" onClick={() => setModal("unfreeze")}>
                    <Unlock className="w-4 h-4 mr-2" /> Unfreeze Account
                  </Button>
                )}
                <Button variant="normal" onClick={() => setModal("modules")}>
                  <Edit className="w-4 h-4 mr-2" /> Update Modules
                </Button>
                <Button variant="normal" onClick={() => setModal("status")}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Change Status
                </Button>
                <Button variant="normal" onClick={() => setModal("note")}>
                  <Edit className="w-4 h-4 mr-2" /> Add Note
                </Button>
              </div>
            </Container>
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

// ─── Module Update Modal (restyled) ──────────────────────────────────
function ModuleUpdateModal({
  customer,
  onConfirm,
  onClose,
}: {
  customer: CustomerAccount;
  onConfirm: (modules: ModuleId[], reason: string) => void;
  onClose: () => void;
}) {
  const [selectedModules, setSelectedModules] = React.useState<ModuleId[]>(customer.purchasedModules);
  const [reason, setReason] = React.useState("");

  const toggleModule = (id: ModuleId) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[4px] border border-border-default w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-text-heading mb-4">Update Module Access</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {MODULES.map((m) => (
            <label key={m.id} className={cn("flex items-center gap-3 p-3 rounded-[4px] border cursor-pointer transition-all", selectedModules.includes(m.id) ? "border-action-primary bg-surface-selected" : "border-border-default")}>
              <input
                type="checkbox"
                checked={selectedModules.includes(m.id)}
                onChange={() => toggleModule(m.id)}
                className="h-4 w-4 text-action-primary border-border-default rounded"
              />
              <span className="text-sm font-medium text-text-heading">{m.name}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-heading mb-1.5">Reason (required)</label>
          <textarea
            rows={2}
            placeholder="Reason for module change..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary resize-none mb-4"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="normal" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!reason.trim()} onClick={() => onConfirm(selectedModules, reason)}>
            Update Modules
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Modal (restyled) ──────────────────────────────────
function StatusChangeModal({
  currentStatus,
  onConfirm,
  onClose,
}: {
  currentStatus: AccountStatus;
  onConfirm: (status: AccountStatus, reason: string) => void;
  onClose: () => void;
}) {
  const [selectedStatus, setSelectedStatus] = React.useState<AccountStatus>(currentStatus);
  const [reason, setReason] = React.useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[4px] border border-border-default w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-text-heading mb-4">Change Status</h3>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as AccountStatus)}
          className="w-full h-8 px-3 rounded-[4px] border border-border-default text-sm outline-none mb-4 bg-white text-text-body"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <textarea
          rows={2}
          placeholder="Reason (required)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary resize-none mb-4"
        />
        <div className="flex gap-3 justify-end">
          <Button variant="normal" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!reason.trim()} onClick={() => onConfirm(selectedStatus, reason)}>
            Update Status
          </Button>
        </div>
      </div>
    </div>
  );
}
