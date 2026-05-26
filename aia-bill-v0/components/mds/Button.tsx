"use client";

import * as React from "react";
import { Button as ShadcnButton, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

// MDS variants mapped to shadcn button variants
// primary → default, secondary → outline, tertiary → link, icon → ghost, danger → destructive, normal → outline, link → link
type MDSButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "icon"
  | "danger"
  | "normal"
  | "link";

interface ButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ShadcnButton>, "variant" | "size"> {
  variant?: MDSButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const variantMap: Record<MDSButtonVariant, VariantProps<typeof buttonVariants>["variant"]> = {
  primary: "default",
  secondary: "outline",
  tertiary: "link",
  icon: "ghost",
  danger: "destructive",
  normal: "outline",
  link: "link",
};

const sizeMap: Record<NonNullable<ButtonProps["size"]>, VariantProps<typeof buttonVariants>["size"]> = {
  sm: "sm",
  md: "default",
  lg: "default",
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
      <ShadcnButton
        ref={ref}
        disabled={disabled || loading}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors whitespace-nowrap",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1",
          "data-[disabled]:opacity-50 data-[disabled]:pointer-events-none",
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </ShadcnButton>
    );
  }
);
Button.displayName = "Button";
