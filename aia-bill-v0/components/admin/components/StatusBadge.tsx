"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Midday-style status badges: softer colors, fully rounded pills
const STATUS_CONFIG: Record<string, { label: string; color: string; definition: string }> = {
  draft:           { label: "Draft",           color: "bg-[#e8e9eb] text-[#737373]",               definition: "Profile created by CS — onboarding link not yet generated" },
  payment_pending: { label: "Payment Pending", color: "bg-[#fff7ed] text-[#c2410c]",               definition: "Sign-up URL sent, awaiting payment" },
  active:          { label: "Active",          color: "bg-[#f0fdf4] text-[#15803d]",               definition: "Full access — subscription paid and active" },
  payment_failed:  { label: "Payment Failed",  color: "bg-[#fef2f2] text-[#dc2626]",               definition: "Payment failed or subscription on hold" },
  inactive:        { label: "Inactive",        color: "bg-[#e8e9eb] text-[#a3a3a3]",               definition: "Subscription cancelled or expired" },
};

// ─── Status Badge with Tooltip ─────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", definition: "" };
  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-[2.5px] text-[11px] font-medium whitespace-nowrap cursor-default leading-none", cfg.color)}>
          {cfg.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-xs">
        {cfg.definition}
      </TooltipContent>
    </Tooltip>
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

export function MdsAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "h-8 w-8 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" };
  return (
    <Avatar className={cn("rounded-[2.5px] flex items-center justify-center font-semibold shrink-0 overflow-hidden", avatarColor(name), sizeClasses[size])}>
      <AvatarFallback className="font-semibold">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
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
    <span className={cn("px-2 py-1 rounded-[2.5px] text-xs font-medium", cfg.color)}>
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
