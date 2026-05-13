"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// MDS Tag: 20px tall pills with 11px text, used for filters and metadata
// Separate from StatusIndicator (dot pattern) and StatusBadge (pill with tooltip)
type TagVariant = "neutral" | "info" | "success" | "warning" | "error";

interface TagProps {
  label: string;
  variant?: TagVariant;
  onRemove?: () => void;
  className?: string;
}

const variantClasses: Record<TagVariant, string> = {
  neutral: "bg-surface-hover text-text-secondary",
  info: "bg-[#E6F0FA] text-status-info",
  success: "bg-[#E6F5EE] text-status-success",
  warning: "bg-[#FFF3E6] text-status-warning",
  error: "bg-[#FDEBEB] text-status-error",
};

export function Tag({ label, variant = "neutral", onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5 px-2 rounded-sm text-[11px] font-medium whitespace-nowrap",
        variantClasses[variant],
        onRemove && "pr-1.5",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-black/10 transition-colors"
          aria-label={`Remove ${label}`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
            <path d="M1.41 0L0 1.41 2.59 4 0 6.59 1.41 8 4 5.41 6.59 8 8 6.59 5.41 4 8 1.41 6.59 0 4 2.59z" />
          </svg>
        </button>
      )}
    </span>
  );
}
