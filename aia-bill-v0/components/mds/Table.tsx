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
      <div className={cn("bg-white rounded-[2.5px] overflow-hidden", className)}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e2e3e5]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 h-11 text-left text-[11px] font-medium uppercase tracking-wider text-[#a3a3a3]"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-[#e2e3e5] last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5">
                    <div className="h-4 bg-[#edeef0] rounded-[2.5px] animate-pulse w-3/4" />
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
      <div className={cn("bg-white rounded-[2.5px]", className)}>
        {emptyState}
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-[2.5px] overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e2e3e5]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 h-11 text-left text-[11px] font-medium uppercase tracking-wider text-[#a3a3a3]",
                    col.sortable && "cursor-pointer select-none hover:text-[#525252] transition-colors"
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
          <tbody className="divide-y divide-[#edeef0]">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "hover:bg-[#f2f3f5] transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3 text-sm text-[#171717] align-middle">
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
        <div className="w-10 h-10 rounded-[2.5px] bg-[#edeef0] flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-[#a3a3a3]" />
        </div>
      )}
      <p className="text-sm font-medium text-[#525252]">{title}</p>
      {description && (
        <p className="text-xs text-[#a3a3a3] mt-1">{description}</p>
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
    <div className={cn("space-y-3", className)}>
      {hasTopRow && (
        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="relative flex-1 max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3a3a3]" />
              <input
                type="text"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 rounded-[2.5px] border border-[#e2e3e5] text-sm outline-none focus:border-[#bfc1c4] focus:ring-2 focus:ring-[#e2e3e5] bg-white text-[#171717] placeholder:text-[#a3a3a3] transition-all"
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
        "flex items-center justify-between text-xs text-[#a3a3a3]",
        className
      )}
    >
      <span className="tabular-nums">
        {startItem}–{endItem} of {totalItems}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-[2.5px] hover:bg-[#edeef0] disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "px-3 py-1.5 rounded-[2.5px] text-xs font-medium transition-colors",
              page === currentPage
                ? "bg-action-primary text-white"
                : "hover:bg-[#edeef0] text-[#525252]"
            )}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-[2.5px] hover:bg-[#edeef0] disabled:opacity-30 disabled:cursor-not-allowed text-sm"
        >
          ›
        </button>
      </div>
    </div>
  );
}
