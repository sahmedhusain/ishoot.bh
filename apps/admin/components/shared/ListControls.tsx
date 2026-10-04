"use client";
import Link from "next/link";
import {
  usePermissions,
  type PermissionResource,
} from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";
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
  const { isRTL } = useAdminLocale();
  const pages = Math.max(1, Math.ceil(total / 50));
  const href = (next: number) =>
    `${path}?${new URLSearchParams({ ...(filters.dealId ? { dealId: filters.dealId } : {}), q: filters.q, status: filters.status, page: String(next) })}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 rounded-xl border border-slate-200 dark:border-white/10 p-3">
      <form action={path} method="get" className="flex flex-wrap gap-2">
        {filters.dealId ? (
          <input type="hidden" name="dealId" value={filters.dealId} />
        ) : null}
        <input
          aria-label={isRTL ? "بحث في جميع السجلات" : "Search all records"}
          name="q"
          defaultValue={filters.q}
          maxLength={200}
          placeholder={isRTL ? "بحث في جميع السجلات" : "Search all records"}
          className="rounded-lg border p-2 text-xs text-slate-900"
        />
        {!statuses.length && filters.status && filters.status !== "all" ? (
          <input type="hidden" name="status" value={filters.status} />
        ) : null}
        {statuses.length ? (
          <select
            aria-label={isRTL ? "الحالة" : "Status"}
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border p-2 text-xs text-slate-900"
          >
            <option value="all">{isRTL ? "الكل" : "All"}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        ) : null}
        <button className="rounded-lg bg-[#014842] text-white px-3 text-xs">
          {isRTL ? "بحث" : "Search"}
        </button>
      </form>
      <nav
        aria-label={isRTL ? "صفحات القائمة" : "List pages"}
        className="flex gap-3 items-center text-xs"
      >
        <span>
          {page} / {pages} · {total} {isRTL ? "سجل" : "records"}
        </span>
        {page > 1 ? (
          <Link href={href(page - 1)}>{isRTL ? "السابق" : "Previous"}</Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)}>{isRTL ? "التالي" : "Next"}</Link>
        ) : null}
        {exportDomain &&
        (exportDomain === "archive"
          ? [
              "contacts",
              "deals",
              "invoices",
              "payments",
              "expenses",
              "settings",
            ].every((r) => can(r as PermissionResource, "export"))
          : can(exportDomain as PermissionResource, "export")) ? (
          <a
            href={`/api/exports/${exportDomain}?${new URLSearchParams({ ...(filters.dealId ? { dealId: filters.dealId } : {}), q: filters.q, status: filters.status })}`}
          >
            {isRTL ? "تصدير النتائج" : "Export matches"}
          </a>
        ) : null}
      </nav>
    </div>
  );
}
