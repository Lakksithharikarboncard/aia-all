"use client";

import * as React from "react";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/mds/FormField";
import { Input } from "@/components/mds/Input";
import { Select } from "@/components/mds/Select";
import { Textarea } from "@/components/mds/Textarea";
import { Button } from "@/components/mds/Button";
import { PlanFormDrawer } from "./components/PlanFormDrawer";
import {
  saveCustomer, generateSignupInviteLink,
  addAuditEntry, MODULES, SELECTABLE_MODULES, loadPlanMappings,
} from "@/lib/billing";
import type { CustomerAccount, PlanMapping, ModuleId } from "@/lib/billing";

interface CreateCustomerViewProps {
  planMappings: PlanMapping[];
  onBack: () => void;
  onCreated: (id: string) => void;
}

function normalizePackageModules(modules: ModuleId[]): ModuleId[] {
  const normalized = new Set<ModuleId>(modules);
  normalized.add("tally_zoho");
  if (normalized.has("dashboard")) normalized.add("reporting");
  return MODULES.filter((m) => normalized.has(m.id)).map((m) => m.id);
}

export function CreateCustomerView({ planMappings: initialPlanMappings, onBack, onCreated }: CreateCustomerViewProps) {
  // Live catalogue of plans — kept in sync with the store so creating a plan
  // (here or from the Packages tab) is immediately reflected in the dropdown.
  const [planMappings, setPlanMappings] = React.useState<PlanMapping[]>(initialPlanMappings);

  React.useEffect(() => {
    setPlanMappings(initialPlanMappings);
  }, [initialPlanMappings]);

  const refreshPlanMappings = React.useCallback(() => {
    setPlanMappings(loadPlanMappings());
  }, []);

  // Form state
  const [form, setForm] = React.useState({
    companyName: "",
    gstin: "",
    primaryName: "",
    primaryEmail: "",
    primaryPhone: "",
    billingName: "",
    billingEmail: "",
    billingPhone: "",
    csOwner: "",
    bdOwner: "",
    notes: "",
  });

  // Customer needs — volume is reference only, not used for pricing
  const [needs, setNeeds] = React.useState({
    billsPerMonth: 0,
    invoicesPerMonth: 0,
    statementsPerMonth: 0,
    accountingSoftware: [] as Array<"tally" | "zoho" | "excel" | "other">,
    requiredModules: [] as ModuleId[],
    startDate: "",
  });

  const [billingSameAsPrimary, setBillingSameAsPrimary] = React.useState(true);
  const [activationMode, setActivationMode] = React.useState<"payment" | "trial">("payment");
  const [selectedPackageId, setSelectedPackageId] = React.useState("");
  const [showPlanDrawer, setShowPlanDrawer] = React.useState(false);
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const setField = <K extends keyof typeof form>(k: K, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setNeed = <K extends keyof typeof needs>(k: K, v: typeof needs[K]) => setNeeds((p) => ({ ...p, [k]: v }));
  const toggleModule = (id: ModuleId) =>
    setNeed("requiredModules", needs.requiredModules.includes(id)
      ? needs.requiredModules.filter((m) => m !== id)
      : [...needs.requiredModules, id]);

  // All active plans — growth team picks the right one
  const availablePlans = React.useMemo(
    () => planMappings.filter((p) => p.active).sort((a, b) => a.amount - b.amount),
    [planMappings]
  );

  // Pre-select first plan when catalogue loads (can be overridden freely)
  React.useEffect(() => {
    if (!selectedPackageId && availablePlans.length > 0) {
      setSelectedPackageId(availablePlans[0].id);
    }
  }, [availablePlans]);

  const selectedPackage = availablePlans.find((p) => p.id === selectedPackageId) ?? null;

  const handleCreate = async () => {
    if (needs.requiredModules.length === 0) { setSetupError("Select at least one module."); return; }
    if (!selectedPackageId) { setSetupError("Choose a plan."); return; }

    setSaving(true);
    const id = `cust_${Date.now()}`;
    const chosenPackage = selectedPackage;
    const packageModules = chosenPackage?.modulesUnlocked ?? normalizePackageModules(needs.requiredModules);
    const createdAt = new Date().toISOString();

    const customer: CustomerAccount = {
      id,
      companyName: form.companyName.trim(),
      gstin: form.gstin.trim() || undefined,
      primaryName: form.primaryName.trim(),
      primaryEmail: form.primaryEmail.trim(),
      primaryPhone: form.primaryPhone.trim(),
      billingName: form.billingName.trim() || form.primaryName.trim(),
      billingEmail: form.billingEmail.trim() || form.primaryEmail.trim(),
      billingPhone: form.billingPhone.trim() || form.primaryPhone.trim(),
      csOwner: form.csOwner.trim(),
      bdOwner: form.bdOwner.trim(),
      status: activationMode === "trial" ? "trial" : "draft",
      selectedPlanMappingId: chosenPackage?.id,
      purchasedModules: packageModules,
      packageType: "mapped",
      packageName: chosenPackage?.name,
      packageAmount: chosenPackage?.amount,
      packageBillingFrequency: chosenPackage?.billingFrequency,
      packageModules,
      trialStartsAt: activationMode === "trial" ? createdAt : undefined,
      trialEndsAt: activationMode === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      expectedBills: needs.billsPerMonth,
      expectedInvoices: needs.invoicesPerMonth,
      expectedStatements: needs.statementsPerMonth,
      accountingSoftware: needs.accountingSoftware.length > 0 ? needs.accountingSoftware : undefined,
      startDate: needs.startDate || undefined,
      notes: form.notes.trim(),
      createdAt,
    };

    saveCustomer(customer);

    if (activationMode === "trial") {
      generateSignupInviteLink(id, "CS User");
      addAuditEntry({ actor: "CS User", action: "customer_created", entityType: "customer", entityId: id, newValue: form.companyName, reason: "Customer created with 14-day trial" });
      addAuditEntry({ actor: "CS User", action: "signup_invite_generated", entityType: "customer", entityId: id, newValue: "Signup link sent", reason: "Signup invite emailed to customer" });
    } else {
      // Generate Dodo checkout (creates Dodo customer + checkout session)
      if (chosenPackage?.dodoProductId) {
        try {
          const checkoutRes = await fetch("/api/dodo/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerAccountId: id,
              primaryName: customer.primaryName,
              primaryEmail: customer.primaryEmail,
              primaryPhone: customer.primaryPhone,
              dodoProductId: chosenPackage.dodoProductId,
              customerSnapshot: customer,
            }),
          });
          if (checkoutRes.ok) {
            const { url, dodoCustomerId } = await checkoutRes.json();
            // Write dodoCustomerId + checkoutUrl back to localStorage
            saveCustomer({ ...customer, dodoCustomerId, checkoutUrl: url, status: "payment_pending" });
          }
        } catch {
          // Checkout can be regenerated from Customer Detail
        }
      }
      addAuditEntry({ actor: "CS User", action: "customer_created", entityType: "customer", entityId: id, newValue: form.companyName, reason: "Customer created — payment pending" });
      addAuditEntry({ actor: "CS User", action: "checkout_link_generated", entityType: "customer", entityId: id, newValue: "Checkout link sent", reason: "Payment link emailed to customer" });
    }

    setSaving(false);
    onCreated(id);
  };

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded-[4px] border border-border-default text-text-secondary hover:text-text-heading hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-heading leading-tight">New Customer</h1>
          <p className="text-xs text-text-secondary mt-0.5">Fill in details and configure their plan</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_400px]">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Company */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Company</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Company Name" required>
                <Input value={form.companyName} onChange={(v) => setField("companyName", v)} placeholder="Acme Industries Pvt Ltd" />
              </FormField>
              <FormField label="GSTIN">
                <Input value={form.gstin} onChange={(v) => setField("gstin", v)} placeholder="27AABCU9603R1ZM" />
              </FormField>
            </div>
          </section>

          <hr className="border-border-divider" />

          {/* Primary contact */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Primary Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Name" required>
                <Input value={form.primaryName} onChange={(v) => setField("primaryName", v)} placeholder="Rajesh Sharma" />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" value={form.primaryEmail} onChange={(v) => setField("primaryEmail", v)} placeholder="rajesh@acme.in" />
              </FormField>
              <FormField label="Phone">
                <Input value={form.primaryPhone} onChange={(v) => setField("primaryPhone", v)} placeholder="+91 98765 43210" />
              </FormField>
            </div>
          </section>

          <hr className="border-border-divider" />

          {/* Billing contact */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">Billing Contact</p>
              <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={billingSameAsPrimary}
                  onChange={(e) => {
                    setBillingSameAsPrimary(e.target.checked);
                    if (e.target.checked) setForm((p) => ({ ...p, billingName: "", billingEmail: "", billingPhone: "" }));
                  }}
                  className="h-3.5 w-3.5 rounded border-border-default text-action-primary"
                />
                Same as primary
              </label>
            </div>
            {billingSameAsPrimary ? (
              <p className="text-sm text-text-secondary">
                Invoices sent to <span className="font-medium text-text-body">{form.primaryName || "primary contact"}</span>
                {form.primaryEmail && <span className="text-text-disabled"> · {form.primaryEmail}</span>}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Name">
                  <Input value={form.billingName} onChange={(v) => setField("billingName", v)} />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={form.billingEmail} onChange={(v) => setField("billingEmail", v)} />
                </FormField>
                <FormField label="Phone">
                  <Input value={form.billingPhone} onChange={(v) => setField("billingPhone", v)} />
                </FormField>
              </div>
            )}
          </section>

          <hr className="border-border-divider" />

          {/* Team */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Team</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="CS Owner">
                <Select value={form.csOwner} onChange={(v) => setField("csOwner", v)} placeholder="Unassigned"
                  options={["Priya Nair","Rahul Sharma","Ananya Gupta","Vikram Patel","Sneha Reddy"].map((n) => ({ value: n, label: n }))} />
              </FormField>
              <FormField label="BD Owner">
                <Select value={form.bdOwner} onChange={(v) => setField("bdOwner", v)} placeholder="Unassigned"
                  options={["Arjun Mehta","Kavita Singh","Rohit Verma","Deepa Iyer","Amit Joshi"].map((n) => ({ value: n, label: n }))} />
              </FormField>
            </div>
          </section>

          <hr className="border-border-divider" />

          {/* Customer needs — reference only */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-4">Customer Needs</p>

            {/* Volume */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Bills / mo", key: "billsPerMonth" as const },
                { label: "Invoices / mo", key: "invoicesPerMonth" as const },
                { label: "Statements / mo", key: "statementsPerMonth" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs text-text-secondary mb-1.5">{label}</label>
                  <input type="number" value={needs[key] || ""} onChange={(e) => setNeed(key, Number(e.target.value) || 0)}
                    placeholder="0" className="w-full h-8 px-2.5 rounded-[4px] border border-border-default text-sm outline-none bg-white text-text-body tabular-nums focus:border-action-primary" />
                </div>
              ))}
            </div>

            {/* Accounting software */}
            <div className="mb-5">
              <label className="block text-xs text-text-secondary mb-2">Accounting Software</label>
              <div className="flex gap-2 flex-wrap">
                {(["tally", "zoho", "excel", "other"] as const).map((sw) => {
                  const selected = needs.accountingSoftware.includes(sw);
                  return (
                    <button key={sw} type="button"
                      onClick={() => setNeed("accountingSoftware", selected
                        ? needs.accountingSoftware.filter((s) => s !== sw)
                        : [...needs.accountingSoftware, sw])}
                      className={cn("px-4 py-1.5 rounded-full text-xs font-medium border transition-all capitalize",
                        selected ? "border-action-primary bg-surface-selected text-action-primary" : "border-border-default text-text-secondary hover:border-border-strong")}
                    >{sw}</button>
                  );
                })}
              </div>
            </div>

            {/* Modules */}
            <div className="mb-5">
              <label className="block text-xs text-text-secondary mb-2">
                Required Modules
                {setupError && <span className="text-status-error ml-2">{setupError}</span>}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODULES.filter((m) => SELECTABLE_MODULES.includes(m.id)).map((m) => {
                  const on = needs.requiredModules.includes(m.id);
                  return (
                    <label key={m.id} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-[4px] border cursor-pointer transition-all",
                      on ? "border-action-primary bg-surface-selected" : "border-border-default hover:border-border-strong")}>
                      <input type="checkbox" checked={on} onChange={() => toggleModule(m.id)} className="h-3.5 w-3.5 rounded border-border-default text-action-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-text-heading">{m.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 256 256" className="flex-shrink-0"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm63.34,91.83-50.4,16.38,31.15,42.87a8,8,0,1,1-12.94,9.4L128,141.61,96.85,184.48a8,8,0,0,1-12.94-9.4l31.15-42.87-50.4-16.38a8,8,0,0,1,4.94-15.22L120,117V64a8,8,0,0,1,16,0v53l50.4-16.38a8,8,0,0,1,4.94,15.22Z"/></svg>
                Tally &amp; Zoho integration included by default with all plans.
              </p>
            </div>

            {/* Start date */}
            <div className="w-40">
              <label className="block text-xs text-text-secondary mb-2">Start Date</label>
              <input type="date" value={needs.startDate} onChange={(e) => setNeed("startDate", e.target.value)}
                className="w-full h-8 px-2.5 rounded-[4px] border border-border-default text-xs outline-none bg-white text-text-body tabular-nums focus:border-action-primary" />
            </div>
          </section>

          <hr className="border-border-divider" />

          {/* Notes */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Internal Notes</p>
            <Textarea value={form.notes} onChange={(v) => setField("notes", v)} rows={3} placeholder="Anything the team should know…" />
          </section>
        </div>

        {/* ── Right column — Plan & Activation ── */}
        <div>
          <div className="sticky top-6 rounded-[6px] border border-border-default bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border-divider">
              <p className="text-xs font-semibold text-text-heading">Plan &amp; Activation</p>
              <p className="text-xs text-text-secondary mt-0.5">Growth team picks the plan</p>
            </div>

            <div className="p-5 space-y-5">
              {/* Plan selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-text-secondary">Plan</p>
                  <button type="button" onClick={() => setShowPlanDrawer(true)}
                    className="flex items-center gap-1 text-xs text-action-primary hover:underline">
                    <Plus className="w-3 h-3" /> New plan
                  </button>
                </div>
                {availablePlans.length === 0 ? (
                  <p className="text-xs text-text-secondary py-2">
                    No plans yet.{" "}
                    <button type="button" onClick={() => setShowPlanDrawer(true)} className="text-action-primary hover:underline">Create one</button>
                  </p>
                ) : (
                  <Select value={selectedPackageId} onChange={setSelectedPackageId}
                    options={availablePlans.map((p) => ({
                      value: p.id,
                      label: `${p.name} — ₹${p.amount.toLocaleString("en-IN")} / ${p.billingFrequency}`,
                    }))} />
                )}
              </div>

              {/* Selected plan card */}
              {selectedPackage && (
                <div className="rounded-[4px] border border-border-default overflow-hidden">
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between bg-surface-bg">
                    <p className="text-sm font-semibold text-text-heading truncate">{selectedPackage.name}</p>
                    <div className="text-right shrink-0 pl-4">
                      <p className="text-xl font-bold text-text-heading tabular-nums">
                        ₹{selectedPackage.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-text-secondary capitalize mt-0.5">
                        / {selectedPackage.billingFrequency.replace(/ly$/, "")}
                      </p>
                    </div>
                  </div>
                  {selectedPackage.modulesUnlocked.length > 0 && (
                    <div className="px-4 py-3 border-t border-border-divider grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {selectedPackage.modulesUnlocked.map((mid) => (
                        <div key={mid} className="flex items-center gap-1.5 text-xs text-text-body min-w-0">
                          <CheckCircle2 className="w-3 h-3 text-status-success shrink-0" />
                          <span className="truncate">{MODULES.find((m) => m.id === mid)?.name ?? mid}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <PlanFormDrawer
                open={showPlanDrawer}
                onClose={() => setShowPlanDrawer(false)}
                onSaved={(mapping) => {
                  refreshPlanMappings();
                  setSelectedPackageId(mapping.id);
                  setShowPlanDrawer(false);
                }}
              />

              {/* Activation */}
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">Activation</p>
                <div className="grid grid-cols-2 gap-2">
                  <ActivationCard title="Payment link" subtitle="Sends checkout URL" active={activationMode === "payment"} onClick={() => setActivationMode("payment")} />
                  <ActivationCard title="14-day trial" subtitle="Instant access" active={activationMode === "trial"} onClick={() => setActivationMode("trial")} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-divider bg-surface-bg">
              <Button variant="secondary" size="sm" onClick={onBack}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={handleCreate}>
                {activationMode === "trial" ? "Create Trial" : "Create & Send Link"}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

interface ActivationCardProps { title: string; subtitle: string; active: boolean; onClick: () => void; }
function ActivationCard({ title, subtitle, active, onClick }: ActivationCardProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("flex flex-col items-start text-left rounded-[3px] border px-3 py-2.5 transition-colors",
        active ? "border-text-heading bg-surface-selected" : "border-border-default bg-white hover:border-border-strong")}>
      <span className="text-sm font-semibold text-text-heading leading-tight">{title}</span>
      <span className="text-[11px] text-text-secondary mt-1 leading-tight">{subtitle}</span>
    </button>
  );
}
