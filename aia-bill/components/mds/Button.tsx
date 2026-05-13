"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// MDS variants: primary (filled brand-red), secondary (white+strong border),
// tertiary (link), icon, danger.
// `normal` and `link` are kept as aliases for back-compat with existing call sites.
type MDSButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "icon"
  | "danger"
  | "normal"
  | "link";

interface ButtonProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof BaseButton>,
    "className"
  > {
  variant?: MDSButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<MDSButtonVariant, string> = {
  primary:
    "bg-action-primary text-text-inverted hover:bg-action-primary-hover active:bg-action-primary-active border border-action-primary",
  secondary:
    "bg-white text-text-body hover:bg-surface-hover active:bg-surface-hover border border-border-strong",
  tertiary:
    "bg-transparent text-text-link hover:underline border-0",
  icon: "bg-transparent text-text-secondary hover:bg-surface-hover border-0",
  danger:
    "bg-white text-status-error hover:bg-[#fef2f2] active:bg-[#fee2e2] border border-status-error",
  normal:
    "bg-white text-text-body hover:bg-surface-hover active:bg-surface-hover border border-border-strong",
  link:
    "bg-transparent text-text-link hover:underline border-0",
};

// MDS min touch target: 28px (sm). Icon buttons: 28-32px square.
// Base: 14px type, 32px height (md), 36px (lg)
const sizeClasses = {
  sm: "h-7 px-3 text-xs rounded-sm",
  md: "h-8 px-4 text-sm rounded-sm",
  lg: "h-9 px-5 text-sm rounded-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <BaseButton
        ref={ref}
        disabled={disabled || loading}
        focusableWhenDisabled
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors whitespace-nowrap",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1",
          "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </BaseButton>
    )}
);
Button.displayName = "Button";
