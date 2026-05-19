"use client";

import * as React from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/mds/Button";
import {
  Table,
  TableToolbar,
  TablePagination,
  TableEmpty,
} from "@/components/mds/Table";
import { StatusIndicator, STATUS_MAP, STATUS_LABELS } from "@/components/mds/StatusIndicator";
import { Avatar } from "./components/StatusBadge";
import { cn } from "@/lib/utils";
import type { CustomerAccount, PlanMapping } from "@/lib/billing";

interface CustomersListViewProps {
  customers: CustomerAccount[];
  planMappings: PlanMapping[];
  onSelectCustomer: (id: string) => void;
  onCreateCustomer: () => void;
  initialStatusFilter?: string;
}

const PAGE_SIZE = 10;

export function CustomersListView({
  customers,
  planMappings,
  onSelectCustomer,
  onCreateCustomer,
  initialStatusFilter = "all",
}: CustomersListViewProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(initialStatusFilter);
  const [sortKey, setSortKey] = React.useState<string | undefined>();
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const filtered = React.useMemo(() => {
    let result = customers.filter((c) => {
      const matchSearch =
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.primaryName.toLowerCase().includes(search.toLowerCase()) ||
        (c.dodoCustomerId ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortKey] ?? "");
        const bVal = String((b as any)[sortKey] ?? "");
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [customers, search, statusFilter, sortKey, sortDir]);

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

  const STATUS_FILTERS: { key: string; label: string; dot: string | null }[] = [
    { key: "all", label: "All", dot: null },
    { key: "active", label: "Active", dot: "bg-status-success" },
    { key: "trial", label: "Trial", dot: "bg-status-info" },
    { key: "payment_pending", label: "Payment Pending", dot: "bg-status-attention" },
    { key: "renewal", label: "Renewal", dot: "bg-status-accent" },
    { key: "grace", label: "Grace", dot: "bg-status-warning" },
    { key: "frozen", label: "Frozen", dot: "bg-status-error" },
  ];

  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.key] =
      f.key === "all"
        ? customers.length
        : customers.filter((c) => c.status === f.key).length;
    return acc;
  }, {} as Record<string, number>);

  const columns = [
    {
      key: "companyName",
      header: "Company",
      sortable: true,
      render: (c: CustomerAccount) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.companyName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-heading truncate">
              {c.companyName}
            </p>
            <p className="text-xs text-text-secondary truncate">
              {c.primaryName}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (c: CustomerAccount) => (
        <StatusIndicator
          type={STATUS_MAP[c.status] ?? "pending"}
          label={STATUS_LABELS[c.status] ?? c.status}
        />
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (c: CustomerAccount) => {
        const plan = planMappings.find(
          (p) => p.id === c.selectedPlanMappingId
        );
        return (
          <span className="text-sm text-text-body whitespace-nowrap">
            {plan
              ? plan.name
              : c.packageName
              ? c.packageName
              : "—"}
          </span>
        );
      },
    },
    {
      key: "activatedAt",
      header: "Start Date",
      sortable: true,
      render: (c: CustomerAccount) => (
        <span className="text-sm text-text-secondary whitespace-nowrap">
          {c.activatedAt
            ? new Date(c.activatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "csOwner",
      header: "CS Owner",
      sortable: true,
      render: (c: CustomerAccount) => (
        <span className="text-sm text-text-body whitespace-nowrap">
          {c.csOwner || "—"}
        </span>
      ),
    },
    {
      key: "bdOwner",
      header: "BD Owner",
      sortable: true,
      render: (c: CustomerAccount) => (
        <span className="text-sm text-text-body whitespace-nowrap">
          {c.bdOwner || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (c: CustomerAccount) => (
        <Button
          variant="normal"
          size="sm"
          onClick={(e: any) => {
            e.stopPropagation();
            onSelectCustomer(c.id);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-heading">Customers</h2>
        <Button size="sm" onClick={onCreateCustomer}>
          <Plus className="w-4 h-4 mr-1" /> Create Customer
        </Button>
      </div>

      <TableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by company or contact name..."
        filters={
          <div className="flex items-center gap-0 w-full border-b border-border-default">
            {STATUS_FILTERS.map((f) => {
              const isActive = statusFilter === f.key;
              const count = counts[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={cn(
                    "group relative inline-flex items-center gap-2 h-9 px-3.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0 border-b-2 -mb-px",
                    isActive
                      ? "border-text-heading text-text-heading"
                      : "border-transparent text-text-secondary hover:text-text-heading"
                  )}
                >
                  {f.dot && (
                    <span
                      className={cn(
                        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                        f.dot
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span>{f.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "tabular-nums px-1.5 h-[18px] inline-flex items-center justify-center rounded-[2px] text-[10px] font-semibold",
                        isActive
                          ? "bg-text-heading text-text-inverted"
                          : "bg-surface-hover text-text-secondary group-hover:text-text-heading"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        }
      />

      <Table
        columns={columns}
        data={paginated}
        rowKey={(c) => c.id}
        onRowClick={(c) => onSelectCustomer(c.id)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        emptyState={
          <TableEmpty
            icon={Users}
            title="No customers found"
            description="Try adjusting your search or filters"
            action={
              <Button size="sm" onClick={onCreateCustomer}>
                <Plus className="w-4 h-4 mr-1" /> Create Customer
              </Button>
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
    </div>
  );
}
