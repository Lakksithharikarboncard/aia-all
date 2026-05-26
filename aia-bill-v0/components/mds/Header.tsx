"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  variant?: "page" | "container";
}

export function Header({
  title,
  description,
  actions,
  className,
  variant = "page",
}: HeaderProps) {
  if (variant === "container") {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3",
          className
        )}
      >
        <div>
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{title}</h3>
          {description && (
            <p className="text-xs text-[#a3a3a3] mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-[#0a0a0a] tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-[#a3a3a3] mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
