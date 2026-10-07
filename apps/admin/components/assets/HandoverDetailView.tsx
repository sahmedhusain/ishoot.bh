"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle2, CircleX, Download, PenLine, Printer, X, XCircle } from "lucide-react";
import { Button, Input, formatCurrencyValue, formatDate } from "@ishoot/ui";
import type { AssetHandoverDetail } from "@ishoot/database";
import { ROUTES } from "../../constants/routes";
import { cancelAssetHandoverAction, signAssetHandoverAction, signAssetHandoverInPersonAction } from "../../app/actions/assets";
import { decideApprovalAction } from "../../app/actions/approvals";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { printPdfUrl } from "../../lib/pdf-print";
import { SignatureCanvas } from "../shared/SignatureCanvas";
import { ContentImage } from "../shared/ContentImage";

const STATUS_STYLE: Record<string, string> = {
  awaiting_employee: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending_approval: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-ink/10 text-ink-muted",
};

/** One handover: what was checked, its signatures and approvals, and the actions open to the viewer. */
export function HandoverDetailView({ handover, isEmployee, canEdit, approvalId }: { handover: AssetHandoverDetail; isEmployee: boolean; canEdit: boolean; approvalId: string | null }) {
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const h = a.handover;
  const router = useRouter();
  const isAr = locale === "ar";
  const [signing, setSigning] = React.useState(false);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [signer, setSigner] = React.useState(isAr ? handover.employee.name_ar : handover.employee.name_en);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const pdf = `/api/assets/handovers/${handover.id}/pdf?locale=${locale}`;
  const open = handover.status === "awaiting_employee" || handover.status === "pending_approval";

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      setSigning(false);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.failed));
    } finally {
      setBusy(false);
    }
  };

  const signatureBox = (title: string, name?: string, image?: string, at?: string, pending?: string) => (
    <div className="rounded-2xl border border-ink/10 p-3 space-y-1">
      <div className="text-[11px] text-ink-muted">{title}</div>
      <div className="flex h-16 items-center justify-center rounded-xl bg-white">
        {image ? <ContentImage src={image} alt={name ?? title} width={180} height={60} className="max-h-14 w-auto object-contain" /> : <span className="text-[11px] text-slate-400">{pending ?? "—"}</span>}
      </div>
      <div className="text-xs font-semibold text-ink">{name || "—"}</div>
      {at ? <div className="text-[11px] text-ink-muted">{formatDate(at, locale)}</div> : null}
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={canEdit ? ROUTES.assets.detail(handover.asset.id) : ROUTES.profile()} aria-label={t.actions.back} className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /></Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">{handover.kind === "issue" ? h.issueDocTitle : h.returnDocTitle}</h1>
            <p className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-2">
              <bdi dir="ltr">{handover.reference}</bdi>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[handover.status]}`}>{a.handoverStatuses[handover.status as keyof typeof a.handoverStatuses]}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${pdf}&download=true`} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5"><Download className="h-3.5 w-3.5" />{t.pdfActions.download}</a>
          <button type="button" onClick={() => printPdfUrl(pdf).catch(() => toast.error(t.pdfActions.failed))} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5"><Printer className="h-3.5 w-3.5" />{t.pdfActions.print}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 space-y-5">
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              [a.fields.name, `${handover.asset.asset_tag} · ${handover.asset.name}`],
              [a.fields.category, isAr ? handover.asset.category.name_ar : handover.asset.category.name_en],
              [a.fields.serial, handover.asset.serial_number],
              [h.employee, `${isAr ? handover.employee.name_ar : handover.employee.name_en} (${handover.employee.employee_number})`],
              [h.date, formatDate(handover.handover_date, locale)],
              [h.condition, a.conditions[handover.condition as keyof typeof a.conditions]],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] text-ink-muted mb-0.5">{label}</dt>
                <dd className="font-medium text-ink">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {handover.checklist.length ? (
            <div>
              <h2 className="mb-2 text-sm font-bold text-ink">{h.checklist}</h2>
              <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10">
                {handover.checklist.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 px-3 py-2 text-sm">
                    {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
                    <span className="text-ink">{isAr ? c.labelAr : c.labelEn}{c.note ? <span className="block text-[11px] text-ink-muted">{c.note}</span> : null}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {handover.accessories ? <div><dt className="text-[11px] text-ink-muted">{h.accessories}</dt><dd className="text-ink">{handover.accessories}</dd></div> : null}
            {handover.damage_notes ? <div><dt className="text-[11px] text-ink-muted">{h.damage}</dt><dd className="text-ink">{handover.damage_notes}</dd></div> : null}
            {handover.damage_charge !== undefined ? (
              <div>
                <dt className="text-[11px] text-ink-muted">{h.charge}</dt>
                <dd className="font-semibold text-rose-600 dark:text-rose-300">{formatCurrencyValue(handover.damage_charge, handover.asset.currency, isAr)}{handover.deduct_from_salary ? ` · ${h.deductedFromSalary}` : ""}</dd>
              </div>
            ) : null}
            {handover.notes ? <div><dt className="text-[11px] text-ink-muted">{h.notes}</dt><dd className="text-ink">{handover.notes}</dd></div> : null}
            {handover.decision_notes ? <div><dt className="text-[11px] text-ink-muted">{h.decisionNotes}</dt><dd className="text-ink">{handover.decision_notes}</dd></div> : null}
          </dl>
        </section>

        <section className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 space-y-3">
          <h2 className="text-sm font-bold text-ink">{h.signatures}</h2>
          {signatureBox(h.issuedBy, handover.created_by, handover.creator_signature_url, handover.created_at)}
          {signatureBox(handover.kind === "issue" ? h.receivedBy : h.returnedBy, handover.employee_signer_name, handover.employee_signature, handover.employee_signed_at, h.awaitingSignature)}
          {handover.signed_in_person ? <p className="text-[11px] text-ink-muted">{h.signedInPersonNote}</p> : null}
          {handover.approval?.decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 rounded-2xl border border-ink/10 p-3">
              {d.decision === "approved" ? <Check className="mt-0.5 h-4 w-4 text-emerald-600" /> : <CircleX className="mt-0.5 h-4 w-4 text-rose-500" />}
              <div className="text-xs">
                <div className="font-semibold text-ink">{d.name}</div>
                <div className="text-ink-muted">{(d.decision === "approved" ? h.approvedOn : h.rejectedOn).replace("{date}", formatDate(d.at, locale))}</div>
                {d.note ? <div className="text-ink-muted">{d.note}</div> : null}
              </div>
            </div>
          ))}
          {handover.status === "pending_approval" ? <p className="text-[11px] text-ink-muted">{h.waitingApprovers}</p> : null}
        </section>
      </div>

      {handover.status === "awaiting_employee" && (isEmployee || canEdit) ? (
        <section className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><PenLine className="h-4 w-4 text-accent" />{isEmployee ? h.signTitle : h.signInPerson}</h2>
          <p className="text-xs text-ink-muted">{handover.kind === "issue" ? h.acknowledgeIssue : h.acknowledgeReturn}</p>
          {signing ? (
            <>
              <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder={h.signerName} />
              <SignatureCanvas onChange={setSignature} clearLabel={h.clear} hint={h.drawHere} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setSigning(false)}>{t.actions.cancel}</Button>
                <Button size="sm" disabled={busy || !signature || !signer.trim()} onClick={() => run(() => (isEmployee ? signAssetHandoverAction : signAssetHandoverInPersonAction)(handover.id, { signature: signature!, signer_name: signer }), h.signed)}>{h.signSubmit}</Button>
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => setSigning(true)}>{h.signNow}</Button>
          )}
        </section>
      ) : null}

      {approvalId ? (
        <section className="rounded-3xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-3">
          <h2 className="text-sm font-bold text-ink">{h.decideTitle}</h2>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={h.decisionPlaceholder} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={busy} className="text-rose-600" onClick={() => run(() => decideApprovalAction(approvalId, "rejected", reason || undefined), h.rejected)}>{h.reject}</Button>
            <Button size="sm" disabled={busy} onClick={() => run(() => decideApprovalAction(approvalId, "approved", reason || undefined), h.approved)}>{h.approve}</Button>
          </div>
        </section>
      ) : null}

      {open && canEdit ? (
        <div className="flex justify-end">
          <button type="button" disabled={busy} onClick={() => run(() => cancelAssetHandoverAction(handover.id), h.cancelled)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><X className="h-3.5 w-3.5" />{h.cancel}</button>
        </div>
      ) : null}
    </div>
  );
}
