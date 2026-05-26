"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReasonModalProps {
  title: string;
  description?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive";
  required?: boolean;
}

export function ReasonModal({
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel = "Confirm",
  confirmVariant = "default",
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-heading">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-text-secondary">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <textarea
          autoFocus
          rows={3}
          placeholder="Enter reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-border-default rounded-[2.5px] text-sm focus:border-action-primary focus:ring-2 focus:ring-action-primary/30 outline-none resize-none text-text-body bg-white"
        />
        <DialogFooter className="flex gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={confirmVariant}
            disabled={required && !reason.trim()}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
