"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn("flex items-center gap-1.5 text-xs mb-4", className)}>
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={crumb.label}>
            {i > 0 && (
              <span className="text-text-disabled select-none">/</span>
            )}
            {isLast ? (
              <span className="font-semibold text-text-heading">
                {crumb.label}
              </span>
            ) : crumb.onClick ? (
              <button
                onClick={crumb.onClick}
                className="text-text-secondary hover:text-text-link transition-colors cursor-pointer"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-text-secondary">{crumb.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
