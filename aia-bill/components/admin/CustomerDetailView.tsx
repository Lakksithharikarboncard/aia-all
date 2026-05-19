"use client";

import * as React from "react";
import {
  Lock, Edit, Link as LinkIcon, RefreshCw, Clock, Globe, Mail, CheckCircle2, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/mds/Container";
import { Header } from "@/components/mds/Header";
import { Breadcrumbs } from "@/components/mds/Breadcrumbs";
import { StatusIndicator, STATUS_MAP, STATUS_LABELS } from "@/components/mds/StatusIndicator";
import { Button } from "@/components/mds/Button";
import { Tabs } from "@base-ui/react/tabs";
import { StatusBadge, Avatar } from "./components/StatusBadge";
import { InfoRow, InfoGrid } from "./components/InfoRow";
import {
  getCustomer, saveCustomer, deleteCustomer, updateCustomerStatus, updateCustomerModules,
  generateSignupInviteLink, addNoteToCustomer, MODULES,
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

  const generateDodoCheckout = async () => {
    try {
      if (!plan?.dodoProductId) {
        addToast("Sync the plan to Dodo first (Plans tab → Sync to Dodo)", "error");
        return;
      }
      const trialDays = customer?.status === "trial" ? 14 : undefined;
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerAccountId: customerId,
          primaryName: customer?.primaryName,
          primaryEmail: customer?.primaryEmail,
          primaryPhone: customer?.primaryPhone,
          dodoCustomerId: customer?.dodoCustomerId,
          dodoProductId: plan?.dodoProductId,
          trialDays,
          customerSnapshot: customer,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Checkout creation failed");
      }
      const data = await res.json();
      // Persist dodoCustomerId + checkoutUrl back to localStorage
      const updated = getCustomer(customerId);
      if (updated) {
        saveCustomer({
          ...updated,
          dodoCustomerId: data.dodoCustomerId ?? updated.dodoCustomerId,
          checkoutUrl: data.url,
          status: "payment_pending",
        });
      }
      onRefresh();
      reload();
      copyToClipboard(data.url);
      addToast("Checkout link generated and copied!", "success");
    } catch (err: any) {
      addToast(err?.message ?? "Failed to generate checkout link", "error");
    }
  };

  const resyncFromDodo = async () => {
    try {
      const res = await fetch(`/api/dodo/resync/${customerId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resync failed");
      // Update localStorage so the UI reflects immediately
      const updated = getCustomer(customerId);
      if (updated) {
        saveCustomer({
          ...updated,
          status: data.status,
          dodoSubscriptionId: data.subscriptionId ?? updated.dodoSubscriptionId,
        });
      }
      onRefresh();
      reload();
      addToast(`Resynced — status is now "${data.status}"`, "success");
    } catch (err: any) {
      addToast(err?.message ?? "Resync failed", "error");
    }
  };

  const openDodoPortal = async () => {
    try {
      const res = await fetch("/api/dodo/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccountId: customerId }),
      });
      if (!res.ok) throw new Error("Failed to create portal session");
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch {
      addToast("Failed to open billing portal", "error");
    }
  };

  if (!customer) return <div className="p-8 text-text-disabled">Customer not found.</div>;

  const plan = planMappings.find((p) => p.id === customer.selectedPlanMappingId);
  const packageName = customer.packageName ?? plan?.name ?? "No package assigned";

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
      {modal === "modules" && (
        <ModuleUpdateModal
          customer={customer}
          onConfirm={(modules, reason) => doAction(() => updateCustomerModules(customerId, modules, "CS User", reason))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "freeze" && (
        <FreezeModal
          companyName={customer.companyName}
          onConfirm={(reason) => doAction(() => updateCustomerStatus(customerId, "frozen", "CS User", reason))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "unfreeze" && (
        <FreezeModal
          companyName={customer.companyName}
          unfreeze
          onConfirm={(reason) => doAction(() => updateCustomerStatus(customerId, "active", "CS User", reason))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "note" && (
        <NoteModal
          onConfirm={(note) => doAction(() => addNoteToCustomer(customerId, note, "CS User"))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "editContact" && (
        <EditContactModal
          customer={customer}
          onConfirm={(patch) => {
            saveCustomer({ ...customer, ...patch });
            onRefresh();
            reload();
            setModal(null);
            addToast("Contact updated", "success");
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "delete" && (
        <DeleteConfirmModal
          companyName={customer.companyName}
          onConfirm={() => {
            deleteCustomer(customerId);
            setModal(null);
            onRefresh();
            onBack();
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

            <InfoGrid title="Primary User" action={<button onClick={() => setModal("editContact")} className="text-xs text-action-primary hover:underline font-medium">Edit</button>}>
              <InfoRow label="Name" value={customer.primaryName} />
              <InfoRow label="Phone" value={customer.primaryPhone} />
              <InfoRow label="Email" value={customer.primaryEmail} full />
              {customer.secondaryEmail && <InfoRow label="Secondary Email" value={customer.secondaryEmail} full />}
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
                          <Button size="sm" variant="normal" onClick={generateDodoCheckout}>
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

            {/* Customer Needs — reference context from creation */}
            {(customer.expectedBills || customer.expectedInvoices || customer.expectedStatements || customer.accountingSoftware?.length) ? (
              <InfoGrid title="Customer Needs">
                {!!customer.expectedBills && <InfoRow label="Bills / mo" value={String(customer.expectedBills)} />}
                {!!customer.expectedInvoices && <InfoRow label="Invoices / mo" value={String(customer.expectedInvoices)} />}
                {!!customer.expectedStatements && <InfoRow label="Statements / mo" value={String(customer.expectedStatements)} />}
                {!!customer.accountingSoftware?.length && (
                  <InfoRow label="Accounting Software" value={customer.accountingSoftware.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")} full />
                )}
                {!!customer.startDate && (
                  <InfoRow label="Start Date" value={new Date(customer.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
                )}
              </InfoGrid>
            ) : null}

            <InfoGrid title="Notes" columns={false}>
              <p className="text-sm text-text-body whitespace-pre-wrap leading-relaxed">
                {customer.notes || <span className="text-text-disabled italic">No notes yet.</span>}
              </p>
            </InfoGrid>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="plan" className="pt-6">
          <div className="space-y-5">
            {/* Plan summary */}
            <Container header={<Header variant="container" title="Current Plan" />}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-base font-semibold text-text-heading">{packageName}</p>
                  {customer.packageBillingFrequency && (
                    <p className="text-xs text-text-secondary mt-0.5 capitalize">{customer.packageBillingFrequency} billing</p>
                  )}
                </div>
                {customer.packageAmount ? (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-text-heading tabular-nums">
                      ₹{customer.packageAmount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 capitalize">
                      per {(customer.packageBillingFrequency ?? plan?.billingFrequency ?? "month").replace(/ly$/, "")}
                    </p>
                  </div>
                ) : plan?.amount ? (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-text-heading tabular-nums">
                      ₹{plan.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 capitalize">
                      per {plan.billingFrequency.replace(/ly$/, "")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-text-disabled">No price set</p>
                )}
              </div>
              {customer.renewalDueDate && (
                <div className="mt-4 pt-4 border-t border-border-divider flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Next renewal</span>
                  <span className="font-medium text-text-heading">
                    {new Date(customer.renewalDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}
            </Container>

            {/* Module access */}
            <Container header={<Header variant="container" title="Module Access" />}>
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
            <InfoGrid title="Dodo Payments">
              <InfoRow label="Dodo Customer ID" value={customer.dodoCustomerId ?? "Not linked"} mono />
              <InfoRow label="Dodo Subscription ID" value={customer.dodoSubscriptionId ?? "Not linked"} mono />
              <InfoRow label="Subscription Status" value={customer.status} />
              {customer.status === "trial" && (
                <>
                  <InfoRow label="Trial Start" value={customer.trialStartsAt ? new Date(customer.trialStartsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                  <InfoRow label="Trial End" value={customer.trialEndsAt ? new Date(customer.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
                </>
              )}
              <InfoRow label="Next Renewal" value={customer.renewalDueDate ? new Date(customer.renewalDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
              {customer.graceEndsAt && <InfoRow label="Grace Ends" value={new Date(customer.graceEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />}
            </InfoGrid>

            <Container
              header={<Header variant="container" title="Payment Actions" />}
            >
              <div className="flex flex-wrap gap-3">
                {customer.status === "trial" && (
                  <Button variant="normal" onClick={() => {
                    const nextEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                    const updated = { ...customer, trialEndsAt: nextEndDate };
                    saveCustomer(updated);
                    onRefresh(); reload();
                  }}>
                    <Clock className="w-4 h-4 mr-2" /> Extend Trial (14 days)
                  </Button>
                )}
                <Button variant="normal" onClick={resyncFromDodo} disabled={!customer.dodoCustomerId}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Resync from Dodo
                </Button>
                <Button variant="normal" onClick={openDodoPortal} disabled={!customer.dodoCustomerId}>
                  <Globe className="w-4 h-4 mr-2" /> Open Billing Portal
                </Button>
              </div>
            </Container>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="actions" className="pt-6">
          <div className="space-y-5">
            <Container header={<Header variant="container" title="Account Control" />}>
              <div className="space-y-4">
                {/* Freeze / Unfreeze */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-heading">
                      {customer.status === "frozen" ? "Account Frozen" : "Freeze Account"}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {customer.status === "frozen"
                        ? `Frozen ${customer.frozenAt ? new Date(customer.frozenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}. Unfreeze to restore access.`
                        : "Suspend access for compliance, fraud, or contractual reasons."}
                    </p>
                  </div>
                  {customer.status === "frozen" ? (
                    <Button variant="normal" size="sm" onClick={() => setModal("unfreeze")}>
                      Unfreeze
                    </Button>
                  ) : (
                    <Button variant="danger" size="sm" onClick={() => setModal("freeze")}>
                      Freeze
                    </Button>
                  )}
                </div>
                <hr className="border-border-divider" />
                {/* Modules */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-heading">Module Access</p>
                    <p className="text-xs text-text-secondary mt-0.5">Grant or revoke individual module access.</p>
                  </div>
                  <Button variant="normal" size="sm" onClick={() => setModal("modules")}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Update
                  </Button>
                </div>
                <hr className="border-border-divider" />
                {/* Note */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-heading">Add Note</p>
                    <p className="text-xs text-text-secondary mt-0.5">Visible to internal team only.</p>
                  </div>
                  <Button variant="normal" size="sm" onClick={() => setModal("note")}>
                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Add
                  </Button>
                </div>
              </div>
            </Container>

            <Container header={<Header variant="container" title="Danger Zone" />}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-heading">Delete customer</p>
                  <p className="text-xs text-text-secondary mt-0.5">Permanently removes this customer and all associated data. This cannot be undone.</p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setModal("delete")}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
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

// ─── Freeze / Unfreeze Modal ──────────────────────────────────────────
function FreezeModal({
  companyName,
  unfreeze = false,
  onConfirm,
  onClose,
}: {
  companyName: string;
  unfreeze?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[4px] border border-border-default w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-text-heading mb-1">
          {unfreeze ? "Unfreeze account" : "Freeze account"}
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          {unfreeze
            ? `Restores access for ${companyName}. Status will return to active.`
            : `Suspends all access for ${companyName}. This overrides their payment status.`}
        </p>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Reason (required)</label>
        <textarea
          autoFocus
          rows={3}
          placeholder={unfreeze ? "Why is access being restored?" : "Why is access being suspended?"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary resize-none mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            variant={unfreeze ? "primary" : "danger"}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {unfreeze ? "Restore access" : "Freeze account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Modal ──────────────────────────────────────────────────────
function NoteModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[4px] border border-border-default w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-text-heading mb-1">Add Note</h3>
        <p className="text-sm text-text-secondary mb-4">Internal note — visible to CS only.</p>
        <textarea
          autoFocus
          rows={4}
          placeholder="What should the team know?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary resize-none mb-4"
        />
        <div className="flex gap-3 justify-end">
          <Button variant="normal" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!note.trim()} onClick={() => onConfirm(note.trim())}>
            Save Note
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Contact Modal ───────────────────────────────────────────────
function EditContactModal({
  customer,
  onConfirm,
  onClose,
}: {
  customer: CustomerAccount;
  onConfirm: (patch: Partial<CustomerAccount>) => void;
  onClose: () => void;
}) {
  const [phone, setPhone] = React.useState(customer.primaryPhone ?? "");
  const [email, setEmail] = React.useState(customer.primaryEmail ?? "");
  const [secondary, setSecondary] = React.useState(customer.secondaryEmail ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[4px] border border-border-default w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-text-heading mb-4">Edit Contact</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Primary Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="w-full h-8 px-3 rounded-[4px] border border-border-default text-sm outline-none focus:border-action-primary bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Secondary Email</label>
            <input value={secondary} onChange={(e) => setSecondary(e.target.value)} type="email"
              placeholder="Optional — CC'd on invoices and payment links"
              className="w-full h-8 px-3 rounded-[4px] border border-border-default text-sm outline-none focus:border-action-primary bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel"
              placeholder="+91 98765 43210"
              className="w-full h-8 px-3 rounded-[4px] border border-border-default text-sm outline-none focus:border-action-primary bg-white" />
            <p className="text-[11px] text-text-disabled mt-1">Include country code for Dodo Payments, e.g. +91</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!email.trim()} onClick={() => onConfirm({
            primaryEmail: email.trim(),
            primaryPhone: phone.trim(),
            secondaryEmail: secondary.trim() || undefined,
          })}>Save</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────
function DeleteConfirmModal({
  companyName,
  onConfirm,
  onClose,
}: {
  companyName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = React.useState("");
  const match = typed.trim().toLowerCase() === companyName.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[4px] border border-border-default w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#ffebe9] flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-status-error" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-heading">Delete customer?</h3>
            <p className="text-sm text-text-secondary mt-0.5">
              This will permanently delete <span className="font-medium text-text-heading">{companyName}</span> and all associated data. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-text-secondary mb-1.5">
            Type <span className="font-medium text-text-body">{companyName}</span> to confirm
          </label>
          <input
            autoFocus
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={companyName}
            className="w-full px-3 py-2 border border-border-default rounded-[4px] text-sm outline-none focus:border-status-error focus:ring-2 focus:ring-status-error/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="sm" disabled={!match} onClick={onConfirm}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete permanently
          </Button>
        </div>
      </div>
    </div>
  );
}
