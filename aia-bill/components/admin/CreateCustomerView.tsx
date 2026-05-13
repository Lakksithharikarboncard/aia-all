"use client";

import * as React from "react";
import { ArrowLeft, Calculator, CheckCircle2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/mds/Container";
import { Header } from "@/components/mds/Header";
import { FormField } from "@/components/mds/FormField";
import { Input } from "@/components/mds/Input";
import { Select } from "@/components/mds/Select";
import { Textarea } from "@/components/mds/Textarea";
import { Button } from "@/components/mds/Button";
import { FieldInput } from "./components/FieldInput";
import { SectionHeader } from "./components/SectionHeader";
import { PlanFormDrawer } from "./components/PlanFormDrawer";
import {
  saveCustomer, generateSignupInviteLink,
  addAuditEntry, suggestPlan, MODULES, loadPlanMappings,
} from "@/lib/billing";
import type { CustomerAccount, PlanMapping, ModuleId, CalculatorInput } from "@/lib/billing";

interface CreateCustomerViewProps {
  planMappings: PlanMapping[];
  onBack: () => void;
  onCreated: (id: string) => void;
}

function normalizePackageModules(modules: ModuleId[]): ModuleId[] {
  const normalized = new Set<ModuleId>(modules);
  normalized.add("dashboard");
  normalized.add("tally_zoho");
  return MODULES.filter((m) => normalized.has(m.id)).map((m) => m.id);
}

/**
 * Pick the best plan for this customer from the catalogue:
 *   1. Active plans only.
 *   2. Match the chosen billing frequency.
 *   3. Of those, prefer the cheapest plan that covers all required modules.
 *   4. Fall back to the cheapest plan matching the frequency.
 *   5. Fall back to the cheapest active plan.
 */
function chooseRecommendedPlan(
  plans: PlanMapping[],
  required: ModuleId[],
  frequency: CalculatorInput["billingFrequency"]
): PlanMapping | null {
  const active = plans.filter((p) => p.active);
  if (active.length === 0) return null;
  const byFreq = active.filter((p) => p.billingFrequency === frequency);
  const pool = byFreq.length > 0 ? byFreq : active;
  const requiredSet = new Set(required);
  const covering = pool
    .filter((p) => [...requiredSet].every((m) => p.modulesUnlocked.includes(m)))
    .sort((a, b) => a.amount - b.amount);
  if (covering.length > 0) return covering[0];
  return [...pool].sort((a, b) => a.amount - b.amount)[0] ?? null;
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

  // Customer needs
  const [needs, setNeeds] = React.useState({
    billsPerMonth: 0,
    invoicesPerMonth: 0,
    statementsPerMonth: 0,
    accountingSoftware: "tally" as CalculatorInput["accountingSoftware"],
    requiredModules: [] as ModuleId[],
    billingFrequency: "monthly" as CalculatorInput["billingFrequency"],
    startDate: "",
    pricingNotes: "",
  });

  // Package selection
  const [activationMode, setActivationMode] = React.useState<"payment" | "trial">("payment");
  const [selectedPackageId, setSelectedPackageId] = React.useState("");
  const [useCustomPackage, setUseCustomPackage] = React.useState(false);
  const [customPackage, setCustomPackage] = React.useState({ name: "", amount: "", reason: "" });
  const [showPlanDrawer, setShowPlanDrawer] = React.useState(false);
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const setField = <K extends keyof typeof form>(k: K, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setNeed = <K extends keyof typeof needs>(k: K, v: typeof needs[K]) => setNeeds((p) => ({ ...p, [k]: v }));

  const toggleModule = (id: ModuleId) => {
    setNeed("requiredModules", needs.requiredModules.includes(id) ? needs.requiredModules.filter((m) => m !== id) : [...needs.requiredModules, id]);
  };

  // Calculator
  const calculatorInput = React.useMemo<CalculatorInput>(() => ({
    customerName: form.primaryName,
    companyName: form.companyName,
    billsPerMonth: needs.billsPerMonth,
    invoicesPerMonth: needs.invoicesPerMonth,
    statementsPerMonth: needs.statementsPerMonth,
    accountingSoftware: needs.accountingSoftware,
    gstNeeded: needs.requiredModules.includes("gst_reconciliation"),
    requiredModules: needs.requiredModules,
    billingFrequency: needs.billingFrequency,
    notes: needs.pricingNotes,
  }), [form.primaryName, form.companyName, needs]);

  // Active plans from the catalogue, prioritised by matching billing frequency.
  const availablePlans = React.useMemo(() => {
    const active = planMappings.filter((p) => p.active);
    return [...active].sort((a, b) => {
      const aMatch = a.billingFrequency === needs.billingFrequency ? 0 : 1;
      const bMatch = b.billingFrequency === needs.billingFrequency ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.amount - b.amount;
    });
  }, [planMappings, needs.billingFrequency]);

  // Recommendation engine + the human-readable suggestion reasons.
  const suggestion = React.useMemo(
    () => (needs.requiredModules.length > 0 ? suggestPlan(calculatorInput) : null),
    [calculatorInput, needs.requiredModules.length]
  );

  const recommendedPlan = React.useMemo(
    () =>
      needs.requiredModules.length > 0
        ? chooseRecommendedPlan(planMappings, needs.requiredModules, needs.billingFrequency)
        : null,
    [planMappings, needs.requiredModules, needs.billingFrequency]
  );

  // Default the dropdown to the recommended plan; reset when it no longer exists.
  React.useEffect(() => {
    if (useCustomPackage) return;
    const exists = availablePlans.some((p) => p.id === selectedPackageId);
    if (!exists) {
      setSelectedPackageId(recommendedPlan?.id ?? availablePlans[0]?.id ?? "");
    }
  }, [availablePlans, recommendedPlan, selectedPackageId, useCustomPackage]);

  const selectedPackage = React.useMemo(
    () => availablePlans.find((p) => p.id === selectedPackageId) ?? null,
    [availablePlans, selectedPackageId]
  );

  // Pricing-preview view model — drives the card so it updates the instant
  // modules toggle, frequency changes, or the dropdown switches.
  const activeView = React.useMemo(() => {
    if (useCustomPackage) {
      const amount = Number(customPackage.amount) || 0;
      return {
        kind: "custom" as const,
        name: customPackage.name || "Custom plan",
        amount,
        billingFrequency: needs.billingFrequency,
        modulesUnlocked: normalizePackageModules(needs.requiredModules),
        source: "custom" as const,
      };
    }
    if (selectedPackage) {
      const isRecommended = recommendedPlan?.id === selectedPackage.id;
      const isCheaper = recommendedPlan
        ? selectedPackage.amount < recommendedPlan.amount
        : false;
      return {
        kind: "mapped" as const,
        name: selectedPackage.name,
        amount: selectedPackage.amount,
        billingFrequency: selectedPackage.billingFrequency,
        modulesUnlocked: selectedPackage.modulesUnlocked,
        source: isRecommended
          ? ("recommended" as const)
          : isCheaper
          ? ("lean" as const)
          : ("expanded" as const),
      };
    }
    return null;
  }, [
    useCustomPackage,
    customPackage,
    selectedPackage,
    recommendedPlan,
    needs.billingFrequency,
    needs.requiredModules,
  ]);

  const handleCreate = async () => {
    if (needs.requiredModules.length === 0) { setSetupError("Select at least one module."); return; }
    if (useCustomPackage && (!customPackage.name.trim() || !customPackage.amount.trim() || !customPackage.reason.trim())) {
      setSetupError("Custom package needs name, price, and reason."); return;
    }
    if (!useCustomPackage && !selectedPackageId) { setSetupError("Choose a package."); return; }

    setSaving(true);
    const id = `cust_${Date.now()}`;
    const chosenPackage = availablePlans.find((p) => p.id === selectedPackageId);
    const packageModules = useCustomPackage
      ? normalizePackageModules(needs.requiredModules)
      : chosenPackage?.modulesUnlocked ?? normalizePackageModules(needs.requiredModules);
    const createdAt = new Date().toISOString();

    // Create Polar customer first
    let polarCustomerId = "";
    try {
      const polarRes = await fetch("/api/polar/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccountId: id, name: form.primaryName.trim(), email: form.primaryEmail.trim() }),
      });
      if (polarRes.ok) {
        const polarData = await polarRes.json();
        polarCustomerId = polarData.polarCustomerId;
      }
    } catch {
      // Fallback: continue without Polar customer
    }

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
      selectedPlanMappingId: useCustomPackage ? undefined : chosenPackage?.id,
      purchasedModules: packageModules,
      packageType: useCustomPackage ? "custom" : "mapped",
      packageName: useCustomPackage ? customPackage.name.trim() : chosenPackage?.name,
      packageAmount: useCustomPackage ? Number(customPackage.amount) : chosenPackage?.amount,
      packageBillingFrequency: needs.billingFrequency,
      packageModules,
      customPackageReason: useCustomPackage ? customPackage.reason.trim() : undefined,
      polarCustomerId: polarCustomerId || undefined,
      trialStartsAt: activationMode === "trial" ? createdAt : undefined,
      trialEndsAt: activationMode === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      expectedBills: needs.billsPerMonth,
      expectedInvoices: needs.invoicesPerMonth,
      expectedStatements: needs.statementsPerMonth,
      notes: form.notes.trim(),
      createdAt,
    };

    saveCustomer(customer);

    if (activationMode === "trial") {
      generateSignupInviteLink(id, "CS User");
      addAuditEntry({ actor: "CS User", action: "customer_created", entityType: "customer", entityId: id, newValue: form.companyName, reason: "Customer created with 14-day trial" });
      addAuditEntry({ actor: "CS User", action: "signup_invite_generated", entityType: "customer", entityId: id, newValue: "Signup link sent", reason: "Signup invite emailed to customer" });
    } else {
      try {
        await fetch("/api/polar/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerAccountId: id, planMappingId: selectedPackageId }),
        });
      } catch {
        // Fallback
      }
      addAuditEntry({ actor: "CS User", action: "customer_created", entityType: "customer", entityId: id, newValue: form.companyName, reason: "Customer created — payment pending" });
      addAuditEntry({ actor: "CS User", action: "checkout_link_generated", entityType: "customer", entityId: id, newValue: "Checkout link sent", reason: "Payment link emailed to customer" });
    }

    setSaving(false);
    onCreated(id);
  };

  return (
    <div className="max-w-6xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-heading mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <Header title="Create Customer" description="Fill in customer details and configure their plan" />

      <div className="grid gap-5 xl:grid-cols-[1fr_480px]">
        {/* Left: Customer Details */}
        <div className="space-y-5">
          <Container header={<Header variant="container" title="Company" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Company Name" required>
                <Input value={form.companyName} onChange={(v) => setField("companyName", v)} placeholder="Acme Industries" />
              </FormField>
              <FormField label="GSTIN" constraint="Must be a valid GSTIN">
                <Input value={form.gstin} onChange={(v) => setField("gstin", v)} placeholder="27AABCU9603R1ZM" />
              </FormField>
            </div>
          </Container>

          <Container header={<Header variant="container" title="Primary User" />}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Name" required>
                <Input value={form.primaryName} onChange={(v) => setField("primaryName", v)} />
              </FormField>
              <FormField label="Email" required>
                <Input type="email" value={form.primaryEmail} onChange={(v) => setField("primaryEmail", v)} />
              </FormField>
              <FormField label="Phone" required>
                <Input value={form.primaryPhone} onChange={(v) => setField("primaryPhone", v)} />
              </FormField>
            </div>
          </Container>

          <Container header={<Header variant="container" title="Billing Contact" />}>
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
          </Container>

          <Container header={<Header variant="container" title="Ownership" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="CS Owner">
                <Select
                  value={form.csOwner}
                  onChange={(v) => setField("csOwner", v)}
                  placeholder="Unassigned"
                  options={[
                    { value: "Priya Nair", label: "Priya Nair" },
                    { value: "Rahul Sharma", label: "Rahul Sharma" },
                    { value: "Ananya Gupta", label: "Ananya Gupta" },
                    { value: "Vikram Patel", label: "Vikram Patel" },
                    { value: "Sneha Reddy", label: "Sneha Reddy" },
                  ]}
                />
              </FormField>
              <FormField label="BD Owner">
                <Select
                  value={form.bdOwner}
                  onChange={(v) => setField("bdOwner", v)}
                  placeholder="Unassigned"
                  options={[
                    { value: "Arjun Mehta", label: "Arjun Mehta" },
                    { value: "Kavita Singh", label: "Kavita Singh" },
                    { value: "Rohit Verma", label: "Rohit Verma" },
                    { value: "Deepa Iyer", label: "Deepa Iyer" },
                    { value: "Amit Joshi", label: "Amit Joshi" },
                  ]}
                />
              </FormField>
            </div>
          </Container>

          <Container header={<Header variant="container" title="Customer Needs" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Bills / month">
                  <Input type="number" value={String(needs.billsPerMonth || "")} onChange={(v) => setNeed("billsPerMonth", Number(v) || 0)} />
                </FormField>
                <FormField label="Invoices / month">
                  <Input type="number" value={String(needs.invoicesPerMonth || "")} onChange={(v) => setNeed("invoicesPerMonth", Number(v) || 0)} />
                </FormField>
                <FormField label="Statements / month">
                  <Input type="number" value={String(needs.statementsPerMonth || "")} onChange={(v) => setNeed("statementsPerMonth", Number(v) || 0)} />
                </FormField>
              </div>

              <FormField label="Accounting Software">
                <div className="grid grid-cols-4 gap-2">
                  {(["tally", "zoho", "excel", "other"] as const).map((sw) => (
                    <button key={sw} type="button" onClick={() => setNeed("accountingSoftware", sw)} className={cn("rounded-[4px] border px-3 py-2 text-sm font-medium capitalize transition-all", needs.accountingSoftware === sw ? "border-action-primary bg-surface-selected text-action-primary" : "border-border-default text-text-secondary hover:border-border-strong")}>{sw}</button>
                  ))}
                </div>
              </FormField>

              <FormField label="Required Modules" error={setupError ?? undefined}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MODULES.map((m) => (
                    <label key={m.id} className={cn("flex items-start gap-3 p-3 rounded-[4px] border cursor-pointer transition-all", needs.requiredModules.includes(m.id) ? "border-action-primary bg-surface-selected" : "border-border-default hover:border-border-strong")}>
                      <input type="checkbox" checked={needs.requiredModules.includes(m.id)} onChange={() => toggleModule(m.id)} className="mt-0.5 h-4 w-4 text-action-primary border-border-default rounded" />
                      <div><p className="text-sm font-medium text-text-heading">{m.name}</p><p className="text-xs text-text-secondary">{m.description}</p></div>
                    </label>
                  ))}
                </div>
              </FormField>

              <div className="grid grid-cols-[1fr_180px] gap-3">
                <FormField label="Billing Frequency">
                  <div className="flex h-8 rounded-[3px] border border-border-default overflow-hidden bg-white">
                    {(["monthly", "quarterly", "annual"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setNeed("billingFrequency", f)}
                        className={cn(
                          "flex-1 text-xs font-medium transition-colors capitalize border-r border-border-divider last:border-r-0",
                          needs.billingFrequency === f
                            ? "bg-action-primary text-text-inverted border-action-primary"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-heading"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField label="Start Date">
                  <input
                    type="date"
                    value={needs.startDate}
                    onChange={(e) => setNeed("startDate", e.target.value)}
                    className="w-full h-8 px-2.5 rounded-[3px] border border-border-default text-xs outline-none bg-white text-text-body tabular-nums focus:border-border-focus focus:ring-2 focus:ring-border-focus/30"
                  />
                </FormField>
              </div>
            </div>
          </Container>

          <Container header={<Header variant="container" title="Internal Notes" />}>
            <Textarea value={form.notes} onChange={(v) => setField("notes", v)} rows={3} placeholder="Internal notes..." />
          </Container>
        </div>

        {/* Right: Pricing (Sticky) */}
        <div>
          <div className="sticky top-6 bg-white rounded-[3px] border border-border-default overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-border-divider">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Pricing Preview
              </p>
              <p className="text-sm font-semibold text-text-heading mt-1">
                Recommended based on customer needs
              </p>
            </div>

            <div className="p-5 space-y-5">
              {!suggestion ? (
                <div className="rounded-[3px] border border-dashed border-border-default bg-surface-bg px-6 py-10 text-center text-sm text-text-secondary">
                  Select at least one module to see a recommendation
                </div>
              ) : !activeView ? (
                <div className="rounded-[3px] border border-dashed border-border-default bg-surface-bg px-6 py-8 text-center text-sm text-text-secondary space-y-3">
                  <p>No active plans match these requirements yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowPlanDrawer(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-text-link hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Create a plan
                  </button>
                </div>
              ) : (
                <>
                  {/* Plan summary — emphasised */}
                  <div
                    className={cn(
                      "rounded-[3px] border overflow-hidden",
                      activeView.source === "recommended"
                        ? "border-text-heading"
                        : "border-border-default"
                    )}
                  >
                    {/* Top row: badge + price */}
                    <div
                      className={cn(
                        "flex items-start justify-between px-4 pt-4 pb-3",
                        activeView.source === "recommended"
                          ? "bg-surface-selected"
                          : "bg-white"
                      )}
                    >
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 h-5 rounded-[2px] text-[10px] font-semibold uppercase tracking-wider",
                            activeView.source === "recommended"
                              ? "bg-text-heading text-text-inverted"
                              : "bg-surface-hover text-text-secondary border border-border-default"
                          )}
                        >
                          {activeView.source === "recommended"
                            ? "Recommended"
                            : activeView.source === "custom"
                            ? "Custom"
                            : activeView.source === "lean"
                            ? "Lean option"
                            : "Expanded option"}
                        </span>
                        <p className="text-base font-semibold text-text-heading mt-2 truncate">
                          {activeView.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <div className="text-2xl font-semibold text-text-heading tabular-nums leading-none">
                          ₹{activeView.amount.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-text-secondary mt-1.5 capitalize tabular-nums">
                          per {activeView.billingFrequency.replace(/ly$/, "")}
                        </div>
                      </div>
                    </div>

                    {/* Stat strip */}
                    <div className="grid grid-cols-2 divide-x divide-border-divider border-t border-border-divider bg-white">
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                          Modules
                        </p>
                        <p className="text-sm font-semibold text-text-heading tabular-nums mt-1">
                          {activeView.modulesUnlocked.length}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                          Billing Cycle
                        </p>
                        <p className="text-sm font-semibold text-text-heading capitalize mt-1">
                          {activeView.billingFrequency}
                        </p>
                      </div>
                    </div>

                    {/* Module list */}
                    {activeView.modulesUnlocked.length > 0 && (
                      <div className="px-4 py-3 border-t border-border-divider">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                          Modules included
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {activeView.modulesUnlocked.map((mid) => (
                            <div
                              key={mid}
                              className="flex items-center gap-1.5 text-xs text-text-body min-w-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0" />
                              <span className="truncate">
                                {MODULES.find((m) => m.id === mid)?.name ?? mid}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Package picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                        Package
                      </label>
                      {!useCustomPackage && (
                        <button
                          type="button"
                          onClick={() => setShowPlanDrawer(true)}
                          className="flex items-center gap-1 text-xs text-text-link hover:underline font-medium"
                        >
                          <Plus className="w-3 h-3" /> Create plan
                        </button>
                      )}
                    </div>

                    {!useCustomPackage ? (
                      availablePlans.length === 0 ? (
                        <div className="rounded-[3px] border border-dashed border-border-default bg-surface-bg px-3 py-3 text-xs text-text-secondary">
                          No active plans yet.{" "}
                          <button
                            type="button"
                            onClick={() => setShowPlanDrawer(true)}
                            className="text-text-link hover:underline font-medium"
                          >
                            Create one
                          </button>
                          .
                        </div>
                      ) : (
                        <Select
                          value={selectedPackageId}
                          onChange={setSelectedPackageId}
                          options={availablePlans.map((p) => {
                            const isRec = recommendedPlan?.id === p.id;
                            return {
                              value: p.id,
                              label: `${isRec ? "★ " : ""}${p.name} — ₹${p.amount.toLocaleString(
                                "en-IN"
                              )} / ${p.billingFrequency}`,
                            };
                          })}
                        />
                      )
                    ) : (
                      <div className="rounded-[3px] border border-border-default bg-surface-bg px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-text-heading truncate">
                            {customPackage.name}
                          </p>
                          <span className="text-sm font-semibold text-text-heading tabular-nums shrink-0">
                            ₹{Number(customPackage.amount).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {customPackage.reason && (
                          <p className="text-xs text-text-secondary mt-1">
                            {customPackage.reason}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomPackage(false);
                            setCustomPackage({ name: "", amount: "", reason: "" });
                          }}
                          className="text-xs text-text-link hover:underline mt-2"
                        >
                          Clear custom plan
                        </button>
                      </div>
                    )}
                  </div>

                  <PlanFormDrawer
                    open={showPlanDrawer}
                    onClose={() => setShowPlanDrawer(false)}
                    onSaved={(mapping) => {
                      // Pull the fresh catalogue from the store and pre-select
                      // the plan we just created. This means the plan is also
                      // visible in the Packages tab without extra work.
                      refreshPlanMappings();
                      setUseCustomPackage(false);
                      setSelectedPackageId(mapping.id);
                      setShowPlanDrawer(false);
                    }}
                  />

                  {/* Activation */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                      Activation
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <ActivationCard
                        title="Send payment link"
                        subtitle="Draft → Payment Pending"
                        active={activationMode === "payment"}
                        onClick={() => setActivationMode("payment")}
                      />
                      <ActivationCard
                        title="14-day trial"
                        subtitle="Modules enabled for 14 days"
                        active={activationMode === "trial"}
                        onClick={() => setActivationMode("trial")}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-divider bg-surface-bg">
              <Button variant="secondary" size="sm" onClick={onBack}>
                Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={handleCreate}>
                {activationMode === "trial" ? "Create Trial" : "Create & Generate Link"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ActivationCard ────────────────────────────────────────────────────
// Compact selectable card used in the Activation segment.

interface ActivationCardProps {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}

function ActivationCard({ title, subtitle, active, onClick }: ActivationCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start text-left rounded-[3px] border px-3 py-2.5 transition-colors",
        active
          ? "border-text-heading bg-surface-selected"
          : "border-border-default bg-white hover:border-border-strong"
      )}
    >
      <span className="text-sm font-semibold text-text-heading leading-tight">
        {title}
      </span>
      <span className="text-[11px] text-text-secondary mt-1 leading-tight">
        {subtitle}
      </span>
    </button>
  );
}
