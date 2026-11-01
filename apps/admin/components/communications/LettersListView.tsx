"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FilePlus2, LayoutTemplate, Mail } from "lucide-react";
import type { listOfficialLetters } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ROUTES } from "../../constants/routes";
import { PageHeader } from "../layout/PageHeader";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-surface-container-highest text-on-surface-variant",
  pending_approval: "bg-tertiary-container text-on-tertiary-container",
  approved: "bg-primary-container text-on-primary-container",
  rejected: "bg-m3-error-container text-m3-on-error-container",
  cancelled: "bg-surface-container-highest text-on-surface-variant line-through",
};

export function LettersListView({
  items,
  canCreate,
  canTemplates,
}: {
  items: Awaited<ReturnType<typeof listOfficialLetters>>;
  canCreate: boolean;
  canTemplates: boolean;
}) {
  const { t, locale, isRTL } = useAdminLocale();
  const c = t.communications;
  const labels: Record<string, string> = c;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const linkButton =
    "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-shadow focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-m3-primary";
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <PageHeader
        actions={
          <>
            {canTemplates && (
              <Link href={ROUTES.letters.templates} className={`${linkButton} border border-m3-outline text-m3-primary`}>
                <LayoutTemplate className="size-4" aria-hidden />
                {c.templates}
              </Link>
            )}
            {canCreate && (
              <Link href={ROUTES.letters.create()} className={`${linkButton} bg-m3-primary text-m3-on-primary hover:shadow-m3-1`}>
                <FilePlus2 className="size-4" aria-hidden />
                {c.new}
              </Link>
            )}
          </>
        }
      />
      {!items.length ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-16 text-center" data-page-section>
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary-container text-on-secondary-container" aria-hidden>
            <Mail className="size-6" />
          </span>
          <p className="text-sm text-on-surface-variant">{c.empty}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant" data-page-section>
          {items.map((l) => (
            <li key={l.id}>
              <Link
                href={ROUTES.letters.detail(l.id)}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none"
              >
                <span className="hidden size-10 shrink-0 place-items-center rounded-full bg-surface-container-high text-on-surface-variant sm:grid" aria-hidden>
                  <Mail className="size-5" />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <bdi dir="ltr" className="font-mono text-xs text-on-surface-variant">{l.reference}</bdi>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[l.status] ?? STATUS_TONE.draft}`}>
                      {labels[l.status] ?? l.status}
                    </span>
                  </span>
                  <span className="block truncate font-medium text-on-surface">
                    {locale === "ar" ? l.subjectAr : l.subjectEn}
                  </span>
                  <span className="block truncate text-sm text-on-surface-variant">
                    {l.recipient} · {l.letterDate}
                  </span>
                </span>
                <Chevron className="size-5 shrink-0 text-on-surface-variant" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
