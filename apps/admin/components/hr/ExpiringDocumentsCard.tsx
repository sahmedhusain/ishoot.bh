"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { formatDate } from "@ishoot/ui";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface ExpiringDocumentRow {
  employeeId: string;
  employeeNumber: string;
  nameEn: string;
  nameAr: string;
  document: string;
  label?: string;
  expiryDate: string;
  days: number;
}

/** Passports, CPRs, visas and permits expiring within 60 days (or expired), soonest first. */
export function ExpiringDocumentsCard({ rows }: { rows: ExpiringDocumentRow[] }) {
  const { t, locale } = useAdminLocale();
  const c = t.employeeResidency;
  if (!rows.length) return null;
  const names = { ...c.kinds, ...t.expiryReminders.documents } as Record<string, string>;
  const expired = rows.filter((r) => r.days < 0).length;
  return (
    <section className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <CalendarClock className="h-4 w-4 text-amber-600" />
          {c.expiringTitle}
        </h2>
        <span className="text-xs text-ink-muted">
          {c.expiringSummary.replace("{count}", String(rows.length)).replace("{expired}", String(expired))}
        </span>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rows.slice(0, 10).map((r) => (
          <li key={`${r.employeeId}-${r.document}-${r.label ?? ""}-${r.expiryDate}`}>
            <Link href={ROUTES.hr.employee(r.employeeId)} className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-surface-raised border border-ink/10 px-3 py-2 hover:border-accent/50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{locale === "ar" ? r.nameAr : r.nameEn}</span>
                <span className="block text-[11px] text-ink-muted">{r.label || names[r.document] || r.document} · {formatDate(r.expiryDate, locale)}</span>
              </span>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.days < 0 ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                <AlertTriangle className="h-3 w-3" />
                {r.days < 0 ? c.status.expired : c.status.expiresIn.replace("{days}", String(r.days))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
