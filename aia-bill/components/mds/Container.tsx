"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "stacked";
  header?: React.ReactNode;
}

export function Container({
  className,
  variant = "default",
  header,
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "bg-white border border-border-default",
        variant === "default" && "rounded-md",
        variant === "stacked" && "rounded-none first:rounded-t-md last:rounded-b-md",
        className
      )}
      {...props}
    >
      {header && (
        <div className="border-b border-border-default min-h-[44px] flex items-center">
          {header}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
