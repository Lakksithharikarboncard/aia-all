"use client";

import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: boolean;
  className?: string;
  min?: number;
}

export function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  className,
  min,
}: InputProps) {
  return (
    <BaseInput
      type={type}
      value={value}
      min={min}
      onValueChange={(_v, { event }) =>
        onChange((event.target as HTMLInputElement).value)
      }
      placeholder={placeholder}
      className={cn(
        "w-full h-8 px-3 rounded-sm border text-sm outline-none transition-colors",
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
