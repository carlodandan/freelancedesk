import React, { useEffect } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-ledger)] rounded-lg shadow-xl overflow-hidden z-10 flex flex-col p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              variant === "danger"
                ? "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
                : "bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB]"
            }`}
          >
            {variant === "danger" ? (
              <AlertTriangle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
