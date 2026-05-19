"use client";

import * as React from "react";
import { Switch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";
import { savePlanMapping, addAuditEntry, MODULES } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FieldInput } from "./FieldInput";
import type { PlanMapping, ModuleId } from "@/lib/billing";

type BillingFrequency = "monthly" | "quarterly" | "annual";

const BLANK_FORM = { name: "", description: "", amount: "", billingFrequency: "monthly" as BillingFrequency, modulesUnlocked: [] as ModuleId[], active: true };

interface PlanFormDrawerProps {
  open: boolean;
  editPlan?: PlanMapping | null;
  onClose: () => void;
  onSaved: (mapping: PlanMapping) => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}

export function PlanFormDrawer({ open, editPlan, onClose, onSaved, onToast }: PlanFormDrawerProps) {
  const [form, setForm] = React.useState(BLANK_FORM);
  const [errors, setErrors] = React.useState<Partial<Record<string, string>>>({});
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editPlan) {
        setForm({ name: editPlan.name, description: editPlan.description ?? "", amount: String(editPlan.amount), billingFrequency: editPlan.billingFrequency, modulesUnlocked: editPlan.modulesUnlocked, active: editPlan.active });
      } else {
        setForm(BLANK_FORM);
      }
      setErrors({});
    }
  }, [open, editPlan]);

  const setF = <K extends keyof typeof BLANK_FORM>(k: K, v: typeof BLANK_FORM[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const toggleModule = (id: ModuleId) =>
    setF("modulesUnlocked", form.modulesUnlocked.includes(id)
      ? form.modulesUnlocked.filter((m) => m !== id)
      : [...form.modulesUnlocked, id]);

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.amount || isNaN(Number(form.amount))) e.amount = "Enter valid amount";
    if (form.modulesUnlocked.length === 0) e.modulesUnlocked = "Select at least one";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSyncing(true);
    const now = Date.now();
    const mapping: PlanMapping = {
      id: editPlan?.id ?? `plan_${now}`,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      dodoProductId: editPlan?.dodoProductId,
      amount: Number(form.amount),
      billingFrequency: form.billingFrequency,
      modulesUnlocked: form.modulesUnlocked,
      active: form.active,
    };
    savePlanMapping(mapping);
    addAuditEntry({ actor: "CS User", action: editPlan ? "plan_mapping_updated" : "plan_mapping_created", entityType: "plan_mapping", entityId: mapping.id, reason: `Plan ${editPlan ? "updated" : "created"}: ${mapping.name}` });

    // Sync to Dodo only when there's no existing product (creates are one-time)
    let finalMapping = mapping;
    if (!mapping.dodoProductId) {
      try {
        const res = await fetch("/api/dodo/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planMappingId: mapping.id,
            name: mapping.name,
            description: mapping.description,
            amount: mapping.amount,
            billingFrequency: mapping.billingFrequency,
          }),
        });
        if (res.ok) {
          const { productId } = await res.json();
          finalMapping = { ...mapping, dodoProductId: productId };
          savePlanMapping(finalMapping);
          onToast?.("Plan saved and synced to Dodo", "success");
        } else {
          onToast?.("Plan saved locally — Dodo sync failed. Retry from Plans list.", "error");
        }
      } catch {
        onToast?.("Plan saved locally — Dodo sync failed. Retry from Plans list.", "error");
      }
    }

    setSyncing(false);
    setForm(BLANK_FORM);
    onSaved(finalMapping);
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{editPlan ? "Edit" : "Add"} Plan</DrawerTitle>
          <DrawerDescription>Configure package — will be created as a product in Dodo Payments</DrawerDescription>
        </DrawerHeader>
        <div className="no-scrollbar overflow-y-auto px-6 space-y-5 py-4">
          <FieldInput label="Plan Name" required value={form.name} onChange={(v) => setF("name", v)} error={errors.name} placeholder="Growth Monthly" />
          <div>
            <label className="block text-sm font-medium text-text-heading mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setF("description", e.target.value)} rows={2} placeholder="Internal description for this package..." className="w-full px-3 py-2 rounded-[4px] border border-border-default text-sm outline-none resize-none text-text-body bg-white" />
          </div>
          <FieldInput label="Amount (₹)" required type="number" value={form.amount} onChange={(v) => setF("amount", v)} error={errors.amount} placeholder="3999" />

          <div>
            <label className="block text-sm font-medium text-text-heading mb-1.5">Billing Frequency</label>
            <select value={form.billingFrequency} onChange={(e) => setF("billingFrequency", e.target.value as typeof form.billingFrequency)} className="w-full h-8 px-3 rounded-[4px] border border-border-default text-sm outline-none bg-white text-text-body">
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-heading mb-2">Modules <span className="text-status-error">*</span></label>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => {
                const selected = form.modulesUnlocked.includes(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggleModule(m.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      selected
                        ? "bg-surface-selected text-action-primary border-action-primary/30"
                        : "bg-white text-text-secondary border-border-default hover:border-border-strong hover:bg-surface-hover"
                    )}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
            {errors.modulesUnlocked && <p className="text-xs text-status-error mt-2">{errors.modulesUnlocked}</p>}
          </div>

          <label className="flex items-center gap-2">
            <Switch.Root checked={form.active} onCheckedChange={(c) => setF("active", c)} className="group inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[checked]:bg-action-primary bg-border-default">
              <Switch.Thumb className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white border border-border-default transition-transform translate-x-0 group-data-[checked]:translate-x-4" />
            </Switch.Root>
            <span className="text-sm font-medium text-text-heading">Active</span>
          </label>
        </div>
        <DrawerFooter>
          <Button onClick={handleSave} disabled={syncing}>{syncing ? "Syncing…" : "Save"}</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
