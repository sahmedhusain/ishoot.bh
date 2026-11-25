"use client";

import * as React from "react";
import { AlertTriangle, ShieldAlert, Loader2, X } from "lucide-react";
import { Button } from "@platform/ui";
import { useCopy } from "./CopyProvider";

export interface CriticalActionModalProps {
  open: boolean;
  title?: string;
  description: string;
  impactDetails?: string[];
  requiredConfirmationText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerLevel?: "critical" | "warning";
  busy?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function CriticalActionModal({
  open,
  title,
  description,
  impactDetails = [],
  requiredConfirmationText,
  confirmLabel,
  cancelLabel,
  dangerLevel = "critical",
  busy = false,
  onConfirm,
  onCancel,
}: CriticalActionModalProps) {
  const { copy } = useCopy();
  const cm = copy.criticalModal;
  const modalTitle = title || cm.title;
  const confirmBtnLabel = confirmLabel || cm.confirm;
  const cancelBtnLabel = cancelLabel || cm.cancel;
  const [typedText, setTypedText] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setTypedText("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const requiresMatch = Boolean(requiredConfirmationText && requiredConfirmationText.trim().length > 0);
  const isMatch = !requiresMatch || typedText.trim().toLowerCase() === requiredConfirmationText!.trim().toLowerCase();

  const isCritical = dangerLevel === "critical";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="critical-action-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-outline-variant bg-surface text-ink shadow-2xl"
      >
        <div
          className={`flex items-center justify-between border-b px-4 py-3 text-white ${
            isCritical
              ? "bg-rose-900 dark:bg-rose-950 border-rose-800"
              : "bg-amber-800 dark:bg-amber-950 border-amber-700"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isCritical ? (
              <ShieldAlert className="h-4 w-4 text-rose-200 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-200 shrink-0" />
            )}
            <h2 id="critical-action-title" className="font-bold tracking-wide text-sm truncate">
              {modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1 text-white/75 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
            aria-label={copy.shared.ui.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-ink text-xs leading-relaxed">{description}</p>

          {impactDetails.length > 0 && (
            <div className="rounded-md p-3 border border-outline-variant bg-surface-raised space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                OPERATIONAL IMPACT & SYSTEM ATTENTION:
              </div>
              <ul className="list-disc list-inside space-y-1 text-ink-muted text-[11px]">
                {impactDetails.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requiresMatch && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] text-ink-muted">
                To confirm this operation, please type{" "}
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">
                  {requiredConfirmationText}
                </span>{" "}
                below:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                disabled={busy}
                placeholder={`Type "${requiredConfirmationText}" to proceed`}
                className="it-field-sunken w-full font-mono text-xs font-semibold focus:border-rose-500"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant bg-surface-raised px-4 py-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelBtnLabel}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={!isMatch || busy}
            className={`flex items-center gap-1.5 ${
              isCritical
                ? "bg-rose-700 hover:bg-rose-800 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{confirmBtnLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
