"use client";

import * as React from "react";
import {
  Plus,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Clock,
} from "lucide-react";
import { MdsAvatar as Avatar, StatusBadge } from "./components/StatusBadge";
import { Button } from "@/components/mds/Button";
import { cn } from "@/lib/utils";
import type { CustomerAccount, AuditEntry } from "@/lib/billing";
import { loadAuditLog } from "@/lib/billing";

interface OverviewTabProps {
  customers: CustomerAccount[];
  onGoToCustomers: (filter?: string) => void;
  onGoToAudit: () => void;
  onCreateCustomer: () => void;
  onSelectCustomer: (id: string) => void;
}

// ─── Status Distribution Bar ───────────────────────────────────────────
const STATUS_SEGMENTS = [
  { key: "active",          color: "oklch(70.5% 0.18 153)", label: "Active" },
  { key: "payment_pending", color: "oklch(72% 0.14 60)",    label: "Pending" },
  { key: "payment_failed",  color: "oklch(65% 0.2 25)",     label: "Failed" },
  { key: "draft",           color: "#d4d4d4",               label: "Draft" },
  { key: "inactive",        color: "#e8e8e8",               label: "Inactive" },
] as const;

function StatusBar({ customers }: { customers: CustomerAccount[] }) {
  const total = customers.length || 1;
  const segments = STATUS_SEGMENTS.map((s) => ({
    ...s,
    count: customers.filter((c) => c.status === s.key).length,
  }));
  return (
    <div>
      <div className="flex h-1.5 rounded-[2.5px] overflow-hidden gap-[2px] mb-3">
        {segments.map(
          (s) =>
            s.count > 0 && (
              <div
                key={s.key}
                style={{ flex: s.count / total, background: s.color, minWidth: 3 }}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11.5px] text-[#737373]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
            <span className="font-semibold text-[#0a0a0a] tabular-nums">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Sparkline ─────────────────────────────────────────────────────
function Sparkline({
  data,
  color = "oklch(70.5% 0.18 153)",
  highlightLast = 5,
}: {
  data: number[];
  color?: string;
  highlightLast?: number;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data.filter((v) => v > 0), 0);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-[2px] h-[28px] mt-4" aria-hidden="true">
      {data.map((v, i) => {
        const pct = Math.max(((v - min) / range) * 100, v > 0 ? 8 : 3);
        const on = i >= data.length - highlightLast;
        return (
          <i
            key={i}
            style={{
              display: "block",
              width: 4,
              borderRadius: 1,
              height: `${pct}%`,
              background: on ? color : "rgba(0,0,0,0.09)",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Pulsing Status Dot ────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex items-center justify-center w-[9px] h-[9px] shrink-0 mt-0.5">
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-40"
        style={{ background: color }}
      />
      <span className="relative w-[7px] h-[7px] rounded-full" style={{ background: color }} />
    </span>
  );
}

// ─── Sparkline data builder ────────────────────────────────────────────
function buildSparkline(
  customers: CustomerAccount[],
  getValue: (subset: CustomerAccount[]) => number,
  bars = 12
): number[] {
  const sorted = [...customers].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const points = sorted.map((_, i) => getValue(sorted.slice(0, i + 1)));
  const padded = Array(Math.max(0, bars - points.length)).fill(0).concat(points);
  return padded.slice(-bars);
}

// ─── Audit Action Label ────────────────────────────────────────────────
function auditLabel(entry: AuditEntry): string {
  return entry.reason ? `${entry.action} — ${entry.reason}` : entry.action;
}

// ─── Main Component ────────────────────────────────────────────────────
export function OverviewTab({
  customers,
  onGoToCustomers,
  onGoToAudit,
  onCreateCustomer,
  onSelectCustomer,
}: OverviewTabProps) {
  const [auditLog, setAuditLog] = React.useState<AuditEntry[]>([]);

  React.useEffect(() => {
    setAuditLog(loadAuditLog().slice(0, 7));
  }, []);

  const stats = {
    total:    customers.length,
    active:   customers.filter((c) => c.status === "active").length,
    pending:  customers.filter((c) => c.status === "payment_pending").length,
    failed:   customers.filter((c) => c.status === "payment_failed").length,
    draft:    customers.filter((c) => c.status === "draft").length,
    inactive: customers.filter((c) => c.status === "inactive").length,
  };

  const mrr = customers
    .filter((c) => c.status === "active")
    .reduce((sum, c) => {
      if (c.billingFrequency === "quarterly") return sum + c.price / 3;
      if (c.billingFrequency === "annual") return sum + c.price / 12;
      return sum + c.price;
    }, 0);

  const outstanding = customers
    .filter((c) => c.status === "payment_pending" || c.status === "payment_failed")
    .reduce((sum, c) => sum + c.price, 0);

  const attentionItems = customers
    .filter((c) => c.status === "payment_pending" || c.status === "payment_failed")
    .sort((a) => (a.status === "payment_failed" ? -1 : 1));

  // ── Sparkline data ─────────────────────────────────────────────────
  const mrrOf = (s: CustomerAccount[]) =>
    Math.round(
      s
        .filter((c) => c.status === "active")
        .reduce((sum, c) => {
          if (c.billingFrequency === "quarterly") return sum + c.price / 3;
          if (c.billingFrequency === "annual") return sum + c.price / 12;
          return sum + c.price;
        }, 0)
    );

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = customers.filter(
    (c) => new Date(c.createdAt).getTime() > sevenDaysAgo
  ).length;

  const sparks = {
    total:       buildSparkline(customers, (s) => s.length),
    active:      buildSparkline(customers, (s) => s.filter((c) => c.status === "active").length),
    mrr:         buildSparkline(customers, mrrOf),
    outstanding: buildSparkline(customers, (s) =>
      s
        .filter((c) => c.status === "payment_pending" || c.status === "payment_failed")
        .reduce((sum, c) => sum + c.price, 0)
    ),
  };

  // ── KPI card definitions ───────────────────────────────────────────
  const kpiCards = [
    {
      key:        "total",
      label:      "Total Customers",
      value:      stats.total,
      delta:      newThisWeek > 0 ? `+${newThisWeek} this week` : null,
      sub:        `${stats.active} active`,
      Icon:       Users,
      dot:        undefined as string | undefined,
      pulse:      false,
      spark:      sparks.total,
      sparkColor: "oklch(70.5% 0.18 153)",
      filter:     undefined as string | undefined,
      warn:       false,
    },
    {
      key:        "active",
      label:      "Active",
      value:      stats.active,
      delta:      null as string | null,
      sub:        `of ${stats.total} total`,
      Icon:       TrendingUp,
      dot:        "oklch(70.5% 0.18 153)",
      pulse:      true,
      spark:      sparks.active,
      sparkColor: "oklch(70.5% 0.18 153)",
      filter:     "active",
      warn:       false,
    },
    {
      key:        "mrr",
      label:      "MRR",
      value:      `₹${Math.round(mrr).toLocaleString("en-IN")}`,
      delta:      null as string | null,
      sub:        "monthly recurring",
      Icon:       DollarSign,
      dot:        undefined as string | undefined,
      pulse:      false,
      spark:      sparks.mrr,
      sparkColor: "oklch(70.5% 0.18 153)",
      filter:     undefined as string | undefined,
      warn:       false,
    },
    {
      key:        "outstanding",
      label:      "Outstanding",
      value:      outstanding > 0 ? `₹${outstanding.toLocaleString("en-IN")}` : "—",
      delta:      null as string | null,
      sub:        `${stats.pending + stats.failed} ${stats.pending + stats.failed === 1 ? "customer" : "customers"}`,
      Icon:       AlertTriangle,
      dot:        outstanding > 0 ? "oklch(65% 0.2 25)" : undefined,
      pulse:      outstanding > 0,
      spark:      sparks.outstanding,
      sparkColor: outstanding > 0 ? "oklch(65% 0.2 25)" : "rgba(0,0,0,0.09)",
      filter:     undefined as string | undefined,
      warn:       outstanding > 0,
    },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Actions row */}
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={onCreateCustomer}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Create Customer
        </Button>
      </div>

      {/* Needs Attention strip */}
      {(stats.failed > 0 || stats.pending > 0 || stats.draft > 0) && (
        <div className="flex rounded-[2.5px] border border-[#e2e3e5] overflow-hidden bg-white">
          <div
            className="flex items-center gap-2 px-4 shrink-0"
            style={{ background: "oklch(98% 0.015 25)", borderRight: "1px solid #e2e3e5" }}
          >
            <PulsingDot color="oklch(65% 0.2 25)" />
            <span
              className="font-mono text-[10px] font-semibold uppercase whitespace-nowrap"
              style={{ letterSpacing: "0.08em", color: "oklch(55% 0.2 25)" }}
            >
              Needs Attention
            </span>
          </div>
          <div className="flex flex-1 divide-x divide-[#e2e3e5] overflow-x-auto">
            {stats.failed > 0 && (
              <button
                type="button"
                onClick={() => onGoToCustomers("payment_failed")}
                className="flex items-center gap-2 px-5 py-3 transition-colors text-left group flex-1 min-w-0 hover:bg-[#f5f5f5]"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(65% 0.2 25)" }} strokeWidth={2} />
                <span className="tabular-nums font-semibold text-[13px] text-[#0a0a0a]">{stats.failed}</span>
                <span className="text-[12px] text-[#737373] whitespace-nowrap">Payment Failed</span>
                <ChevronRight className="w-3 h-3 text-[#d4d4d4] group-hover:text-[#737373] transition-colors ml-auto shrink-0" />
              </button>
            )}
            {stats.pending > 0 && (
              <button
                type="button"
                onClick={() => onGoToCustomers("payment_pending")}
                className="flex items-center gap-2 px-5 py-3 transition-colors text-left group flex-1 min-w-0 hover:bg-[#f5f5f5]"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(72% 0.14 60)" }} strokeWidth={2} />
                <span className="tabular-nums font-semibold text-[13px] text-[#0a0a0a]">{stats.pending}</span>
                <span className="text-[12px] text-[#737373] whitespace-nowrap">Payment Pending</span>
                <ChevronRight className="w-3 h-3 text-[#d4d4d4] group-hover:text-[#737373] transition-colors ml-auto shrink-0" />
              </button>
            )}
            {stats.draft > 0 && (
              <button
                type="button"
                onClick={() => onGoToCustomers("draft")}
                className="flex items-center gap-2 px-5 py-3 hover:bg-[#f5f5f5] transition-colors text-left group flex-1 min-w-0"
              >
                <FileText className="w-3.5 h-3.5 shrink-0 text-[#a3a3a3]" strokeWidth={2} />
                <span className="tabular-nums font-semibold text-[13px] text-[#0a0a0a]">{stats.draft}</span>
                <span className="text-[12px] text-[#737373] whitespace-nowrap">Draft</span>
                <ChevronRight className="w-3 h-3 text-[#d4d4d4] group-hover:text-[#737373] transition-colors ml-auto shrink-0" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stat strips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <button
          type="button"
          onClick={() => onGoToCustomers()}
          className="flex items-center gap-3 rounded-[2.5px] border border-[#e2e3e5] bg-white px-4 py-3 text-left hover:border-[#d0d1d3] transition-colors cursor-pointer"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-[13px] font-semibold text-[#0a0a0a] leading-tight">Total Customers</strong>
            <span className="text-[11px] text-[#a3a3a3] leading-tight">All accounts</span>
          </div>
          <em className="not-italic ml-auto text-[15px] font-semibold text-[#3146af] leading-none tabular-nums">
            {stats.total}
          </em>
        </button>

        {/* Active */}
        <button
          type="button"
          onClick={() => onGoToCustomers("active")}
          className="flex items-center gap-3 rounded-[2.5px] border border-[#e2e3e5] bg-white px-4 py-3 text-left hover:border-[#d0d1d3] transition-colors cursor-pointer"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-[13px] font-semibold text-[#0a0a0a] leading-tight">Active</strong>
            <span className="text-[11px] text-[#a3a3a3] leading-tight">Paid subscriptions</span>
          </div>
          <em className="not-italic ml-auto text-[15px] font-semibold text-[#3146af] leading-none tabular-nums">
            {stats.active}
          </em>
        </button>

        {/* Payment Pending */}
        <button
          type="button"
          onClick={() => onGoToCustomers("payment_pending")}
          className="flex items-center gap-3 rounded-[2.5px] border border-[#e2e3e5] bg-white px-4 py-3 text-left hover:border-[#d0d1d3] transition-colors cursor-pointer"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-[13px] font-semibold text-[#0a0a0a] leading-tight">Payment Pending</strong>
            <span className="text-[11px] text-[#a3a3a3] leading-tight">Awaiting first payment</span>
          </div>
          <em className="not-italic ml-auto text-[15px] font-semibold text-[#3146af] leading-none tabular-nums">
            {stats.pending}
          </em>
        </button>

        {/* Payment Failed */}
        <button
          type="button"
          onClick={() => onGoToCustomers("payment_failed")}
          className="flex items-center gap-3 rounded-[2.5px] border border-[#e2e3e5] bg-white px-4 py-3 text-left hover:border-[#d0d1d3] transition-colors cursor-pointer"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <strong className="text-[13px] font-semibold text-[#0a0a0a] leading-tight">Payment Failed</strong>
            <span className="text-[11px] text-[#a3a3a3] leading-tight">Needs follow-up</span>
          </div>
          <em className="not-italic ml-auto text-[15px] font-semibold text-[#3146af] leading-none tabular-nums">
            {stats.failed}
          </em>
        </button>
      </div>

      {/* Main 2fr + 1fr grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-start">
        {/* Left column */}
        <div className="space-y-4 min-w-0">
          {/* Status distribution */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-semibold text-[#0a0a0a] uppercase tracking-wider">
                Customer Distribution
              </h2>
              <button
                type="button"
                onClick={() => onGoToCustomers()}
                className="flex items-center gap-0.5 text-[11px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <StatusBar customers={customers} />
          </div>

          {/* Recent customers */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e2e3e5] flex items-center justify-between">
              <h2 className="text-[11px] font-semibold text-[#0a0a0a] uppercase tracking-wider">
                Recent Customers
              </h2>
              <button
                type="button"
                onClick={() => onGoToCustomers()}
                className="flex items-center gap-0.5 text-[11px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {customers.length === 0 ? (
              <div className="text-center text-[#a3a3a3] py-10 text-[13px]">No customers yet</div>
            ) : (
              <div className="divide-y divide-[#edeef0]">
                {customers.slice(0, 8).map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectCustomer(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && onSelectCustomer(c.id)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#f2f3f5] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.companyName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0a0a0a] truncate">
                          {c.companyName}
                        </p>
                        <p className="text-[11.5px] text-[#a3a3a3] truncate">{c.primaryName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-[12px] font-medium text-[#737373] tabular-nums">
                        ₹{c.price.toLocaleString("en-IN")}
                      </span>
                      <StatusBadge status={c.status} />
                      <ChevronRight className="w-3.5 h-3.5 text-[#e5e5e5] group-hover:text-[#a3a3a3] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Amount Receivable + breakdown */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] overflow-hidden">
            <div className="px-5 py-4">
              <p className="text-[11px] text-[#a3a3a3] uppercase tracking-wider font-medium">
                Amount Receivable
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-[22px] font-semibold text-[#0a0a0a] tabular-nums leading-tight">
                  {outstanding > 0 ? `₹${outstanding.toLocaleString("en-IN")}` : "—"}
                </p>
                <span className="text-[11px] text-[#a3a3a3]">
                  {attentionItems.length} {attentionItems.length === 1 ? "account" : "accounts"}
                </span>
              </div>
            </div>
            {attentionItems.length > 0 && (
              <div className="divide-y divide-[#edeef0] border-t border-[#e2e3e5]">
                {attentionItems.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCustomer(c.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f2f3f5] transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.companyName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0a0a0a] truncate">
                          {c.companyName}
                        </p>
                        <p className="text-[11.5px] text-[#a3a3a3] truncate">{c.primaryName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[12px] font-semibold text-[#0a0a0a] tabular-nums">
                        ₹{c.price.toLocaleString("en-IN")}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#e5e5e5] group-hover:text-[#a3a3a3] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="px-5 py-3 border-t border-[#e2e3e5]">
              <button
                type="button"
                onClick={() => onGoToCustomers()}
                className="flex items-center justify-center gap-1 w-full text-[11px] font-medium text-[#737373] hover:text-[#0a0a0a] transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Audit feed */}
          {auditLog.length > 0 && (
            <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e2e3e5] flex items-center justify-between">
                <h2 className="text-[11px] font-semibold text-[#0a0a0a] uppercase tracking-wider">
                  Recent Activity
                </h2>
                <button
                  type="button"
                  onClick={onGoToAudit}
                  className="flex items-center gap-0.5 text-[11px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors"
                >
                  Audit log <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-[#edeef0]">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="px-5 py-3">
                    <p className="text-[12px] font-medium text-[#0a0a0a] leading-snug">
                      {auditLabel(entry)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10.5px] text-[#a3a3a3]">{entry.actor}</span>
                      <span className="text-[#e5e5e5]">·</span>
                      <span className="text-[10.5px] text-[#c0c0c0]">
                        {new Date(entry.timestamp).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
