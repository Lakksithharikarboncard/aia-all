"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

interface ReasonModalProps {
  title: string;
  description?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  required?: boolean;
}

export function ReasonModal({
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  required = true,
}: ReasonModalProps) {
  const [reason, setReason] = React.useState("");
  const [open, setOpen] = React.useState(true);

  const handleConfirm = () => {
    if (!required || reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
      setOpen(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setOpen(false);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black/40 transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white p-6 outline-1 outline-border-default shadow-popover transition-all duration-150 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold text-text-heading mb-1">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-sm text-text-secondary mb-4">
              {description}
            </Dialog.Description>
          )}
          <textarea
            autoFocus
            rows={3}
            placeholder="Enter reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-border-default rounded-[4px] text-sm focus:border-action-primary focus:ring-2 focus:ring-action-primary/30 outline-none resize-none text-text-body bg-white"
          />
          <div className="flex gap-3 mt-4 justify-end">
            <Dialog.Close className="inline-flex items-center justify-center rounded-[4px] font-medium transition-colors h-8 px-3 text-sm border border-border-default bg-white hover:bg-surface-hover text-text-body">
              Cancel
            </Dialog.Close>
            <Button
              size="sm"
              variant={confirmVariant}
              disabled={required && !reason.trim()}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
