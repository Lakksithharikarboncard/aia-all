"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type StatusType = "success" | "info" | "warning" | "error" | "pending" | "in-progress";

interface StatusIndicatorProps {
  type: StatusType;
  label?: string;
  className?: string;
}

const dotColors: Record<StatusType, string> = {
  success: "bg-status-success",
  info: "bg-status-info",
  warning: "bg-status-warning",
  error: "bg-status-error",
  pending: "bg-status-pending",
  "in-progress": "bg-status-info",
};

const labelColors: Record<StatusType, string> = {
  success: "text-status-success",
  info: "text-status-info",
  warning: "text-status-warning",
  error: "text-status-error",
  pending: "text-text-secondary",
  "in-progress": "text-status-info",
};

export const STATUS_MAP: Record<string, StatusType> = {
  active: "success",
  trial: "info",
  renewal: "info",
  payment_pending: "warning",
  grace: "warning",
  frozen: "error",
  inactive: "error",
  lead: "pending",
  draft: "pending",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  renewal: "Renewal",
  payment_pending: "Payment Pending",
  grace: "Grace Period",
  frozen: "Frozen",
  inactive: "Inactive",
  lead: "Lead",
  draft: "Draft",
};

export function StatusIndicator({
  type,
  label,
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        labelColors[type],
        className
      )}
    >
      {type === "in-progress" ? (
        <Loader2 className="w-2 h-2 animate-spin" />
      ) : (
        <span
          className={cn(
            "inline-block w-2 h-2 rounded-full shrink-0",
            dotColors[type]
          )}
        />
      )}
      {label && <span>{label}</span>}
    </span>
  );
}
