"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, Copy, ExternalLink, FileSignature, Link2, Upload, XCircle } from "lucide-react";
import { Button, Card, DateDisplay, Modal } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadForClaim } from "../../lib/upload-client";
import { createSigningLinkAction, recordSignedCopyAction, revokeSigningLinkAction } from "../../app/actions/client-signatures";

export interface ClientSignatureRow {
  id: string;
  method: "link" | "upload";
  status: "pending" | "signed" | "revoked" | "expired";
  recipientEmail: string | null;
  signerName: string | null;
  signerTitle: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  viewedAt: string | null;
  signedFileUrl: string | null;
  createdBy: string;
  createdAt: string;
}

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/20 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";
const labelClass = "block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200";

/** Client acceptance for a quotation or invoice: a one-time signing link, or a copy signed by hand. */
export function ClientSignaturePanel({
  documentType,
  documentId,
  signable,
  records,
  canSend,
  canRecord,
  defaultEmail,
}: {
  documentType: "quotation" | "invoice";
  documentId: string;
  /** The document is issued and can still be signed. */
  signable: boolean;
  records: ClientSignatureRow[];
  canSend: boolean;
  canRecord: boolean;
  defaultEmail?: string | null;
}) {
  const { t, locale } = useAdminLocale();
  const s = t.clientSigning;
  const router = useRouter();
  const signed = records.find((r) => r.status === "signed");
  const pending = records.find((r) => r.status === "pending");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [days, setDays] = React.useState(7);
  const [email, setEmail] = React.useState(defaultEmail ?? "");
  const [link, setLink] = React.useState<{ url: string; expiresAt: string } | null>(null);
  const [copy, setCopy] = React.useState({ signerName: "", signerTitle: "", signedAt: new Date().toISOString().slice(0, 10) });
  const [file, setFile] = React.useState<File | null>(null);
  const [reviewing, setReviewing] = React.useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      toast.error(errorMessage(error, t, s.errors.failed));
    } finally {
      setBusy(false);
    }
  };

  const createLink = () =>
    run(async () => {
      const result = await createSigningLinkAction(documentType, documentId, days, email.trim() || null);
      setLink(result);
      router.refresh();
    });

  const saveCopy = () =>
    run(async () => {
      if (!file) return;
      const uploaded = await uploadForClaim(file, { entityType: documentType, entityId: documentId });
      await recordSignedCopyAction(documentType, documentId, { ...copy, signerTitle: copy.signerTitle || null, fileUrl: uploaded.fileUrl, fileName: uploaded.fileName });
      toast.success(s.uploadSaved);
      setUploadOpen(false);
      setReviewing(false);
      setFile(null);
      router.refresh();
    });

  const statusTone: Record<ClientSignatureRow["status"], string> = {
    pending: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    signed: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    revoked: "bg-ink/5 text-slate-600 dark:text-slate-300",
    expired: "bg-ink/5 text-slate-600 dark:text-slate-300",
  };

  return (
    <Card className="space-y-4 p-5 dark:bg-surface-raised">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <FileSignature className="w-4 h-4" aria-hidden />
            {s.panelTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{signable || signed ? s.panelHint : s.notSignable}</p>
        </div>
        {!signed && signable && (
          <div className="flex flex-wrap gap-2">
            {canSend && (
              <Button type="button" size="sm" variant="outline" onClick={() => { setLink(null); setLinkOpen(true); }}>
                <Link2 className="w-3.5 h-3.5" aria-hidden />
                {s.createLink}
              </Button>
            )}
            {canRecord && (
              <Button type="button" size="sm" variant="outline" onClick={() => { setReviewing(false); setUploadOpen(true); }}>
                <Upload className="w-3.5 h-3.5" aria-hidden />
                {s.uploadCopy}
              </Button>
            )}
          </div>
        )}
      </div>

      {signed ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {s.signedSummary.replace("{name}", [signed.signerName, signed.signerTitle].filter(Boolean).join(locale === "ar" ? "، " : ", ")).replace("{date}", "")}
            <DateDisplay date={signed.signedAt ?? signed.createdAt} locale={locale} />
            <span className="ms-2 text-xs opacity-80">· {s.methods[signed.method]}</span>
          </span>
          {signed.signedFileUrl && (
            <a href={signed.signedFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold underline">
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              {s.viewCopy}
            </a>
          )}
        </div>
      ) : pending ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <Clock className="w-4 h-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {s.statuses.pending}
            <span className="ms-2 text-xs opacity-80">
              · {pending.viewedAt ? s.opened : s.notOpened} · {s.expires.replace("{date}", "")}
              <DateDisplay date={pending.expiresAt ?? pending.createdAt} locale={locale} />
              {pending.recipientEmail ? <> · <bdi dir="ltr">{pending.recipientEmail}</bdi></> : null}
            </span>
          </span>
          {canSend && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => run(async () => { await revokeSigningLinkAction(pending.id); toast.success(s.revoked); router.refresh(); })}>
              <XCircle className="w-3.5 h-3.5" aria-hidden />
              {s.revoke}
            </Button>
          )}
        </div>
      ) : null}

      {records.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">{s.history}</summary>
          <ul className="mt-2 space-y-1.5">
            {records.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600 dark:text-slate-400">
                <DateDisplay date={r.createdAt} locale={locale} />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone[r.status]}`}>{s.statuses[r.status]}</span>
                <span>{s.methods[r.method]}</span>
                <span>· {s.by.replace("{name}", r.createdBy)}</span>
                {r.signerName && <span>· {r.signerName}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {linkOpen && (
        <Modal isOpen onClose={() => setLinkOpen(false)} title={link ? s.linkReady : s.createLink} closeLabel={s.cancel} className="max-w-lg">
          {link ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input readOnly dir="ltr" value={link.url} className={`${fieldClass} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} aria-label={s.linkReady} />
                <Button type="button" size="sm" onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success(s.copied))}>
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                  {s.copy}
                </Button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {s.linkNotice.replace("{date}", new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date(link.expiresAt)))}
              </p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{s.linkOnce}</p>
              <div className="flex justify-end gap-2">
                <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-ink/5 dark:text-accent">
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                  {s.openLink}
                </a>
                <Button type="button" size="sm" variant="outline" onClick={() => setLinkOpen(false)}>{s.cancel}</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); createLink(); }} className="space-y-3">
              <label className={labelClass}>
                {s.linkDays}
                <input type="number" min={1} max={30} required dir="ltr" className={fieldClass} value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </label>
              <label className={labelClass}>
                {s.recipientEmail}
                <input type="email" dir="ltr" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>{s.cancel}</Button>
                <Button type="submit" size="sm" disabled={busy}>{s.createLink}</Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {uploadOpen && (
        <Modal isOpen onClose={() => setUploadOpen(false)} title={reviewing ? s.reviewTitle : s.uploadCopy} closeLabel={s.cancel} className="max-w-lg">
          {reviewing ? (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <dt className="text-slate-500">{s.signerName}</dt>
                <dd className="font-medium">{copy.signerName}</dd>
                {copy.signerTitle && (<><dt className="text-slate-500">{s.signerTitle}</dt><dd>{copy.signerTitle}</dd></>)}
                <dt className="text-slate-500">{s.signedDate}</dt>
                <dd><DateDisplay date={copy.signedAt} locale={locale} /></dd>
                <dt className="text-slate-500">{s.file}</dt>
                <dd className="truncate"><bdi dir="ltr">{file?.name}</bdi></dd>
              </dl>
              {documentType === "quotation" && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">{s.uploadWarningQuotation}</p>}
              <div className="flex justify-between gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setReviewing(false)}>{s.back}</Button>
                <Button type="button" size="sm" disabled={busy} onClick={saveCopy}>{s.confirm}</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (file && copy.signerName.trim()) setReviewing(true); }} className="space-y-3">
              <label className={labelClass}>
                {s.signerName}
                <input required maxLength={120} className={fieldClass} value={copy.signerName} onChange={(e) => setCopy({ ...copy, signerName: e.target.value })} />
              </label>
              <label className={labelClass}>
                {s.signerTitle}
                <input maxLength={120} className={fieldClass} value={copy.signerTitle} onChange={(e) => setCopy({ ...copy, signerTitle: e.target.value })} />
              </label>
              <label className={labelClass}>
                {s.signedDate}
                <input type="date" required dir="ltr" max={new Date().toISOString().slice(0, 10)} className={fieldClass} value={copy.signedAt} onChange={(e) => setCopy({ ...copy, signedAt: e.target.value })} />
              </label>
              <label className={labelClass}>
                {s.file}
                <input type="file" required accept="application/pdf,image/png,image/jpeg,image/webp" className={fieldClass} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setUploadOpen(false)}>{s.cancel}</Button>
                <Button type="submit" size="sm">{s.saveUpload}</Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </Card>
  );
}
