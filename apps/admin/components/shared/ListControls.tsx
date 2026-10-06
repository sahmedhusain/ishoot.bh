"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import {
  usePermissions,
  type PermissionResource,
} from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const field =
  "h-10 rounded-full border border-ink/15 bg-surface-sunken/60 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition";
const chip =
  "inline-flex items-center justify-center h-9 min-w-9 rounded-full border border-ink/15 px-3 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors";

export function ListControls({
  path,
  page,
  total,
  filters,
  statuses = [],
  exportDomain,
}: {
  path: string;
  page: number;
  total: number;
  filters: { q: string; status: string; dealId?: string };
  statuses?: string[];
  exportDomain?: string;
}) {
  const { can } = usePermissions();
  const { t } = useAdminLocale();
  const pages = Math.max(1, Math.ceil(total / 50));
  const href = (next: number) =>
    `${path}?${new URLSearchParams({ ...(filters.dealId ? { dealId: filters.dealId } : {}), q: filters.q, status: filters.status, page: String(next) })}`;
  const canExport =
    !!exportDomain &&
    (exportDomain === "archive"
      ? ["contacts", "deals", "invoices", "payments", "expenses", "settings"].every((r) => can(r as PermissionResource, "export"))
      : can(exportDomain as PermissionResource, "export"));
  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between mb-6 rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-2.5 shadow-xs">
      <form action={path} method="get" role="search" className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1">
        {filters.dealId ? (
          <input type="hidden" name="dealId" value={filters.dealId} />
        ) : null}
        <div className="relative flex-1 basis-48 min-w-0 lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-ink-muted" aria-hidden />
          <input
            type="search"
            aria-label={t.listControls.searchAllRecords}
            name="q"
            defaultValue={filters.q}
            maxLength={200}
            placeholder={t.listControls.searchAllRecords}
            className={`${field} w-full ps-10 pe-4`}
          />
        </div>
        {!statuses.length && filters.status && filters.status !== "all" ? (
          <input type="hidden" name="status" value={filters.status} />
        ) : null}
        {statuses.length ? (
          <select
            aria-label={t.listControls.status}
            name="status"
            defaultValue={filters.status}
            className={`${field} px-4 cursor-pointer`}
          >
            <option value="all">{t.listControls.all}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {(t.statusLabels as Record<string, string>)[s] ?? s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        ) : null}
        <button className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
          {t.listControls.search}
        </button>
      </form>
      <nav
        aria-label={t.listControls.listPages}
        className="flex flex-wrap items-center justify-between gap-2 text-xs lg:justify-end"
      >
        <span className="px-2 text-ink-muted tabular-nums">
          {t.listControls.page.replace("{page}", String(page)).replace("{pages}", String(pages))} · {total} {t.listControls.records}
        </span>
        {page > 1 ? (
          <Link href={href(page - 1)} className={chip} aria-label={t.listControls.previous}>
            <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className={chip} aria-label={t.listControls.next}>
            <ChevronRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        ) : null}
        {canExport ? (
          <a
            href={`/api/exports/${exportDomain}?${new URLSearchParams({ ...(filters.dealId ? { dealId: filters.dealId } : {}), q: filters.q, status: filters.status })}`}
            className="inline-flex items-center gap-1.5 h-9 rounded-full bg-accent/10 px-4 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            {t.listControls.exportMatches}
          </a>
        ) : null}
      </nav>
    </div>
  );
}
