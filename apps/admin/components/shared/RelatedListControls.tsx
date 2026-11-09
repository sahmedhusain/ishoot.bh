"use client";
import { formatMessage } from "@platform/locales";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const PAGE_SIZE = 50;
const chip = "inline-flex items-center justify-center w-8 h-8 rounded-full border border-outline-variant text-ink hover:bg-ink/5 transition-colors";

export function RelatedListControls({ pagination }: { pagination: Record<string, { page: number; total: number }> }) {
  const path = usePathname(), params = useSearchParams();
  const { t } = useAdminLocale();
  const r = t.relatedListControls;
  function href(domain: string, page: number) {
    const query = new URLSearchParams(params.toString());
    query.set(domain + "Page", String(page));
    return `${path}?${query}`;
  }
  const paged = Object.entries(pagination).filter(([, v]) => v.total > PAGE_SIZE || v.page > 1);
  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-outline-variant bg-surface-raised p-2.5 shadow-xs">
      <form action={path} method="get" role="search" className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1">
        <div className="relative flex-1 basis-48 min-w-0 lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-ink-muted" aria-hidden />
          <input
            type="search"
            name="q"
            aria-label={r.searchCustomerRecords}
            placeholder={r.searchCustomerRecords}
            defaultValue={params.get("q") || ""}
            maxLength={200}
            className="h-10 w-full rounded-full border border-outline-variant bg-surface-sunken/60 ps-10 pe-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">{r.search}</button>
      </form>
      {paged.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          {paged.map(([domain, value]) => {
            const pages = Math.max(1, Math.ceil(value.total / PAGE_SIZE));
            const label = (r.domains as Record<string, string>)[domain] ?? domain;
            return (
              <nav key={domain} aria-label={label} className="flex items-center gap-1.5">
                <span className="tabular-nums">{formatMessage(r.pageOf, { domain: label, page: String(value.page), pages: String(pages) })}</span>
                {value.page > 1 && (
                  <Link href={href(domain, value.page - 1)} className={chip} aria-label={r.previous}>
                    <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
                  </Link>
                )}
                {value.page < pages && (
                  <Link href={href(domain, value.page + 1)} className={chip} aria-label={r.next}>
                    <ChevronRight className="w-4 h-4 rtl:-scale-x-100" aria-hidden />
                  </Link>
                )}
              </nav>
            );
          })}
        </div>
      )}
    </div>
  );
}
