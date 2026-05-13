"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// MDS Modal: Base UI Dialog wrapper
// 480px default width, 48px header, dark scrim 40%, focus trap
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
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-surface-mask transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full bg-white rounded-[3px] border border-border-default",
            "flex flex-col max-h-[85vh]",
            "transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            widthClasses[width],
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-0 min-h-[48px] border-b border-border-divider shrink-0">
            <div>
              <Dialog.Title className="text-sm font-semibold text-text-heading">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs text-text-secondary mt-0.5">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="flex items-center justify-center w-7 h-7 rounded-sm text-text-secondary hover:text-text-heading hover:bg-surface-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-divider shrink-0">
              {footer}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
