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
          "flex items-center justify-between px-4 py-0 min-h-[44px]",
          className
        )}
      >
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-heading">{title}</h3>
          {description && (
            <p className="text-[11px] text-text-secondary mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-text-heading">{title}</h2>
        {description && (
          <p className="text-sm text-text-secondary mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
