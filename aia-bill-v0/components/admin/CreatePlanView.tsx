"use client";

import * as React from "react";
import { FormField } from "@/components/mds/FormField";
import { Input } from "@/components/mds/Input";
import { Select } from "@/components/mds/Select";
import { Button } from "@/components/mds/Button";
import { DEFAULT_MODULES, savePlanPreset } from "@/lib/billing";
import { useToast } from "@/components/ui/Toast";
import type { BillingFrequency, PlanPreset } from "@/lib/billing";

interface CreatePlanViewProps {
  plan?: PlanPreset;
  readOnly?: boolean;
  onCancel: () => void;
  onCreated: (plan: PlanPreset) => void;
}

export function CreatePlanView({ plan, readOnly, onCancel, onCreated }: CreatePlanViewProps) {
  const isEdit = !!plan;
  const [name, setName] = React.useState(plan?.name ?? "");
  const [description, setDescription] = React.useState(plan?.description ?? "");
  const [price, setPrice] = React.useState(plan ? String(plan.price) : "");
  const [frequency, setFrequency] = React.useState<BillingFrequency>(plan?.billingFrequency ?? "monthly");
  const [modules, setModules] = React.useState<string[]>(plan?.modules ?? [...DEFAULT_MODULES]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const { addToast } = useToast();

  const toggleModule = (m: string) => {
    if (readOnly) return;
    setModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Required";
    const p = Number(price);
    if (!price || isNaN(p) || p <= 0) e.price = "Enter a valid price";
    if (modules.length === 0) e.modules = "Select at least one module";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (readOnly) return;
    if (!validate()) return;
    setSaving(true);
    let dodoProductId: string | undefined = plan?.dodoProductId;

    if (!isEdit) {
      try {
        const res = await fetch("/api/dodo/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            price: Number(price),
            billingFrequency: frequency,
            description: description.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          addToast(data.error ?? "Failed to create Dodo product", "error");
        } else {
          dodoProductId = data.dodoProductId;
          addToast("Dodo product created", "success");
        }
      } catch {
        addToast("Dodo product creation failed — plan saved locally", "info");
      }
    } else if (plan?.dodoProductId) {
      try {
        const res = await fetch(`/api/dodo/products/${plan.dodoProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            price: Number(price),
            billingFrequency: frequency,
            description: description.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          addToast(data.error ?? "Failed to update Dodo product", "error");
        } else {
          addToast("Dodo product updated", "success");
        }
      } catch {
        addToast("Dodo product update failed — plan saved locally", "info");
      }
    }

    const savedPlan: PlanPreset = {
      id: plan?.id ?? `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      price: Number(price),
      billingFrequency: frequency,
      description: description.trim() || undefined,
      modules: [...modules],
      dodoProductId,
      createdAt: plan?.createdAt ?? new Date().toISOString(),
    };
    savePlanPreset(savedPlan);
    setSaving(false);
    onCreated(savedPlan);
  };

  return (
    <div className="space-y-6">
      {/* Plan Info */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
          Plan Info
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Plan Name" required error={errors.name}>
            <Input
              value={name}
              onChange={readOnly ? () => {} : setName}
              placeholder="e.g. Growth, Enterprise"
              readOnly={readOnly}
            />
          </FormField>
          <FormField label="Price (₹)" required error={errors.price}>
            <Input
              type="number"
              value={price}
              onChange={readOnly ? () => {} : setPrice}
              placeholder="3999"
              readOnly={readOnly}
            />
          </FormField>
          <FormField label="Billing Frequency">
            <Select
              value={frequency}
              onChange={readOnly ? () => {} : (v) => setFrequency(v as BillingFrequency)}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "annual", label: "Annual" },
              ]}
            />
          </FormField>
          <FormField label="Description">
            <Input
              value={description}
              onChange={readOnly ? () => {} : setDescription}
              placeholder="Optional short description"
              readOnly={readOnly}
            />
          </FormField>
        </div>
      </section>

      <hr className="border-border-divider" />

      {/* Modules */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
          Modules
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {DEFAULT_MODULES.map((m) => (
            <label
              key={m}
              className="flex items-center gap-2 text-[12.5px] text-text-body cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={modules.includes(m)}
                onChange={() => toggleModule(m)}
                className="h-3.5 w-3.5 rounded border-border-default accent-action-primary"
              />
              {m}
            </label>
          ))}
        </div>
        {errors.modules && (
          <p className="text-[11px] text-status-error mt-1.5">{errors.modules}</p>
        )}
      </section>

      <div className="flex items-center justify-end gap-2 pt-2 pb-4">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button size="sm" onClick={handleSave} loading={saving}>
            {isEdit ? "Save Changes" : "Create Plan"}
          </Button>
        )}
      </div>
    </div>
  );
}
