"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Link2, Mail, MessageCircle, X } from "lucide-react";
import { Button, Select, formatDate } from "@platform/ui";
import {
  createHandoverSigningLinkAction,
  revokeHandoverSigningLinkAction,
} from "../../app/actions/signatures";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

export interface SigningLinkRow {
  id: string;
  status: "pending" | "signed" | "revoked" | "expired";
  recipientEmail: string | null;
  expiresAt: string;
  viewedAt: string | null;
  signedAt: string | null;
  signerName: string | null;
  createdAt: string;
}

/** Send the employee a one-time link to read and sign the handover on their own phone, like a client signing a quotation. */
export function HandoverSigningLinkPanel({
  handoverId,
  links,
  reference,
}: {
  handoverId: string;
  links: SigningLinkRow[];
  reference: string;
}) {
  const { t, locale } = useAdminLocale();
  const s = t.assets.signingLink;
  const router = useRouter();
  const [days, setDays] = React.useState(7);
  const [busy, setBusy] = React.useState(false);
  const [created, setCreated] = React.useState<{
    url: string;
    expiresAt: string;
    phone: string | null;
    email: string | null;
  } | null>(null);

  const create = async () => {
    setBusy(true);
    try {
      setCreated(await createHandoverSigningLinkAction(handoverId, days));
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, s.failed));
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (id: string) => {
    setBusy(true);
    try {
      await revokeHandoverSigningLinkAction(id);
      setCreated(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, s.failed));
    } finally {
      setBusy(false);
    }
  };
  const message = created
    ? formatMessage(s.message, { reference: reference, url: created.url })
    : "";
  const phone = created?.phone?.replace(/[^\d]/g, "");
  const tone: Record<SigningLinkRow["status"], string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    signed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    revoked: "bg-ink/5 text-ink-muted",
    expired: "bg-ink/5 text-ink-muted",
  };

  return (
    <section className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-3" data-page-section>
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <Link2 className="h-4 w-4 text-accent" aria-hidden />
        {s.title}
      </h2>
      <p className="text-xs text-ink-muted">{s.hint}</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink">
          <span className="mb-1 block font-semibold">{s.validFor}</span>
          <Select
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {formatMessage(s.days, { n: String(d) })}
              </option>
            ))}
          </Select>
        </label>
        <Button size="sm" disabled={busy} onClick={create}>
          {s.create}
        </Button>
      </div>
      {created ? (
        <div className="space-y-2 rounded-2xl border border-outline-variant bg-surface-raised p-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              dir="ltr"
              value={created.url}
              className="h-9 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-sunken/60 px-2 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-outline-variant px-3 text-xs font-semibold"
              onClick={() =>
                navigator.clipboard
                  .writeText(created.url)
                  .then(() => toast.success(s.copied))
              }
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {s.copy}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-700"
              href={`https://wa.me/${phone ?? ""}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {s.whatsapp}
            </a>
            <a
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 px-3 py-1.5 text-xs font-semibold text-sky-700"
              href={`mailto:${created.email ?? ""}?subject=${encodeURIComponent(formatMessage(s.subject, { reference: reference }))}&body=${encodeURIComponent(message)}`}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {s.email}
            </a>
          </div>
          <p className="text-[11px] text-ink-muted">
            {formatMessage(s.expires, { date: formatDate(created.expiresAt, locale) })}{" "}
            · {s.onceOnly}
          </p>
        </div>
      ) : null}
      {links.length ? (
        <ul className="space-y-1.5">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-raised px-3 py-2 text-xs"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${tone[link.status]}`}
                >
                  {s.statuses[link.status]}
                </span>
                <span className="text-ink-muted">
                  {formatDate(link.createdAt, locale)}
                </span>
                {link.viewedAt && link.status === "pending" ? (
                  <span className="text-ink-muted">· {s.opened}</span>
                ) : null}
                {link.signedAt ? (
                  <span className="text-ink-muted">
                    · {formatMessage(s.signedBy, { name: link.signerName ?? "" })}
                  </span>
                ) : null}
              </span>
              {link.status === "pending" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => revoke(link.id)}
                  className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {s.revoke}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
