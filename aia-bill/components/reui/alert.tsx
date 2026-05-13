"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = {
  info:    "border-l-status-info",
  success: "border-l-status-success",
  warning: "border-l-status-warning",
  error:   "border-l-status-error",
  done:    "border-l-status-info",
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof alertVariants;
  dismissible?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "bg-white border border-border-default border-l-4 rounded-[4px] p-3.5 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 items-start [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:row-end-3 [&>svg]:mt-0.5",
          alertVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-semibold text-sm leading-none text-text-heading col-start-2 row-start-1", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-sm text-text-body col-start-2 col-end-4 row-start-2 [&_button]:text-inherit [&_button]:underline [&_button]:underline-offset-2",
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

const AlertAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("col-start-3 row-start-1 shrink-0", className)} {...props} />
));
AlertAction.displayName = "AlertAction";

export { Alert, AlertTitle, AlertDescription, AlertAction };
