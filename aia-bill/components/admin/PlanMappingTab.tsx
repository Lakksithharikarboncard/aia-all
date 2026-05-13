"use client";

import * as React from "react";
import { Switch } from "@base-ui/react/switch";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES, loadCustomers } from "@/lib/billing";
import { Header } from "@/components/mds/Header";
import {
  Table,
  TableEmpty,
  TableToolbar,
  TablePagination,
} from "@/components/mds/Table";
import { Button } from "@/components/mds/Button";
import { Modal } from "@/components/mds/Modal";
import { PlanFormDrawer } from "./components/PlanFormDrawer";
import { savePlanMapping, deletePlanMapping } from "@/lib/billing";
import { useToast } from "@/components/ui/Toast";
import type { PlanMapping } from "@/lib/billing";

interface PlanMappingTabProps {
  planMappings: PlanMapping[];
  onRefresh: () => void;
}

const PAGE_SIZE = 10;

export function PlanMappingTab({ planMappings, onRefresh }: PlanMappingTabProps) {
  const { addToast } = useToast();

  const [showForm, setShowForm] = React.useState(false);
  const [editPlan, setEditPlan] = React.useState<PlanMapping | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PlanMapping | null>(null);

  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | undefined>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = planMappings.filter((m) => {
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.polarPriceId.toLowerCase().includes(q) ||
        m.billingFrequency.toLowerCase().includes(q)
      );
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as any)[sortKey];
        const bVal = (b as any)[sortKey];
        const cmp =
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : String(aVal ?? "").localeCompare(String(bVal ?? ""));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [planMappings, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const openAdd = () => {
    setEditPlan(null);
    setShowForm(true);
  };

  const openEdit = (m: PlanMapping) => {
    setEditPlan(m);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditPlan(null);
    onRefresh();
  };

  const customersUsingPlan = React.useMemo(() => {
    if (!deleteTarget) return [];
    return loadCustomers().filter(
      (c) => c.selectedPlanMappingId === deleteTarget.id
    );
  }, [deleteTarget]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deletePlanMapping(deleteTarget.id);
    addToast(`Deleted plan "${deleteTarget.name}"`, "success");
    setDeleteTarget(null);
    onRefresh();
  };

  const columns = [
    {
      key: "name",
      header: "Plan Name",
      sortable: true,
      render: (m: PlanMapping) => (
        <span className="text-sm font-semibold text-text-heading whitespace-nowrap">
          {m.name}
        </span>
      ),
    },
    {
      key: "polarPriceId",
      header: "Polar Price ID",
      render: (m: PlanMapping) => (
        <code
          className="text-xs bg-surface-hover px-2 py-0.5 rounded-[2px] max-w-[160px] block truncate text-text-secondary"
          title={m.polarPriceId}
        >
          {m.polarPriceId}
        </code>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (m: PlanMapping) => (
        <span className="text-sm font-medium text-text-heading whitespace-nowrap tabular-nums">
          ₹{m.amount.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "billingFrequency",
      header: "Frequency",
      sortable: true,
      render: (m: PlanMapping) => (
        <span className="text-sm text-text-secondary capitalize whitespace-nowrap">
          {m.billingFrequency}
        </span>
      ),
    },
    {
      key: "modules",
      header: "Modules",
      render: (m: PlanMapping) => (
        <div className="flex flex-wrap gap-1">
          {m.modulesUnlocked.slice(0, 3).map((mid) => (
            <span
              key={mid}
              className="px-2 py-0.5 bg-surface-hover text-text-body text-xs rounded-[2px] whitespace-nowrap"
            >
              {MODULES.find((mod) => mod.id === mid)?.name ?? mid.replace(/_/g, " ")}
            </span>
          ))}
          {m.modulesUnlocked.length > 3 && (
            <span className="text-xs text-text-secondary whitespace-nowrap">
              +{m.modulesUnlocked.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "active",
      header: "Active",
      render: (m: PlanMapping) => (
        <Switch.Root
          checked={m.active}
          onCheckedChange={() => {
            savePlanMapping({ ...m, active: !m.active });
            onRefresh();
          }}
          className="group inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[checked]:bg-action-primary bg-border-default"
        >
          <Switch.Thumb className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white border border-border-default transition-transform translate-x-0 group-data-[checked]:translate-x-4" />
        </Switch.Root>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (m: PlanMapping) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(m);
            }}
            className="p-1.5 rounded-[2px] text-text-secondary hover:text-text-heading hover:bg-surface-hover transition-colors"
            aria-label={`Edit ${m.name}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(m);
            }}
            className="p-1.5 rounded-[2px] text-text-secondary hover:text-status-error hover:bg-surface-hover transition-colors"
            aria-label={`Delete ${m.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PlanFormDrawer
        open={showForm}
        editPlan={editPlan}
        onClose={() => {
          setShowForm(false);
          setEditPlan(null);
        }}
        onSaved={handleSaved}
      />

      <Header
        title="Packages"
        description="Manage reusable plans linking Polar prices to AI Accountant modules."
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Plan
          </Button>
        }
      />

      <TableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by plan name, Polar price ID, or frequency..."
      />

      <Table
        columns={columns}
        data={paginated}
        rowKey={(m) => m.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        emptyState={
          <TableEmpty
            icon={Package}
            title={search ? "No plans match your search" : "No plans yet"}
            description={
              search
                ? "Try adjusting your search."
                : "Create your first plan to link a Polar price to AI Accountant modules."
            }
            action={
              !search && (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Plan
                </Button>
              )
            }
          />
        }
      />

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete plan?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently removed.` : ""}
        width="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              disabled={customersUsingPlan.length > 0}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete plan
            </Button>
          </>
        }
      >
        {customersUsingPlan.length > 0 ? (
          <div className="text-sm text-text-body space-y-2">
            <p>
              This plan is currently assigned to{" "}
              <strong className="text-text-heading">
                {customersUsingPlan.length} customer
                {customersUsingPlan.length > 1 ? "s" : ""}
              </strong>
              . Reassign or detach them before deleting.
            </p>
            <ul className="text-xs text-text-secondary list-disc pl-5 max-h-32 overflow-y-auto">
              {customersUsingPlan.slice(0, 8).map((c) => (
                <li key={c.id}>{c.companyName}</li>
              ))}
              {customersUsingPlan.length > 8 && (
                <li>… and {customersUsingPlan.length - 8} more</li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-text-body">
            This action cannot be undone. The plan will be removed from the
            packages list immediately.
          </p>
        )}
      </Modal>
    </div>
  );
}
