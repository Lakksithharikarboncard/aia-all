"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  error,
  className,
}: SelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-8 pl-3 pr-8 rounded-sm border text-sm outline-none transition-colors appearance-none",
          "text-text-body bg-white",
          error
            ? "border-status-error"
            : "border-border-default hover:border-border-strong focus:border-border-focus",
          "focus:ring-2 focus:ring-border-focus/30",
          !value && "text-text-disabled",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
    </div>
  );
}
