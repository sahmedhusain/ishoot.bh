"use client";

import { Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { Mail, Phone, MessageCircle, Search, Plane, Network } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import type { DirectoryEntry } from "@platform/database/queries/directory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ContentImage } from "../shared/ContentImage";
import { PageHeader } from "../layout/PageHeader";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Everyone's work contacts with one-tap call, WhatsApp and email. */
export function DirectoryView({
  entries,
  total,
  page,
  pageSize,
  filters,
  departments,
}: {
  entries: DirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; departmentId: string };
  departments: { id: string; name_en: string; name_ar: string }[];
}) {
  const { t, locale } = useAdminLocale();
  const d = t.directory;
  const ar = locale === "ar";
  const visible = entries;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (next: number) => `${ROUTES.directory}?${new URLSearchParams({ ...filters, page: String(next) })}`;
  const roleNames = t.roles as unknown as Record<string, string>;
  const roleName = (role: string | null) => (role ? (typeof roleNames[role] === "string" ? roleNames[role] : role.replace("_", " ")) : null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        description={formatMessage(d.subtitle, { count: String(total) })}
        actions={<form method="get" action={ROUTES.directory} role="search" className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              name="q"
              aria-label={d.search}
              placeholder={d.search}
              defaultValue={filters.q}
              className="ps-9 pe-3 py-2 rounded-full border border-outline-variant bg-surface text-sm text-ink w-60"
            />
          </label>
          <Select name="departmentId" aria-label={d.department} defaultValue={filters.departmentId} className="px-3 py-2 rounded-full border border-outline-variant bg-surface text-sm text-ink">
            <option value="all">{d.allDepartments}</option>
            {departments.map((dep) => <option key={dep.id} value={dep.id}>{ar ? dep.name_ar : dep.name_en}</option>)}
          </Select>
          <button type="submit" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{t.actions.search}</button>
          <Link href={ROUTES.orgChart} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant text-sm font-semibold text-ink hover:bg-ink/5 transition-colors">
            <Network className="w-4 h-4 text-accent" />
            {d.orgChart}
          </Link>
        </form>}
      />

      {visible.length === 0 ? (
        <p className="p-12 text-center text-sm text-ink-muted rounded-3xl border border-outline-variant bg-surface">{d.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e) => {
            const phone = e.phone?.replace(/[^\d+]/g, "");
            return (
              <li key={e.id} className="rounded-3xl border border-outline-variant bg-surface p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center overflow-hidden shrink-0">
                    {e.avatarUrl ? <ContentImage src={e.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(e.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{ar && e.nameAr ? e.nameAr : e.name}</div>
                    <div className="text-xs text-ink-muted truncate">{(ar ? e.titleAr : e.title) ?? roleName(e.role) ?? "—"}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {e.department && <span className="px-2 py-0.5 rounded-full bg-ink/5 text-[10px] text-ink">{ar && e.departmentAr ? e.departmentAr : e.department}</span>}
                      {e.role && <span className="px-2 py-0.5 rounded-full bg-accent/10 text-[10px] text-accent">{roleName(e.role)}</span>}
                      {e.onLeave && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                          <Plane className="w-3 h-3" />
                          {d.onLeave}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {e.manager && <div className="text-[11px] text-ink-muted">{formatMessage(d.reportsTo, { name: e.manager })}</div>}
                <div className="flex flex-wrap gap-2 mt-auto">
                  {phone && (
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                      <Phone className="w-3.5 h-3.5" />
                      {d.call}
                    </a>
                  )}
                  {phone && (
                    <a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#25D366]/40 text-[#128C7E] dark:text-[#25D366] text-xs font-semibold">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {t.copy.whatsapp}</a>
                  )}
                  {e.email && (
                    <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-ink text-xs font-semibold" title={e.email}>
                      <Mail className="w-3.5 h-3.5" />
                      <bdi dir="ltr">{d.email}</bdi>
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label={t.usersBulk.pages} className="flex items-center justify-between text-xs">
          {page > 1 ? <Link href={pageHref(page - 1)} className="text-primary dark:text-mint font-semibold">{t.usersBulk.previous}</Link> : <span />}
          <span className="text-ink-muted">{formatMessage(t.usersBulk.pageOf, { page, pages })}</span>
          {page < pages ? <Link href={pageHref(page + 1)} className="text-primary dark:text-mint font-semibold">{t.usersBulk.next}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
