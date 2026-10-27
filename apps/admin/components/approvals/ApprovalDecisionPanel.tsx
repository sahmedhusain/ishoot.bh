"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PenLine, XCircle } from "lucide-react";
import { Button, Textarea } from "@platform/ui";
import { decideApprovalAction } from "../../app/actions/approvals";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { SignatureCanvas } from "../shared/SignatureCanvas";

/**
 * Approve or reject a request on the record's own page. When the document must be signed on the spot, the
 * approver draws their signature here; a saved signature is never applied by pressing a button.
 */
export function ApprovalDecisionPanel({
  approvalId,
  requiresSignature = false,
  signerName,
  onDecided,
}: {
  approvalId: string;
  requiresSignature?: boolean;
  signerName?: string;
  onDecided?: (status: string) => void;
}) {
  const { t } = useAdminLocale();
  const a = t.approvals;
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [signature, setSignature] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"approved" | "rejected" | null>(null);

  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !reason.trim())
      return toast.error(a.item.reasonRequired);
    if (decision === "approved" && requiresSignature && !signature)
      return toast.error(a.item.signatureRequired);
    setBusy(decision);
    try {
      const result = await decideApprovalAction(
        approvalId,
        decision,
        reason.trim() || undefined,
        decision === "approved" && signature ? signature : undefined,
      );
      toast.success(
        decision === "approved"
          ? result.status === "pending"
            ? a.item.movedToNextStep
            : a.toast.approved
          : a.toast.rejected,
      );
      onDecided?.(result.status);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.toast.error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-labelledby="decide-title"
      className="rounded-3xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-4"
     data-page-section>
      <h2 id="decide-title" className="text-sm font-bold text-ink">
        {a.item.decideTitle}
      </h2>
      <label className="block text-xs font-medium text-ink">
        <span className="mb-1 block">{a.item.commentLabel}</span>
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={a.rejectReasonPlaceholder}
        />
      </label>
      {requiresSignature ? (
        <div className="space-y-2 rounded-2xl border border-outline-variant bg-surface-raised p-3 dark:bg-surface-raised">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <PenLine className="h-4 w-4 text-accent" aria-hidden />
            {a.item.signNow}
          </div>
          <p className="text-[11px] text-ink-muted">
            {formatMessage(a.item.signNowHint, { name: signerName ?? "" })}
          </p>
          <SignatureCanvas
            onChange={setSignature}
            clearLabel={t.signaturePad.clear}
            hint={t.signaturePad.hint}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => decide("rejected")}
          className="gap-1.5 text-rose-600"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          {a.reject}
        </Button>
        <Button
          size="sm"
          disabled={busy !== null || (requiresSignature && !signature)}
          onClick={() => decide("approved")}
          className="gap-1.5 bg-primary text-primary-foreground"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {requiresSignature ? a.item.signAndApprove : a.approve}
        </Button>
      </div>
    </section>
  );
}
