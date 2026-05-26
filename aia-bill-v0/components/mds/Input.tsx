"use client";

import * as React from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: boolean;
  className?: string;
  min?: number | string;
  readOnly?: boolean;
  disabled?: boolean;
}

export function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  className,
  min,
  readOnly,
  disabled,
}: InputProps) {
  return (
    <ShadcnInput
      type={type}
      value={value}
      min={min}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className={cn(
        "w-full h-8 px-3 rounded-sm border text-sm outline-none transition-colors",
        "text-text-body bg-white placeholder:text-text-disabled",
        error
          ? "border-status-error"
          : "border-border-default hover:border-border-strong focus:border-border-focus",
        "focus:ring-2 focus:ring-border-focus/30",
        (readOnly || disabled) && "bg-[#fafafa] text-text-disabled cursor-not-allowed",
        className
      )}
    />
  );
}
