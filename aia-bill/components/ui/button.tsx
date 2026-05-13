"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseButton>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-action-primary text-text-inverted hover:bg-action-primary-hover active:bg-action-primary-active border border-action-primary",
  secondary:
    "bg-white text-text-body hover:bg-surface-hover active:bg-surface-hover border border-border-default",
  outline:
    "bg-transparent text-text-link hover:bg-surface-selected active:bg-surface-selected border border-text-link",
  ghost:
    "bg-transparent text-text-body hover:bg-surface-hover active:bg-surface-hover",
  link:
    "bg-transparent text-text-link hover:underline border-0",
  danger:
    "bg-transparent text-status-error hover:bg-[#fdf2f2] active:bg-[#fbe8e8] border border-status-error",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-base",
  icon: "h-8 w-8 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        disabled={disabled || loading}
        focusableWhenDisabled
        className={cn(
          "inline-flex items-center justify-center rounded-[4px] font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/30 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </BaseButton>
    );
  }
);

Button.displayName = "Button";
