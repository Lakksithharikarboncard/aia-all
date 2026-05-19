"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /** Span both columns inside an InfoGrid (default: single column). */
  full?: boolean;
}

export function InfoRow({ label, value, mono, full }: InfoRowProps) {
  const display = value === undefined || value === null || value === "" ? "—" : value;
  return (
    <div className={cn("flex flex-col gap-1 min-w-0", full && "col-span-2")}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      <span
        className={cn(
          "text-sm text-text-heading break-words",
          mono ? "font-mono text-xs" : "font-medium"
        )}
      >
        {display}
      </span>
    </div>
  );
}

interface InfoGridProps {
  title: string;
  children: React.ReactNode;
  columns?: boolean;
  action?: React.ReactNode;
}

export function InfoGrid({ title, children, columns = true, action }: InfoGridProps) {
  return (
    <section className="bg-white rounded-[3px] border border-border-default">
      <header className="px-5 py-3 border-b border-border-divider flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          {title}
        </h3>
        {action}
      </header>
      <div className={cn("p-5", columns ? "grid grid-cols-2 gap-x-6 gap-y-4" : "space-y-4")}>
        {children}
      </div>
    </section>
  );
}
