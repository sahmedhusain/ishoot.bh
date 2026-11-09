"use client";

import * as React from "react";
import { Globe, AlertTriangle, CheckCircle2, Loader2, X, ArrowRight } from "lucide-react";
import { Button } from "@platform/ui";
import { useCopy } from "./CopyProvider";

export interface DomainSaveConfirmModalProps {
  open: boolean;
  currentWebsite: string;
  newWebsite: string;
  currentAdmin: string;
  newAdmin: string;
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
  busy,
  onConfirm,
  onCancel,
}: DomainSaveConfirmModalProps) {
  const { copy } = useCopy();
  const dcm = copy.domainConfirmModal;
  const [typedVerification, setTypedVerification] = React.useState("");
  const [acknowledgedDns, setAcknowledgedDns] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTypedVerification("");
      setAcknowledgedDns(false);
    }
  }, [open]);

  if (!open) return null;

  const websiteChanged = (currentWebsite || "").trim() !== (newWebsite || "").trim();
  const adminChanged = (currentAdmin || "").trim() !== (newAdmin || "").trim();

  // If changing admin domain, require typing "CONFIRM" or the new domain name
  const isMajorChange = adminChanged || websiteChanged;
  const targetRequiredWord = "CONFIRM";
  const isTypedCorrect = !isMajorChange || typedVerification.trim().toUpperCase() === targetRequiredWord;
  const canSubmit = isTypedCorrect && acknowledgedDns && !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-confirm-title"
        className="it-card w-full max-w-xl overflow-hidden border-2 border-slate-700 bg-surface shadow-2xl font-mono text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-800 bg-amber-950 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-400" />
            <h2 id="domain-confirm-title" className="font-bold uppercase tracking-wider text-sm">
              {dcm.title}
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

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-ink font-sans leading-relaxed">
            {dcm.instructions}
          </p>

          {/* Change Comparison Grid */}
          <div className="space-y-2 border border-outline-variant p-3 bg-slate-50 dark:bg-slate-900/60">
            {/* Website Domain */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase text-ink-muted">WEBSITE PUBLIC DOMAIN:</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="p-1 border border-outline-variant bg-surface text-ink-muted">
                  {currentWebsite || "(none configured)"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className={`p-1 border font-bold ${websiteChanged ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-outline-variant bg-surface text-ink"}`}>
                  {newWebsite || "(cleared / default)"}
                </span>
              </div>
            </div>

            {/* Admin Domain */}
            <div className="space-y-1 pt-2 border-t border-outline-variant">
              <div className="text-[10px] font-bold uppercase text-ink-muted">ADMIN PORTAL DOMAIN:</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="p-1 border border-outline-variant bg-surface text-ink-muted">
                  {currentAdmin || "(none configured)"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className={`p-1 border font-bold ${adminChanged ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-outline-variant bg-surface text-ink"}`}>
                  {newAdmin || "(cleared / default)"}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Impact Warning */}
          <div className="p-3 border border-amber-600/40 bg-amber-500/10 space-y-1.5 text-ink text-[11px] font-sans">
            <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{dcm.propagationNotice}</span>
            </div>
          </div>

          {/* Verification Guard */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2 cursor-pointer font-sans text-xs">
              <input
                type="checkbox"
                checked={acknowledgedDns}
                onChange={(e) => setAcknowledgedDns(e.target.checked)}
                disabled={busy}
                className="mt-0.5 size-4"
              />
              <span className="text-ink">
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
                  className="w-full border-2 border-outline-variant focus:border-rose-500 bg-surface px-3 py-1.5 text-xs font-mono font-bold text-ink outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant bg-slate-100 dark:bg-slate-900/80 px-4 py-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            className="font-mono text-xs"
          >
            {dcm.cancelBtn}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void onConfirm()}
            disabled={!canSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs flex items-center gap-1.5"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{dcm.confirmBtn}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
