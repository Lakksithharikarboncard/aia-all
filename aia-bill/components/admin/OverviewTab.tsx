"use client";

import * as React from "react";
import {
  Plus, AlertCircle, ChevronRight, Clock, AlertTriangle, Snowflake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, StatusBadge } from "./components/StatusBadge";
import { Container } from "@/components/mds/Container";
import { Header } from "@/components/mds/Header";
import { Button } from "@/components/mds/Button";
import { cn } from "@/lib/utils";
import type { CustomerAccount } from "@/lib/billing";

interface OverviewTabProps {
  customers: CustomerAccount[];
  onGoToCustomers: (filter?: string) => void;
  onCreateCustomer: () => void;
  onSelectCustomer: (id: string) => void;
}

export function OverviewTab({
  customers,
  onGoToCustomers,
  onCreateCustomer,
  onSelectCustomer,
}: OverviewTabProps) {
  const stats = {
    total:   customers.length,
    active:  customers.filter((c) => c.status === "active").length,
    trial:   customers.filter((c) => c.status === "trial").length,
    renewal: customers.filter((c) => c.status === "renewal").length,
    grace:   customers.filter((c) => c.status === "grace").length,
    frozen:  customers.filter((c) => c.status === "frozen").length,
    pending: customers.filter((c) => c.status === "payment_pending").length,
  };

  const trialsEndingSoon = customers.filter((c) => {
    if (c.status !== "trial" || !c.trialEndsAt) return false;
    const daysLeft = Math.ceil((new Date(c.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 3;
  });

  return (
    <div className="space-y-5">
      <Header
        title="Overview"
        description="Billing and account summary"
        actions={
          <Button size="sm" onClick={onCreateCustomer}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Customer
          </Button>
        }
      />

      {/* Attention strip — compact, uniform, single row */}
      <AttentionStrip
        segments={[
          {
            key: "trial",
            visible: trialsEndingSoon.length > 0,
            count: trialsEndingSoon.length,
            label: "Trials Ending",
            tone: "info",
            icon: Clock,
            filter: "trial",
          },
          {
            key: "renewal",
            visible: stats.renewal > 0,
            count: stats.renewal,
            label: "Renewals Due",
            tone: "accent",
            icon: AlertCircle,
            filter: "renewal",
          },
          {
            key: "pending",
            visible: stats.pending > 0,
            count: stats.pending,
            label: "Payment Due",
            tone: "attention",
            icon: Clock,
            filter: "payment_pending",
          },
          {
            key: "grace",
            visible: stats.grace > 0,
            count: stats.grace,
            label: "Grace Period",
            tone: "warning",
            icon: AlertTriangle,
            filter: "grace",
          },
          {
            key: "frozen",
            visible: stats.frozen > 0,
            count: stats.frozen,
            label: "Frozen",
            tone: "error",
            icon: Snowflake,
            filter: "frozen",
          },
        ]}
        onSegmentClick={(filter: string) => onGoToCustomers(filter)}
      />

      {/* Customer distribution — Morningstar stacked bar chart pattern */}
      <CustomerDistribution
        total={stats.total}
        segments={[
          { key: "active",          label: "Active",          value: stats.active,  tone: "success",   filter: "active" },
          { key: "trial",           label: "Trials",          value: stats.trial,   tone: "info",      filter: "trial" },
          { key: "renewal",         label: "Renewal",         value: stats.renewal, tone: "accent",    filter: "renewal" },
          { key: "grace",           label: "Grace Period",    value: stats.grace,   tone: "warning",   filter: "grace" },
          { key: "payment_pending", label: "Payment Pending", value: stats.pending, tone: "attention", filter: "payment_pending" },
          { key: "frozen",          label: "Frozen",          value: stats.frozen,  tone: "error",     filter: "frozen" },
        ]}
        onTotalClick={() => onGoToCustomers()}
        onSegmentClick={(filter: string) => onGoToCustomers(filter)}
      />

      {/* Amount receivable — outstanding payments due */}
      <Receivables
        customers={customers}
        onGoToCustomers={onGoToCustomers}
        onSelectCustomer={onSelectCustomer}
      />

      {/* Recent Customers */}
      <Container
        header={
          <Header variant="container" title="Recent Customers" />
        }
      >
        {customers.length === 0 ? (
          <p className="text-center text-text-disabled py-8 text-sm">No customers yet</p>
        ) : (
          <div className="space-y-0.5">
            {customers.slice(0, 5).map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectCustomer(c.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectCustomer(c.id); } }}
                className="w-full flex items-center justify-between p-2.5 rounded-[4px] hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.companyName} size="sm" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-text-heading">{c.companyName}</p>
                    <p className="text-xs text-text-secondary">{c.primaryName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <ChevronRight className="w-3.5 h-3.5 text-text-disabled" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

// ─── AttentionStrip ────────────────────────────────────────────────────
// One compact horizontal bar. Each visible segment is a uniform clickable cell:
// status dot + count + label. Single line, fixed height, divided by 1px rules.
// If no segments are visible, renders nothing.

type AttentionTone = "info" | "accent" | "attention" | "warning" | "error";

interface AttentionSegment {
  key: string;
  visible: boolean;
  count: number;
  label: string;
  tone: AttentionTone;
  icon: LucideIcon;
  filter: string;
}

interface AttentionStripProps {
  segments: AttentionSegment[];
  onSegmentClick: (filter: string) => void;
}

const TONE_DOT: Record<AttentionTone, string> = {
  info: "bg-status-info",
  accent: "bg-status-accent",
  attention: "bg-status-attention",
  warning: "bg-status-warning",
  error: "bg-status-error",
};

const TONE_ICON: Record<AttentionTone, string> = {
  info: "text-status-info",
  accent: "text-status-accent",
  attention: "text-status-attention",
  warning: "text-status-warning",
  error: "text-status-error",
};

function AttentionStrip({ segments, onSegmentClick }: AttentionStripProps) {
  const visible = segments.filter((s) => s.visible);
  if (visible.length === 0) return null;

  return (
    <div className="flex items-stretch bg-white border border-border-default rounded-[3px] overflow-hidden">
      <div className="hidden md:flex items-center gap-2 px-4 border-r border-border-divider bg-status-error/10 shrink-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-status-error opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-status-error" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-status-error whitespace-nowrap">
          Needs attention
        </span>
      </div>
      <div className="flex flex-1 divide-x divide-border-divider min-w-0 overflow-x-auto no-scrollbar">
        {visible.map((seg) => {
          const Icon = seg.icon;
          return (
            <button
              key={seg.key}
              type="button"
              onClick={() => onSegmentClick(seg.filter)}
              className={cn(
                "group flex items-center gap-2.5 px-4 h-12 min-w-0 flex-1 transition-colors text-left",
                "hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover"
              )}
            >
              <span
                className={cn("inline-block w-2 h-2 rounded-full shrink-0", TONE_DOT[seg.tone])}
              />
              <Icon className={cn("w-3.5 h-3.5 shrink-0", TONE_ICON[seg.tone])} />
              <span className="text-sm font-semibold text-text-heading tabular-nums shrink-0">
                {seg.count}
              </span>
              <span className="text-sm text-text-body truncate">{seg.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-text-disabled ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CustomerDistribution ─────────────────────────────────────────────
// Morningstar stacked-bar chart pattern: a single horizontal bar showing
// the customer mix across statuses, with a clickable legend below.
// Each bar segment is proportional to its share of the total.

type DistTone =
  | "success"
  | "info"
  | "accent"
  | "attention"
  | "warning"
  | "error";

interface DistSegment {
  key: string;
  label: string;
  value: number;
  tone: DistTone;
  filter: string;
}

interface CustomerDistributionProps {
  total: number;
  segments: DistSegment[];
  onTotalClick: () => void;
  onSegmentClick: (filter: string) => void;
}

const DIST_BG: Record<DistTone, string> = {
  success: "bg-status-success",
  info: "bg-status-info",
  accent: "bg-status-accent",
  attention: "bg-status-attention",
  warning: "bg-status-warning",
  error: "bg-status-error",
};

function CustomerDistribution({
  total,
  segments,
  onTotalClick,
  onSegmentClick,
}: CustomerDistributionProps) {
  const visible = segments.filter((s) => s.value > 0);
  const sum = visible.reduce((acc, s) => acc + s.value, 0);
  const pct = (n: number) => (sum === 0 ? 0 : (n / sum) * 100);

  return (
    <div className="bg-white border border-border-default rounded-[3px]">
      {/* Header — Total + label */}
      <div className="flex items-end justify-between px-5 pt-4 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Customer Distribution
          </p>
          <button
            type="button"
            onClick={onTotalClick}
            className="mt-1 inline-flex items-baseline gap-2 text-left hover:underline focus-visible:outline-none focus-visible:underline"
          >
            <span className="text-3xl font-semibold text-text-heading tabular-nums leading-none">
              {total}
            </span>
            <span className="text-xs text-text-secondary">total customers</span>
          </button>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="px-5">
        <div className="flex h-2.5 w-full rounded-[2px] overflow-hidden bg-surface-bg">
          {visible.map((seg) => (
            <button
              key={seg.key}
              type="button"
              title={`${seg.label}: ${seg.value} (${pct(seg.value).toFixed(0)}%)`}
              onClick={() => onSegmentClick(seg.filter)}
              style={{ width: `${pct(seg.value)}%` }}
              className={cn(
                DIST_BG[seg.tone],
                "h-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:opacity-80",
                "first:rounded-l-[2px] last:rounded-r-[2px]"
              )}
              aria-label={`${seg.label}: ${seg.value}`}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 px-5 pt-3 pb-4">
        {segments.map((seg) => {
          const percent = pct(seg.value);
          const muted = seg.value === 0;
          return (
            <button
              key={seg.key}
              type="button"
              disabled={muted}
              onClick={() => onSegmentClick(seg.filter)}
              className={cn(
                "flex items-center gap-2 text-left rounded-[2px] -mx-1 px-1 py-1 transition-colors",
                muted
                  ? "opacity-50 cursor-default"
                  : "hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover"
              )}
            >
              <span
                className={cn("inline-block w-2.5 h-2.5 rounded-[2px] shrink-0", DIST_BG[seg.tone])}
                aria-hidden="true"
              />
              <span className="text-xs text-text-secondary truncate">{seg.label}</span>
              <span className="text-xs font-semibold text-text-heading tabular-nums ml-auto pl-2 shrink-0">
                {seg.value}
              </span>
              <span className="text-[11px] text-text-disabled tabular-nums shrink-0 w-9 text-right">
                {percent.toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Receivables ───────────────────────────────────────────────────────
// Outstanding payments expected from customers currently awaiting payment,
// in grace, or due for renewal. Click a bucket to filter the customers list.

interface ReceivablesProps {
  customers: CustomerAccount[];
  onGoToCustomers: (filter?: string) => void;
  onSelectCustomer: (id: string) => void;
}

const RECEIVABLE_STATUSES: Array<{
  status: CustomerAccount["status"];
  label: string;
  tone: "attention" | "warning" | "accent";
}> = [
  { status: "payment_pending", label: "Payment Pending", tone: "attention" },
  { status: "grace",           label: "Grace Period",    tone: "warning" },
  { status: "renewal",         label: "Renewal Due",     tone: "accent" },
];

const RECEIVABLE_BAR: Record<"attention" | "warning" | "accent", string> = {
  attention: "bg-status-attention",
  warning: "bg-status-warning",
  accent: "bg-status-accent",
};

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function Receivables({ customers, onGoToCustomers, onSelectCustomer }: ReceivablesProps) {
  const buckets = React.useMemo(
    () =>
      RECEIVABLE_STATUSES.map((b) => {
        const matched = customers.filter((c) => c.status === b.status);
        const total = matched.reduce((sum, c) => sum + (c.packageAmount ?? 0), 0);
        return { ...b, count: matched.length, total };
      }),
    [customers]
  );

  const grandTotal = buckets.reduce((sum, b) => sum + b.total, 0);
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);

  const topPending = React.useMemo(
    () =>
      customers
        .filter((c) => c.status === "payment_pending" || c.status === "grace")
        .filter((c) => (c.packageAmount ?? 0) > 0)
        .sort((a, b) => (b.packageAmount ?? 0) - (a.packageAmount ?? 0))
        .slice(0, 4),
    [customers]
  );

  return (
    <div className="bg-white border border-border-default rounded-[3px]">
      {/* Header */}
      <div className="flex items-end justify-between px-5 pt-4 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Amount Receivable
          </p>
          <div className="mt-1 inline-flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-text-heading tabular-nums leading-none">
              {formatINR(grandTotal)}
            </span>
            <span className="text-xs text-text-secondary">
              across {totalCount} customer{totalCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown — 3 buckets side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-border-divider">
        {buckets.map((b, i) => (
          <button
            key={b.status}
            type="button"
            onClick={() => onGoToCustomers(b.status)}
            disabled={b.count === 0}
            className={cn(
              "relative text-left px-5 py-4 transition-colors",
              i > 0 && "sm:border-l border-border-divider",
              b.count === 0
                ? "opacity-50 cursor-default"
                : "hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-4 bottom-4 w-[3px] rounded-r-[2px]",
                RECEIVABLE_BAR[b.tone]
              )}
              aria-hidden="true"
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary pl-2.5">
              {b.label}
            </p>
            <div className="mt-1 flex items-baseline gap-2 pl-2.5">
              <span className="text-lg font-semibold text-text-heading tabular-nums leading-none">
                {formatINR(b.total)}
              </span>
              <span className="text-[11px] text-text-secondary tabular-nums">
                {b.count} {b.count === 1 ? "account" : "accounts"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Top outstanding accounts */}
      {topPending.length > 0 && (
        <div className="border-t border-border-divider px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Top outstanding
            </p>
            <button
              type="button"
              onClick={() => onGoToCustomers("payment_pending")}
              className="text-[11px] text-text-link hover:underline font-medium"
            >
              View all →
            </button>
          </div>
          <ul className="divide-y divide-border-divider">
            {topPending.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectCustomer(c.id)}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-surface-hover rounded-[2px] -mx-1 px-1 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                        c.status === "grace" ? "bg-status-warning" : "bg-status-attention"
                      )}
                    />
                    <span className="text-sm text-text-heading truncate">
                      {c.companyName}
                    </span>
                    <span className="text-[11px] text-text-secondary capitalize shrink-0">
                      · {c.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-text-heading tabular-nums shrink-0 pl-3">
                    {formatINR(c.packageAmount ?? 0)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
