"use client";

import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";

// MDS-status badge colors (pill style, separate from StatusIndicator dot pattern)
const STATUS_CONFIG: Record<string, { label: string; color: string; definition: string }> = {
  lead:            { label: "Lead",            color: "bg-surface-hover text-text-secondary",        definition: "Inbound interest — not yet a customer" },
  draft:           { label: "Draft",           color: "bg-surface-hover text-status-pending",         definition: "Profile created by CS, setup incomplete" },
  trial:           { label: "Trial",           color: "bg-[#E6F0FA] text-status-info",                definition: "14-day evaluation period — module access active" },
  payment_pending: { label: "Payment Pending", color: "bg-[#FFF3E6] text-status-warning",             definition: "Checkout link sent, awaiting first payment" },
  active:          { label: "Active",          color: "bg-[#E6F5EE] text-status-success",             definition: "Full access — billing active and paid" },
  renewal:         { label: "Renewal",         color: "bg-[#E6F0FA] text-status-info",                definition: "Next billing cycle due — payment expected to continue access" },
  grace:           { label: "Grace",           color: "bg-[#FFF3E6] text-status-warning",             definition: "Payment overdue — access still active, limited time remaining" },
  frozen:          { label: "Frozen",          color: "bg-[#FDEBEB] text-status-error",               definition: "Access blocked due to unresolved payment" },
  inactive:        { label: "Inactive",        color: "bg-surface-hover text-text-disabled",          definition: "Account deactivated or churned" },
};

// ─── Status Badge with Tooltip ─────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", definition: "" };
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className="cursor-default">
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", cfg.color)}>
          {cfg.label}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={4} side="top">
          <Tooltip.Popup className="px-2.5 py-1.5 rounded-md bg-surface-inverse text-white text-xs shadow-popover max-w-56 origin-(--transform-origin) transition-[transform,scale,opacity] data-[starting-style]:opacity-0 data-[starting-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:scale-90">
            {cfg.definition}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ─── Avatar Colors ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-[#E6F0FA] text-status-info",
  "bg-[#E6F5EE] text-status-success",
  "bg-[#FFF3E6] text-status-warning",
  "bg-[#FDEBEB] text-status-error",
  "bg-surface-hover text-text-secondary",
  "bg-[#EDE9FE] text-[#7C3AED]",
  "bg-[#FCE7F3] text-[#DB2777]",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "h-7 w-7 text-xs", md: "h-8 w-8 text-sm", lg: "h-10 w-10 text-base" };
  return (
    <BaseAvatar.Root className={cn("rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden", avatarColor(name), sizeClasses[size])}>
      <BaseAvatar.Fallback>
        {name.charAt(0).toUpperCase()}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}

// ─── Lead Status Config ────────────────────────────────────────────────
const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:         { label: "New",          color: "bg-[#E6F0FA] text-status-info" },
  qualified:   { label: "Qualified",    color: "bg-[#E6F5EE] text-status-success" },
  demo_needed: { label: "Demo Needed",  color: "bg-[#FFF3E6] text-status-warning" },
  converted:   { label: "Converted",    color: "bg-[#E6F0FA] text-status-info" },
  rejected:    { label: "Rejected",     color: "bg-[#FDEBEB] text-status-error" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const cfg = LEAD_STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ─── Tier Colors ──────────────────────────────────────────────────────
export const TIER_COLORS = {
  starter: "bg-surface-hover text-text-secondary border-border-default",
  growth:  "bg-[#E6F0FA] text-status-info border-[#B3D4F7]",
  custom:  "bg-[#E6F0FA] text-status-info border-[#B3D4F7]",
} as const;
