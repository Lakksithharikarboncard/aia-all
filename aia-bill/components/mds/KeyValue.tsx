"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { StatusType } from "./StatusIndicator";

interface KeyValueProps {
  label: string;
  value: string | number;
  delta?: { value: string; direction: "up" | "down"; positive?: boolean };
  statusType?: StatusType;
  onClick?: () => void;
  className?: string;
}

export function KeyValue({
  label,
  value,
  delta,
  statusType,
  onClick,
  className,
}: KeyValueProps) {
  const isButton = typeof onClick === "function";
  const Comp = isButton ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "text-left",
        isButton && "cursor-pointer hover:bg-surface-hover rounded-sm transition-colors p-2 -mx-2",
        className
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {statusType && (
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full shrink-0",
              statusType === "success" && "bg-status-success",
              statusType === "info" && "bg-status-info",
              statusType === "warning" && "bg-status-warning",
              statusType === "error" && "bg-status-error",
              statusType === "pending" && "bg-status-pending"
            )}
          />
        )}
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {label}
        </span>
      </div>
      <div className="text-xl font-semibold text-text-heading">{value}</div>
      {delta && (
        <div className="flex items-center gap-1 mt-1">
          {delta.direction === "up" ? (
            <TrendingUp
              className={cn(
                "w-3.5 h-3.5",
                delta.positive !== false
                  ? "text-status-success"
                  : "text-status-error"
              )}
            />
          ) : (
            <TrendingDown
              className={cn(
                "w-3.5 h-3.5",
                delta.positive === false
                  ? "text-status-success"
                  : "text-status-error"
              )}
            />
          )}
          <span className="text-xs text-text-secondary">{delta.value}</span>
        </div>
      )}
    </Comp>
  );
}
