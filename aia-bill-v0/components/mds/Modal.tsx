"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
  className?: string;
}

const widthClasses = {
  sm: "max-w-[400px]",
  md: "max-w-[480px]",
  lg: "max-w-[600px]",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "md",
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full flex flex-col max-h-[85vh] p-0",
          widthClasses[width],
          className
        )}
      >
        <DialogHeader className="px-5 py-4 border-b border-border-divider">
          <DialogTitle className="text-sm font-semibold text-text-heading">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-text-secondary mt-0.5">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-divider shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
