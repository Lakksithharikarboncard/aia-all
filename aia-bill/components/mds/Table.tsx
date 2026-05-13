"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Search, RefreshCw } from "lucide-react";
import { Button } from "./Button";

// ─── Table (root component) ────────────────────────────────────────────

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  rowKey: (row: T) => string;
}

export function Table<T>({
  columns,
  data,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  loading,
  emptyState,
  className,
  rowKey,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={cn("bg-white border border-border-default rounded-md overflow-hidden", className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface-bg">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 h-11 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-border-divider last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5">
                    <div className="h-4 bg-surface-hover rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className={cn("bg-white border border-border-default rounded-md", className)}>
        {emptyState}
      </div>
    );
  }

  return (
    <div className={cn("bg-white border border-border-default rounded-md overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface-bg sticky top-0">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 h-11 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary",
                    col.sortable && "cursor-pointer select-none hover:text-text-heading"
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-divider">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "hover:bg-surface-hover transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 text-sm text-text-body align-middle">
                    {col.render ? col.render(row) : (row as any)[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────

interface TableEmptyProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function TableEmpty({
  icon: Icon,
  title,
  description,
  action,
}: TableEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-text-disabled" />
        </div>
      )}
      <p className="text-sm font-medium text-text-body">{title}</p>
      {description && (
        <p className="text-xs text-text-secondary mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onRefresh?: () => void;
  className?: string;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  onRefresh,
  className,
}: TableToolbarProps) {
  const hasTopRow = onSearchChange || actions || onRefresh;
  return (
    <div className={cn("space-y-2.5", className)}>
      {hasTopRow && (
        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="relative flex-1 max-w-[420px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled" />
              <input
                type="text"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-sm border border-border-default text-sm outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/30 bg-white text-text-body placeholder:text-text-disabled"
              />
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {actions}
            {onRefresh && (
              <Button variant="icon" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      {filters && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          {filters}
        </div>
      )}
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "flex items-center justify-between text-xs text-text-secondary",
        className
      )}
    >
      <span>
        {startItem}–{endItem} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2 py-1 rounded-[4px] hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] text-xs font-medium",
              page === currentPage
                ? "bg-action-primary text-text-inverted"
                : "hover:bg-surface-hover"
            )}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2 py-1 rounded-[4px] hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  );
}
