"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Clock, PenLine, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type {
  SigningState,
  SignableDocument,
} from "@platform/database/queries/document-signing";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ContentImage } from "../shared/ContentImage";
import {
  requestInvoiceApprovalAction,
  signDocumentAction,
} from "../../app/actions/signing";
import { SignatureCanvas } from "../shared/SignatureCanvas";

interface SigningPanelProps {
  type: SignableDocument;
  id: string;
  state: SigningState;
  canSign: boolean;
  canRequestApproval?: boolean;
  /** The current user has an approved signature to sign with. */
  hasSignature: boolean;
}

/** Approval → sign & stamp → send: where this document stands and the next step. */
export function SigningPanel({
  type,
  id,
  state,
  canSign,
  canRequestApproval,
  hasSignature,
}: SigningPanelProps) {
  const { t, locale } = useAdminLocale();
  const s = t.signing;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [drawn, setDrawn] = React.useState<string | null>(null);
  // Some documents must be signed on the spot: the signer draws now instead of applying a saved signature.
  const live = state.mode === "live";

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(done);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, s.failed));
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    {
      key: "approved",
      label: type === "receipt" ? s.recorded : s.approved,
      done: state.approved,
    },
    { key: "signed", label: s.signedStamped, done: state.signed },
    { key: "send", label: s.readyToSend, done: state.signed },
  ];

  return (
    <section className="rounded-3xl border border-ink/10 bg-surface p-5 space-y-4">
      <h3 className="text-sm font-bold text-ink flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-accent" />
        {s.title}
      </h3>
      <ol className="flex items-center gap-2 text-[11px]">
        {steps.map((step, i) => (
          <li key={step.key} className="flex items-center gap-2 flex-1">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${step.done ? "bg-accent text-white" : "bg-ink/10 text-ink-muted"}`}
            >
              {i + 1}
            </span>
            <span
              className={
                step.done ? "text-ink font-semibold" : "text-ink-muted"
              }
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={`flex-1 h-px ${step.done ? "bg-accent" : "bg-ink/10"}`}
              />
            )}
          </li>
        ))}
      </ol>

      {state.signed ? (
        <div className="flex items-center gap-3 text-xs">
          <div className="h-12 w-32 rounded-xl border border-ink/10 bg-white flex items-center justify-center overflow-hidden">
            {state.signatureUrl && (
              <ContentImage
                src={state.signatureUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          <div>
            <div className="font-semibold text-ink flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
              {formatMessage(s.signedBy, { name: state.signedBy?.name ?? "" })}
            </div>
            <div className="text-ink-muted">
              {state.signedAt
                ? new Date(state.signedAt).toLocaleString(
                    locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB",
                  )
                : ""}
            </div>
          </div>
        </div>
      ) : !state.approved ? (
        <div className="space-y-2 text-xs text-ink-muted">
          <p className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {state.approvalStatus === "submitted"
              ? s.awaitingApproval
              : s.needsApproval}
          </p>
          {type === "invoice" &&
            canRequestApproval &&
            state.approvalStatus !== "submitted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => requestInvoiceApprovalAction(id),
                    s.approvalRequested,
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white font-semibold disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                {s.requestApproval}
              </button>
            )}
        </div>
      ) : canSign && live ? (
        <div className="space-y-2">
          <p className="text-[11px] text-ink-muted">{s.signLiveHint}</p>
          <SignatureCanvas
            onChange={setDrawn}
            clearLabel={t.signaturePad.clear}
            hint={t.signaturePad.hint}
          />
          <button
            type="button"
            disabled={busy || !drawn}
            onClick={() =>
              run(() => signDocumentAction(type, id, drawn!), s.signedToast)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-xs font-semibold disabled:opacity-60"
          >
            <PenLine className="w-3.5 h-3.5" />
            {s.signAndStamp}
          </button>
        </div>
      ) : canSign ? (
        hasSignature ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => signDocumentAction(type, id), s.signedToast)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-xs font-semibold disabled:opacity-60"
          >
            <PenLine className="w-3.5 h-3.5" />
            {s.signAndStamp}
          </button>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {s.noSignature}{" "}
            <Link href={ROUTES.profile()} className="font-semibold underline">
              {s.openProfile}
            </Link>
          </p>
        )
      ) : (
        <p className="text-xs text-ink-muted">{s.waitingForSigner}</p>
      )}
    </section>
  );
}
