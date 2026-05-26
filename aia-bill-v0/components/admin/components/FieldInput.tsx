"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FieldInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function FieldInput({
  label, value, onChange, type = "text", placeholder, required, error,
}: FieldInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-heading mb-1.5">
        {label}{required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-8 px-3 rounded-[2.5px] border text-sm outline-none bg-white",
          error
            ? "border-status-error"
            : "border-border-default focus:border-action-primary",
          "focus:ring-2 focus:ring-action-primary/30"
        )}
      />
      {error && <p className="text-xs text-status-error mt-1">{error}</p>}
    </div>
  );
}
