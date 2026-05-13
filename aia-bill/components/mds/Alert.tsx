"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const borderColors: Record<AlertVariant, string> = {
  info: "border-l-status-info",
  success: "border-l-status-success",
  warning: "border-l-status-warning",
  error: "border-l-status-error",
};

const iconColors: Record<AlertVariant, string> = {
  info: "text-status-info",
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
};

export function Alert({
  variant = "info",
  icon,
  title,
  description,
  dismissible,
  onDismiss,
  action,
  className,
  children,
}: AlertProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={cn(
        "bg-white border border-border-default border-l-4 rounded-sm px-3.5 py-3 flex items-center gap-3",
        borderColors[variant],
        className
      )}
    >
      {icon && (
        <div className={cn("shrink-0 self-start mt-0.5", iconColors[variant])}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold text-text-heading leading-5">{title}</p>
        )}
        {description && (
          <p className="text-sm text-text-body mt-0.5 leading-5 line-clamp-2">{description}</p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="shrink-0 self-start p-0.5 text-text-disabled hover:text-text-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
