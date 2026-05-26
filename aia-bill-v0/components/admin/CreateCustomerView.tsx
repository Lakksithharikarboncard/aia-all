"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { FormField } from "@/components/mds/FormField";
import { Input } from "@/components/mds/Input";
import { DatePicker } from "@/components/mds/DatePicker";
import { Select } from "@/components/mds/Select";
import { Textarea } from "@/components/mds/Textarea";
import { Button } from "@/components/mds/Button";
import { saveCustomer, addAuditEntry, loadPlanPresets } from "@/lib/billing";
import { useToast } from "@/components/ui/Toast";
import type { CustomerAccount, BillingFrequency, PlanPreset } from "@/lib/billing";

interface CreateCustomerViewProps {
  onCancel: () => void;
  onCreated: (id: string) => void;
  onCreatePlan?: () => void;
}

export function CreateCustomerView({ onCancel, onCreated, onCreatePlan }: CreateCustomerViewProps) {
  const plans = loadPlanPresets();
  const [selectedPlanId, setSelectedPlanId] = React.useState("");
  const [selectedModules, setSelectedModules] = React.useState<string[]>([]);

  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm] = React.useState({
    companyName: "",
    gstin: "",
    primaryName: "",
    primaryEmail: "",
    primaryPhone: "",
    billingName: "",
    billingEmail: "",
    billingPhone: "",
    billingAddressLine: "",
    billingCity: "",
    billingState: "",
    billingPincode: "",
    subscriptionStartDate: todayStr,
    notes: "",
  });
  const [billingSameAsPrimary, setBillingSameAsPrimary] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const { addToast } = useToast();

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedModules(plan.modules ?? []);
    } else {
      setSelectedModules([]);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!form.primaryName.trim()) e.primaryName = "Required";
    if (!form.primaryEmail.trim()) e.primaryEmail = "Required";
    if (!form.primaryPhone.trim()) e.primaryPhone = "Required";
    if (!billingSameAsPrimary) {
      if (!form.billingName.trim()) e.billingName = "Required";
      if (!form.billingEmail.trim()) e.billingEmail = "Required";
      if (!form.billingPhone.trim()) e.billingPhone = "Required";
    }
    // Address always required — billing-specific regardless of contact toggle
    if (!form.billingAddressLine.trim()) e.billingAddressLine = "Required";
    if (!form.billingCity.trim()) e.billingCity = "Required";
    if (!form.billingState.trim()) e.billingState = "Required";
    if (!form.billingPincode.trim()) e.billingPincode = "Required";
    if (!selectedPlanId) e.plan = "Select a plan";
    if (!form.subscriptionStartDate) e.subscriptionStartDate = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    const id = `cust_${Date.now()}`;
    let dodoCustomerId: string | undefined;

    try {
      const res = await fetch("/api/dodo/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryName: form.primaryName.trim(),
          primaryEmail: form.primaryEmail.trim(),
          primaryPhone: form.primaryPhone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Failed to create Dodo customer", "error");
      } else {
        dodoCustomerId = data.dodoCustomerId;
        addToast("Dodo customer created", "success");
      }
    } catch {
      addToast("Dodo customer creation failed — customer saved locally", "info");
    }

    const customer: CustomerAccount = {
      id,
      companyName: form.companyName.trim(),
      gstin: form.gstin.trim() || undefined,
      primaryName: form.primaryName.trim(),
      primaryEmail: form.primaryEmail.trim(),
      primaryPhone: form.primaryPhone.trim() || undefined,
      billingName: billingSameAsPrimary ? undefined : form.billingName.trim() || undefined,
      billingEmail: billingSameAsPrimary ? undefined : form.billingEmail.trim() || undefined,
      billingPhone: billingSameAsPrimary ? undefined : form.billingPhone.trim() || undefined,
      billingAddressLine: billingSameAsPrimary ? undefined : form.billingAddressLine.trim() || undefined,
      billingCity: billingSameAsPrimary ? undefined : form.billingCity.trim() || undefined,
      billingState: billingSameAsPrimary ? undefined : form.billingState.trim() || undefined,
      billingPincode: billingSameAsPrimary ? undefined : form.billingPincode.trim() || undefined,
      status: "draft",
      price: selectedPlan?.price ?? 0,
      billingFrequency: selectedPlan?.billingFrequency ?? "monthly",
      planId: selectedPlanId || undefined,
      modules: selectedModules.length > 0 ? [...selectedModules] : undefined,
      dodoProductId: selectedPlan?.dodoProductId,
      dodoCustomerId,
      subscriptionStartDate: form.subscriptionStartDate || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    saveCustomer(customer);
    addAuditEntry({
      actor: "CS User",
      action: "customer_created",
      entityType: "customer",
      entityId: id,
      newValue: customer.companyName,
      reason: "Customer created",
    });
    setSaving(false);
    onCreated(id);
  };

  return (
    <div className="space-y-6">

        {/* Company */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Company</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Company Name" required error={errors.companyName}>
              <Input value={form.companyName} onChange={(v) => set("companyName", v)} placeholder="Acme Industries Pvt Ltd" />
            </FormField>
            <FormField label="GSTIN">
              <Input value={form.gstin} onChange={(v) => set("gstin", v)} placeholder="27AABCU9603R1ZM" />
            </FormField>
          </div>
        </section>

        <hr className="border-border-divider" />

        {/* Primary contact */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Primary Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Name" required error={errors.primaryName}>
              <Input value={form.primaryName} onChange={(v) => set("primaryName", v)} placeholder="Rajesh Sharma" />
            </FormField>
            <FormField label="Email" required error={errors.primaryEmail}>
              <Input type="email" value={form.primaryEmail} onChange={(v) => set("primaryEmail", v)} placeholder="rajesh@acme.in" />
            </FormField>
            <FormField label="Phone" required error={errors.primaryPhone}>
              <Input value={form.primaryPhone} onChange={(v) => set("primaryPhone", v)} placeholder="+91 98765 43210" />
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
                onChange={(e) => setBillingSameAsPrimary(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-default"
              />
              Same as primary
            </label>
          </div>
          <div className="space-y-4">
            {/* Contact row — hidden when same as primary */}
            {billingSameAsPrimary ? (
              <p className="text-sm text-text-secondary">
                Invoices sent to <span className="font-medium text-text-body">{form.primaryName || "primary contact"}</span>
                {form.primaryEmail && <span className="text-text-disabled"> · {form.primaryEmail}</span>}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Name" required error={errors.billingName}><Input value={form.billingName} onChange={(v) => set("billingName", v)} /></FormField>
                <FormField label="Email" required error={errors.billingEmail}><Input type="email" value={form.billingEmail} onChange={(v) => set("billingEmail", v)} /></FormField>
                <FormField label="Phone" required error={errors.billingPhone}><Input value={form.billingPhone} onChange={(v) => set("billingPhone", v)} /></FormField>
              </div>
            )}
            {/* Address always shown — billing-specific regardless of contact toggle */}
            <FormField label="Address Line" required error={errors.billingAddressLine}>
              <Textarea value={form.billingAddressLine} onChange={(v) => set("billingAddressLine", v)} rows={2} placeholder="Street, Building, Landmark" />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="City" required error={errors.billingCity}><Input value={form.billingCity} onChange={(v) => set("billingCity", v)} placeholder="Bangalore" /></FormField>
              <FormField label="State" required error={errors.billingState}><Input value={form.billingState} onChange={(v) => set("billingState", v)} placeholder="Karnataka" /></FormField>
              <FormField label="PIN Code" required error={errors.billingPincode}><Input value={form.billingPincode} onChange={(v) => set("billingPincode", v)} placeholder="560001" /></FormField>
            </div>
          </div>
        </section>

        <hr className="border-border-divider" />

        {/* Plan */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Plan</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-heading">
                  Select Plan
                  <span className="text-brand-red ml-0.5" aria-hidden="true">&#8226;</span>
                </label>
                <button
                  type="button"
                  onClick={onCreatePlan}
                  className="text-[11px] font-medium text-action-primary hover:underline"
                >
                  Create plan
                </button>
              </div>
              <Select
                value={selectedPlanId}
                onChange={handleSelectPlan}
                placeholder="Choose a plan"
                options={plans.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ₹${p.price.toLocaleString("en-IN")} / ${p.billingFrequency}`,
                }))}
              />
              {errors.plan && <p className="text-xs text-status-error">{errors.plan}</p>}
              {selectedPlan && (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[18px] font-semibold text-text-heading tabular-nums leading-tight">
                    ₹{selectedPlan.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-text-secondary">/ {selectedPlan.billingFrequency}</span>
                </div>
              )}
            </div>

            <FormField
              label={
                <span className="inline-flex items-center gap-1">
                  Start Date
                  <span className="group relative inline-flex">
                    <Info className="w-3.5 h-3.5 text-text-secondary cursor-help" />
                    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-44 px-2 py-1.5 bg-white text-[11px] text-text-body leading-snug border border-[#d0d1d3] rounded-[2.5px] opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      Billing begins on this date. If today, customer is charged immediately.
                    </span>
                  </span>
                </span>
              }
              required
              error={errors.subscriptionStartDate}
            >
              <DatePicker
                value={form.subscriptionStartDate}
                onChange={(v) => set("subscriptionStartDate", v)}
                min={todayStr}
                placeholder="Pick start date"
              />
            </FormField>
          </div>

          {selectedModules.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-text-secondary uppercase tracking-wider font-medium mb-1.5">
                Modules Included
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedModules.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center px-2 py-0.5 rounded-[2.5px] text-[11px] font-medium leading-none bg-[#f2f3f5] text-text-secondary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <hr className="border-border-divider" />

        {/* Notes */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Internal Notes</p>
          <Textarea value={form.notes} onChange={(v) => set("notes", v)} rows={3} placeholder="Anything the team should know…" />
        </section>

        <div className="flex items-center justify-end gap-2 pt-2 pb-4">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} loading={saving}>Create Customer</Button>
        </div>
      </div>
  );
}
