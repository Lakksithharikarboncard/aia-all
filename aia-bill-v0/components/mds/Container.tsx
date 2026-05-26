"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat";
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
        "bg-white border",
        variant === "default" && "rounded-[2.5px] border-[#e2e3e5]",
        variant === "flat" && "rounded-[2.5px] border-transparent",
        className
      )}
      {...props}
    >
      {header && (
        <div className="border-b border-[#e2e3e5] min-h-[48px] flex items-center">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
