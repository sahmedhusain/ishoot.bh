"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Paperclip,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { formatCurrencyValue, formatDate } from "@platform/ui";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { ApprovalItemDetail, FactValue } from "../../lib/approval-item";
import { ContentImage } from "../shared/ContentImage";
import { ApprovalDecisionPanel } from "./ApprovalDecisionPanel";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/** One request on its own page: the record, what changes, the approval steps and the decision. */
export function ApprovalItemView({ item }: { item: ApprovalItemDetail }) {
  const { t, locale } = useAdminLocale();
  const a = t.approvals;
  const it = a.item;
  const isAr = locale === "ar";
  const label = (key: string) =>
    (it.fields as Record<string, string>)[key] ?? key;

  const show = (value: FactValue | null): React.ReactNode => {
    if (!value) return <span className="text-ink-muted">—</span>;
    switch (value.kind) {
      case "text":
        return value.value;
      case "bilingual":
        return isAr ? value.ar : value.en;
      case "date":
        return formatDate(value.value, locale);
      case "datetime":
        return formatDate(value.value, locale, "time");
      case "money":
        return (
          <span className="tabular-nums">
            {formatCurrencyValue(value.value, value.currency, isAr)}
          </span>
        );
      case "number":
        return value.unit === "percent"
          ? `${value.value}%`
          : value.unit === "days"
            ? formatMessage(it.daysValue, { n: String(value.value) })
            : String(value.value);
      case "enum": {
        const group = (it.enums as Record<string, Record<string, string>>)[
          value.group
        ];
        return (
          group?.[value.value] ??
          (t.statusLabels as Record<string, string>)[value.value] ??
          value.value
        );
      }
    }
  };

  const approval = item.approval;
  const typeLabel =
    a.types[item.targetType as keyof typeof a.types] ?? item.targetType;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.approvals()}
            aria-label={t.actions.back}
            className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          </Link>
          <div>
            <p className="text-xs text-ink-muted">{a.title}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              {typeLabel}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {item.reference ? (
                <bdi dir="ltr" className="font-mono">
                  {item.reference}
                </bdi>
              ) : null}
              {approval ? (
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLES[approval.status] ?? "bg-ink/5 text-ink-muted"}`}
                >
                  {a.status[approval.status as keyof typeof a.status] ??
                    approval.status}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        {item.recordUrl ? (
          <Link
            href={item.recordUrl}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5"
          >
            {a.openRecord}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {item.subject ? (
            <section className="flex items-center gap-3 rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <User className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-ink-muted">{it.concerns}</div>
                <div className="truncate font-semibold text-ink">
                  {item.subject.name}
                </div>
                {item.subject.email ? (
                  <div
                    className="truncate font-mono text-xs text-ink-muted"
                    dir="ltr"
                  >
                    {item.subject.email}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {item.changes.length ? (
            <section className="rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <h2 className="mb-3 text-sm font-bold text-ink">
                {it.requestedChanges}
              </h2>
              <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10">
                {item.changes.map((change) => (
                  <li
                    key={change.key}
                    className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-[10rem_1fr]"
                  >
                    <span className="text-xs font-semibold text-ink-muted">
                      {label(change.key)}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-muted line-through decoration-rose-400/70">
                        {show(change.before)}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-ink-muted rtl:-scale-x-100"
                        aria-hidden
                      />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {show(change.after)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {item.images.length ? (
            <section className="rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {item.images.map((image) => (
                  <figure key={image.key} className="space-y-2">
                    <figcaption className="text-xs font-semibold text-ink-muted">
                      {label(image.key)}
                    </figcaption>
                    <div className="flex h-32 items-center justify-center rounded-2xl border border-ink/10 bg-white">
                      {image.url ? (
                        <ContentImage
                          src={image.url}
                          alt={label(image.key)}
                          width={260}
                          height={110}
                          className="max-h-28 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-xs text-ink-muted">
                          {it.none}
                        </span>
                      )}
                    </div>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {item.facts.length ? (
            <section className="rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <h2 className="mb-3 text-sm font-bold text-ink">{a.details}</h2>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
                {item.facts.map((fact) => (
                  <div key={fact.key}>
                    <dt className="mb-0.5 text-[11px] text-ink-muted">
                      {label(fact.key)}
                    </dt>
                    <dd className="font-medium text-ink">{show(fact.value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {item.note ? (
            <section className="rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <h2 className="mb-2 text-sm font-bold text-ink">{it.reason}</h2>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {item.note}
              </p>
            </section>
          ) : null}

          {item.files.length ? (
            <section className="rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                <Paperclip className="h-4 w-4" aria-hidden />
                {it.files}
              </h2>
              <ul className="space-y-1.5">
                {item.files.map((file) => (
                  <li key={file.url}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                    >
                      <FileText className="h-4 w-4" aria-hidden />
                      {(it.fileNames as Record<string, string>)[file.name] ??
                        file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          {approval ? (
            <section className="space-y-3 rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised">
              <h2 className="text-sm font-bold text-ink">{it.progress}</h2>
              <p className="text-xs text-ink-muted">
                {formatMessage(a.requestedBy, { name: approval.requestedBy.name })} ·{" "}
                {formatDate(approval.createdAt, locale)}
              </p>
              <ol className="space-y-2">
                {approval.decisions.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-2xl border border-ink/10 p-3 text-xs"
                  >
                    {d.decision === "approved" ? (
                      <Check
                        className="mt-0.5 h-4 w-4 text-emerald-600"
                        aria-hidden
                      />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 text-rose-500" aria-hidden />
                    )}
                    <div>
                      <div className="font-semibold text-ink">
                        {formatMessage((d.decision === "approved"
                          ? a.decision.approved
                          : a.decision.rejected
                        ), { name: d.name, date: formatDate(d.at, locale) })}
                      </div>
                      <div className="text-ink-muted">
                        {formatMessage(a.step, { step: String(d.step) })}
                      </div>
                      {d.reason &&
                        !/^(super_admin|below_threshold|policy_auto|no_alternate_approver)$/.test(
                          d.reason,
                        ) ? (
                        <div className="mt-1 italic text-ink-muted">
                          “{d.reason}”
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
                {approval.status === "pending" ? (
                  <li className="flex items-start gap-2 rounded-2xl border border-dashed border-amber-400/50 p-3 text-xs">
                    <Clock
                      className="mt-0.5 h-4 w-4 text-amber-500"
                      aria-hidden
                    />
                    <div>
                      <div className="font-semibold text-ink">
                        {formatMessage(a.step, { step: String(approval.currentStep) })}
                      </div>
                      <div className="text-ink-muted">
                        {approval.waitingFor.length
                          ? formatMessage(it.waitingForNames, { names: approval.waitingFor.join(isAr ? "، " : ", ") })
                          : it.waitingForAdmin}
                      </div>
                    </div>
                  </li>
                ) : null}
              </ol>
              {approval.selfApproved ? (
                <p className="text-xs italic text-ink-muted">
                  {a.selfApproved}
                </p>
              ) : null}
            </section>
          ) : (
            <p className="rounded-3xl border border-ink/10 p-5 text-xs text-ink-muted">
              {it.noApproval}
            </p>
          )}

          {approval?.status === "pending" && !item.canDecide ? (
            <p className="inline-flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs text-ink-muted">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              {item.isRequester ? a.ownRequest : a.notEligible}
            </p>
          ) : null}
        </aside>
      </div>

      {approval && item.canDecide ? (
        <ApprovalDecisionPanel
          approvalId={approval.id}
          requiresSignature={item.signatureRequired}
        />
      ) : null}
    </div>
  );
}
