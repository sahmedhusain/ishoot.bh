"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { Mail, Phone, MessageCircle, Search, Users, Plane } from "lucide-react";
import type { DirectoryEntry } from "@platform/database/queries/directory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ContentImage } from "../shared/ContentImage";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Everyone's work contacts with one-tap call, WhatsApp and email. */
export function DirectoryView({ entries }: { entries: DirectoryEntry[] }) {
  const { t, locale } = useAdminLocale();
  const d = t.directory;
  const ar = locale === "ar";
  const [query, setQuery] = React.useState("");
  const [department, setDepartment] = React.useState("all");

  const departments = Array.from(new Set(entries.map((e) => e.department).filter((x): x is string => !!x))).sort();
  const q = query.trim().toLowerCase();
  const visible = entries.filter(
    (e) =>
      (department === "all" || e.department === department) &&
      (!q || [e.name, e.nameAr, e.title, e.titleAr, e.email, e.phone, e.department].some((v) => v?.toLowerCase().includes(q))),
  );
  const roleNames = t.roles as unknown as Record<string, string>;
  const roleName = (role: string | null) => (role ? (typeof roleNames[role] === "string" ? roleNames[role] : role.replace("_", " ")) : null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display flex items-center gap-2">
            <Users className="w-7 h-7 text-accent" />
            {d.title}
          </h1>
          <p className="text-xs text-ink-muted mt-1">{formatMessage(d.subtitle, { count: String(entries.length) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label={d.search}
              placeholder={d.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-9 pe-3 py-2 rounded-full border border-ink/15 bg-surface text-sm text-ink w-60"
            />
          </label>
          <select aria-label={d.department} value={department} onChange={(e) => setDepartment(e.target.value)} className="px-3 py-2 rounded-full border border-ink/15 bg-surface text-sm text-ink">
            <option value="all">{d.allDepartments}</option>
            {departments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-12 text-center text-sm text-ink-muted rounded-3xl border border-ink/10 bg-surface">{d.empty}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e) => {
            const phone = e.phone?.replace(/[^\d+]/g, "");
            return (
              <li key={e.id} className="rounded-3xl border border-ink/10 bg-surface p-5 flex flex-col gap-4">
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
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-semibold">
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
                    <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ink/15 text-ink text-xs font-semibold" title={e.email}>
                      <Mail className="w-3.5 h-3.5" />
                      {d.email}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
