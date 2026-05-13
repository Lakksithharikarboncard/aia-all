"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FrameProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "ghost";
}

const Frame = React.forwardRef<HTMLDivElement, FrameProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col",
          variant === "default" &&
            "rounded-[4px] border border-border-default bg-white shadow-container",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Frame.displayName = "Frame";

const FramePanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
FramePanel.displayName = "FramePanel";

export { Frame, FramePanel };
