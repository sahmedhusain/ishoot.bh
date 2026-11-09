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

  if (!open) return null;

  const requiresMatch = Boolean(requiredConfirmationText && requiredConfirmationText.trim().length > 0);
  const isMatch = !requiresMatch || typedText.trim().toLowerCase() === requiredConfirmationText!.trim().toLowerCase();

  const isCritical = dangerLevel === "critical";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="critical-action-title"
        className="it-card w-full max-w-lg overflow-hidden border-2 border-slate-700 bg-surface shadow-2xl font-mono text-xs"
      >

        <div
          className={`flex items-center justify-between border-b px-4 py-3 text-white ${
            isCritical ? "bg-rose-950 border-rose-800" : "bg-amber-950 border-amber-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {isCritical ? (
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
            <h2 id="critical-action-title" className="font-bold uppercase tracking-wider text-sm">
              {modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-slate-400 hover:text-white"
            aria-label={copy.shared.ui.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-ink text-xs leading-relaxed font-sans">{description}</p>

          {impactDetails.length > 0 && (
            <div className="p-3 border border-outline-variant bg-slate-50 dark:bg-slate-900/60 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                OPERATIONAL IMPACT & SYSTEM ATTENTION:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px] font-sans">
                {impactDetails.map((item, idx) => (
                  <li key={idx} className="leading-tight">
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
                <span className="font-bold text-rose-600 dark:text-rose-400 select-all">
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
                className="w-full border-2 border-outline-variant focus:border-rose-500 bg-surface px-3 py-1.5 text-xs font-mono font-semibold text-ink outline-none"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant bg-slate-100 dark:bg-slate-900/80 px-4 py-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            className="font-mono text-xs"
          >
            {cancelBtnLabel}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={!isMatch || busy}
            className={`font-mono text-xs flex items-center gap-1.5 ${
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
