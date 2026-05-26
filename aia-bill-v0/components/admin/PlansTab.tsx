"use client";

import * as React from "react";
import { Plus, Trash2, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/mds/Header";
import { Button } from "@/components/mds/Button";
import { Container } from "@/components/mds/Container";
import { Table, TableEmpty } from "@/components/mds/Table";
import { deletePlanPreset } from "@/lib/billing";
import { useToast } from "@/components/ui/Toast";
import type { PlanPreset, BillingFrequency } from "@/lib/billing";

const FREQ_LABELS: Record<BillingFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

interface PlansTabProps {
  plans: PlanPreset[];
  onRefresh: () => void;
  onCreatePlan?: () => void;
  onViewPlan?: (plan: PlanPreset) => void;
  onEditPlan?: (plan: PlanPreset) => void;
}

export function PlansTab({ plans, onRefresh, onCreatePlan, onViewPlan, onEditPlan }: PlansTabProps) {
  const { addToast } = useToast();

  const handleDelete = (id: string) => {
    deletePlanPreset(id);
    onRefresh();
    addToast("Plan deleted", "success");
  };

  const moduleCount = (p: PlanPreset) => p.modules?.length ?? 0;

  const columns = [
    {
      key: "name",
      header: "Plan Name",
      render: (p: PlanPreset) => (
        <span className="text-sm font-medium text-text-heading">{p.name}</span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (p: PlanPreset) => (
        <span className="text-sm tabular-nums text-text-body">
          ₹{p.price.toLocaleString("en-IN")} / {FREQ_LABELS[p.billingFrequency].toLowerCase()}
        </span>
      ),
    },
    {
      key: "frequency",
      header: "Billing Cycle",
      render: (p: PlanPreset) => (
        <span className="text-sm text-text-secondary">{FREQ_LABELS[p.billingFrequency]}</span>
      ),
    },
    {
      key: "modules",
      header: "Modules",
      render: (p: PlanPreset) => (
        <span className="text-sm text-text-secondary">
          {moduleCount(p)} module{moduleCount(p) !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "synced",
      header: "Dodo",
      render: (p: PlanPreset) => (
        <span className={cn("text-[11px] font-medium", p.dodoProductId ? "text-status-success" : "text-text-disabled")}>
          {p.dodoProductId ? "Synced" : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (p: PlanPreset) => (
        <span className="text-sm text-text-secondary truncate max-w-[240px] block">
          {p.description || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p: PlanPreset) => (
        <div className="flex items-center gap-4 text-[12px] font-medium">
          <button
            onClick={() => onViewPlan?.(p)}
            className="text-text-secondary hover:text-text-body transition-colors px-1.5 py-0.5"
          >
            View
          </button>
          <button
            onClick={() => onEditPlan?.(p)}
            className="text-text-secondary hover:text-text-body transition-colors px-1.5 py-0.5"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(p.id)}
            className="text-[#dc2626] hover:text-[#b91c1c] transition-colors px-1.5 py-0.5"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onCreatePlan}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Plan
        </Button>
      </div>

      <Table
        columns={columns}
        data={plans}
        rowKey={(p) => p.id}
        emptyState={
          <TableEmpty
            icon={LayoutList}
            title="No plans yet"
            description="Create a plan to reuse pricing presets when onboarding customers"
          />
        }
      />
    </div>
  );
}


