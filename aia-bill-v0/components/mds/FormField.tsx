"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: React.ReactNode;
  description?: string;
  error?: string;
  constraint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  description,
  error,
  constraint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-text-heading">
        {label}
        {required && <span className="text-brand-red ml-0.5" aria-hidden="true">&#8226;</span>}
      </label>
      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}
      {children}
      {error ? (
        <p className="text-xs text-status-error">{error}</p>
      ) : constraint ? (
        <p className="text-xs text-text-secondary">{constraint}</p>
      ) : null}
    </div>
  );
}
