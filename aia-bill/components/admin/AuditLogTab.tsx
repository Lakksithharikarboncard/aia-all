"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Header } from "@/components/mds/Header";
import {
  Table,
  TableEmpty,
  TableToolbar,
  TablePagination,
} from "@/components/mds/Table";
import { Select } from "@/components/mds/Select";
import type { AuditEntry } from "@/lib/billing";

interface AuditLogTabProps {
  auditLog: AuditEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  customer_created: "Customer Created",
  status_changed: "Status Changed",
  plan_assigned: "Plan Assigned",
  modules_updated: "Modules Updated",
  checkout_link_generated: "Checkout Link Generated",
  note_added: "Note Added",
  upgrade_request_approved: "Request Approved",
  upgrade_request_rejected: "Request Rejected",
  lead_submitted: "Lead Submitted",
  lead_status_changed: "Lead Status Changed",
  signup_invite_generated: "Signup Invite Sent",
};

const PAGE_SIZE = 15;

export function AuditLogTab({ auditLog }: AuditLogTabProps) {
  const [search, setSearch] = React.useState("");
  const [actorFilter, setActorFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [sortKey, setSortKey] = React.useState<string | undefined>("timestamp");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);

  const actorOptions = React.useMemo(
    () => [
      { value: "all", label: "All Actors" },
      ...Array.from(new Set(auditLog.map((e) => e.actor))).map((a) => ({
        value: a,
        label: a,
      })),
    ],
    [auditLog]
  );

  const actionOptions = React.useMemo(
    () => [
      { value: "all", label: "All Actions" },
      ...Array.from(new Set(auditLog.map((e) => e.action))).map((a) => ({
        value: a,
        label: ACTION_LABELS[a] ?? a,
      })),
    ],
    [auditLog]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = auditLog.filter((e) => {
      const matchActor = actorFilter === "all" || e.actor === actorFilter;
      const matchAction = actionFilter === "all" || e.action === actionFilter;
      const matchSearch =
        !q ||
        e.actor.toLowerCase().includes(q) ||
        (ACTION_LABELS[e.action] ?? e.action).toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q) ||
        (e.reason ?? "").toLowerCase().includes(q);
      return matchActor && matchAction && matchSearch;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = String((a as any)[sortKey] ?? "");
        const bVal = String((b as any)[sortKey] ?? "");
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [auditLog, search, actorFilter, actionFilter, sortKey, sortDir]);

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

  const columns = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      render: (e: AuditEntry) => (
        <span className="text-sm text-text-secondary whitespace-nowrap tabular-nums">
          {new Date(e.timestamp).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      render: (e: AuditEntry) => (
        <span className="text-sm font-medium text-text-heading whitespace-nowrap">
          {e.actor}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (e: AuditEntry) => (
        <span className="text-sm text-text-body whitespace-nowrap">
          {ACTION_LABELS[e.action] ?? e.action}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (e: AuditEntry) => (
        <code className="text-xs bg-surface-hover px-2 py-0.5 rounded-[2px] text-text-secondary whitespace-nowrap">
          {e.entityType}/{e.entityId.slice(0, 10)}
        </code>
      ),
    },
    {
      key: "changes",
      header: "Old → New",
      render: (e: AuditEntry) => (
        <span className="text-sm text-text-secondary max-w-[220px] truncate block">
          {e.oldValue
            ? `${e.oldValue} → ${e.newValue ?? "—"}`
            : e.newValue ?? "—"}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (e: AuditEntry) => (
        <span className="text-sm text-text-secondary max-w-[260px] truncate block">
          {e.reason || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Header
        title="Audit Log"
        description="Every change made to customer accounts and plans, with actor and reason."
      />

      <TableToolbar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by actor, action, entity, or reason..."
        actions={
          <>
            <Select
              value={actorFilter}
              onChange={(v) => {
                setActorFilter(v);
                setPage(1);
              }}
              options={actorOptions}
              className="min-w-[150px]"
            />
            <Select
              value={actionFilter}
              onChange={(v) => {
                setActionFilter(v);
                setPage(1);
              }}
              options={actionOptions}
              className="min-w-[180px]"
            />
          </>
        }
      />

      <Table
        columns={columns}
        data={paginated}
        rowKey={(e) => e.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        emptyState={
          <TableEmpty
            icon={ClipboardList}
            title="No audit entries found"
            description="Try adjusting your search or filters"
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
