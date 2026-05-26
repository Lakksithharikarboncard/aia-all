"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  error?: boolean;
  className?: string;
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  className,
}: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full px-3 py-2 rounded-sm border text-sm outline-none transition-colors resize-none",
        "text-text-body bg-white placeholder:text-text-disabled",
        error
          ? "border-status-error"
          : "border-border-default hover:border-border-strong focus:border-border-focus",
        "focus:ring-2 focus:ring-border-focus/30",
        className
      )}
    />
  );
}
