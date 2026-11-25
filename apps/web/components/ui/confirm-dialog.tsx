"use client";

import * as React from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { cn } from "./utils";
import { useUiCopy } from "./copy/use-ui-copy";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  dir?: "ltr" | "rtl";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  dir,
}: ConfirmDialogProps) {
  const copy = useUiCopy();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const Icon = destructive ? AlertTriangle : HelpCircle;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      data-dialog-scope="confirm"
      dir={dir}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant shadow-m3-4 p-0 backdrop:bg-black/60"
      data-lenis-prevent
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
              destructive
                ? "bg-m3-error-container text-m3-on-error-container"
                : "bg-m3-secondary-container text-m3-on-secondary-container",
            )}
          >
            <Icon aria-hidden="true" className="w-5 h-5" />
          </div>
          <button
            type="button"
            disabled={busy}
            aria-label={cancelLabel || copy.close}
            onClick={onClose}
            className="w-11 h-11 -mt-1.5 -me-1.5 rounded-full flex items-center justify-center text-m3-on-surface-variant hover:bg-m3-on-surface/[0.08] transition-colors cursor-pointer"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 id={titleId} className="text-xl font-display font-bold text-m3-on-surface leading-snug">
            {title}
          </h2>
          {description && (
            <p id={descId} className="text-sm text-m3-on-surface-variant leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-11 px-4 rounded-full text-sm font-semibold text-m3-primary hover:bg-m3-primary/[0.08] transition-colors cursor-pointer disabled:opacity-[0.38]"
          >
            {cancelLabel || copy.cancel}
          </button>
          <button
            type="button"
            disabled={busy}
            autoFocus
            onClick={() => void onConfirm()}
            className={cn(
              "min-h-11 px-5 rounded-full text-sm font-semibold transition-colors shadow-m3-1 cursor-pointer disabled:opacity-[0.38]",
              destructive
                ? "bg-m3-error text-m3-on-error hover:brightness-95"
                : "bg-m3-primary text-m3-on-primary hover:brightness-95",
            )}
          >
            {confirmLabel || copy.confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
