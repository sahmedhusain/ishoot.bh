"use client";

import * as React from "react";
import { Globe, AlertTriangle, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@platform/ui";
import { useCopy } from "./CopyProvider";

export interface DomainSaveConfirmModalProps {
  open: boolean;
  currentWebsite: string;
  newWebsite: string;
  currentAdmin: string;
  newAdmin: string;
  currentStore?: string;
  newStore?: string;
  busy: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function DomainSaveConfirmModal({
  open,
  currentWebsite,
  newWebsite,
  currentAdmin,
  newAdmin,
  currentStore = "",
  newStore = "",
  busy,
  onConfirm,
  onCancel,
}: DomainSaveConfirmModalProps) {
  const { copy } = useCopy();
  const dcm = copy.domainConfirmModal;
  const [typedVerification, setTypedVerification] = React.useState("");
  const [acknowledgedDns, setAcknowledgedDns] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTypedVerification("");
      setAcknowledgedDns(false);
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

  const websiteChanged = (currentWebsite || "").trim() !== (newWebsite || "").trim();
  const adminChanged = (currentAdmin || "").trim() !== (newAdmin || "").trim();
  const storeChanged = (currentStore || "").trim() !== (newStore || "").trim();

  const isMajorChange = adminChanged || websiteChanged || storeChanged;
  const targetRequiredWord = "CONFIRM";
  const isTypedCorrect = !isMajorChange || typedVerification.trim().toUpperCase() === targetRequiredWord;
  const canSubmit = isTypedCorrect && acknowledgedDns && !busy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-outline-variant bg-surface text-ink shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-amber-700 bg-amber-800 dark:bg-amber-950 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-amber-200 shrink-0" />
            <h2 id="domain-confirm-title" className="font-bold tracking-wide text-sm">
              {dcm.title}
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
          <p className="text-xs text-ink leading-relaxed">
            {dcm.instructions}
          </p>

          <div className="space-y-3 rounded-md border border-outline-variant p-3 bg-surface-raised font-mono text-xs">
            <div className="space-y-1">
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-ink-muted">WEBSITE PUBLIC DOMAIN:</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded px-2 py-1 border border-outline-variant bg-surface text-ink-muted">
                  {currentWebsite || "(none configured)"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className={`rounded px-2 py-1 border font-bold ${websiteChanged ? "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-outline-variant bg-surface text-ink"}`}>
                  {newWebsite || "(cleared / default)"}
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-2.5 border-t border-outline-variant">
              <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-ink-muted">ADMIN PORTAL DOMAIN:</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded px-2 py-1 border border-outline-variant bg-surface text-ink-muted">
                  {currentAdmin || "(none configured)"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className={`rounded px-2 py-1 border font-bold ${adminChanged ? "border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300" : "border-outline-variant bg-surface text-ink"}`}>
                  {newAdmin || "(cleared / default)"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-md p-3 border border-amber-500/40 bg-amber-500/10 space-y-1.5 text-ink text-xs">
            <div className="font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{dcm.propagationNotice}</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={acknowledgedDns}
                onChange={(e) => setAcknowledgedDns(e.target.checked)}
                disabled={busy}
                className="mt-0.5 size-4"
              />
              <span className="text-ink leading-relaxed">
                {dcm.instructions}
              </span>
            </label>

            {isMajorChange && (
              <div className="space-y-1">
                <label className="block text-[11px] text-ink-muted">
                  {dcm.typeConfirm}
                </label>
                <input
                  type="text"
                  value={typedVerification}
                  onChange={(e) => setTypedVerification(e.target.value)}
                  placeholder="CONFIRM"
                  disabled={busy}
                  className="it-field-sunken w-full font-mono text-xs font-bold focus:border-rose-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-outline-variant bg-surface-raised px-4 py-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={busy}
          >
            {dcm.cancelBtn}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={!canSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{dcm.confirmBtn}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
