"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlarmClock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  Mail,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Trophy,
  User,
  X,
} from "lucide-react";
import { Button, ConfirmDialog, formatCurrencyValue, formatDate } from "@platform/ui";
import type { ClientListRow } from "@platform/database/types";
import {
  CLIENT_ACTIVITY_FILTERS,
  CLIENT_BALANCE_FILTERS,
  CLIENT_KINDS,
  CLIENT_SORTS,
  CLIENT_TIERS,
  countryName,
  countryOptions,
} from "@platform/database/constants/clients";
import type { ClientListFilters } from "@platform/database";
import { CONTACT_TYPES } from "@platform/config/constants";
import { ROUTES } from "../../constants/routes";
import { deleteContactAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { errorMessage } from "../../lib/error-text";

type Summary = Record<"total" | "companies" | "government" | "individuals" | "tier_a" | "with_balance" | "outstanding" | "billed", number>;
const KIND_ICONS = { individual: User, company: Building2, government: Landmark } as const;
const TIER_STYLE: Record<string, string> = {
  A: "bg-amber-400/15 text-amber-700 border-amber-400/40 dark:text-amber-300",
  B: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",
  C: "bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-300",
  none: "bg-transparent text-ink-muted border-ink/15",
};
const FILTER_KEYS = ["kind", "type", "origin", "country", "tier", "balance", "activity"] as const;

/** Whether a company or government profile is missing its registration details. */
function incomplete(row: ClientListRow) {
  if (row.client_kind === "company") return row.company_origin === "foreign" ? !row.registration_number : !row.cr_number;
  if (row.client_kind === "government") return !row.contact_persons_count;
  return false;
}

export function ClientsListView({
  rows,
  total,
  page,
  filters,
  summary,
  currency,
}: {
  rows: ClientListRow[];
  total: number;
  page: number;
  filters: ClientListFilters;
  summary: Summary;
  currency: string;
}) {
  const { t, locale } = useAdminLocale();
  const { can } = usePermissions();
  const router = useRouter();
  const c = t.clients;
  const countries = React.useMemo(() => countryOptions(t.countries), [t.countries]);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const activeFilters = FILTER_KEYS.filter((key) => filters[key] !== "all").length;
  const [showMore, setShowMore] = React.useState(activeFilters > 0);
  const pages = Math.max(1, Math.ceil(total / 50));
  const money = (amount: number) => formatCurrencyValue(amount, currency, locale === "ar");

  const query = (patch: Partial<ClientListFilters> & { page?: number }) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (key === "page" || value === "" || value === "all" || (key === "sort" && value === "newest")) continue;
      params.set(key, String(value));
    }
    if (patch.page && patch.page > 1) params.set("page", String(patch.page));
    return params;
  };
  const href = (patch: Partial<ClientListFilters> & { page?: number }) => {
    const search = query(patch).toString();
    return search ? `${ROUTES.crm.contacts}?${search}` : ROUTES.crm.contacts;
  };
  const exportHref = `/api/exports/contacts?${query({}).toString()}`;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch: Record<string, string> = {};
    data.forEach((value, key) => (patch[key] = String(value)));
    router.push(href({ ...patch, page: 1 }));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContactAction(deleteTarget);
      toast.success(c.deleted);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, c.deleteFailed));
    } finally {
      setDeleteTarget(null);
    }
  };

  const tiles: Array<{ key: string; label: string; value: string; link?: string; tone?: string }> = [
    { key: "total", label: c.summary.total, value: String(summary.total), link: ROUTES.crm.contacts },
    { key: "companies", label: c.summary.companies, value: String(summary.companies), link: href({ kind: "company", page: 1 }) },
    { key: "government", label: c.summary.government, value: String(summary.government), link: href({ kind: "government", page: 1 }) },
    { key: "individuals", label: c.summary.individuals, value: String(summary.individuals), link: href({ kind: "individual", page: 1 }) },
    { key: "tierA", label: c.summary.tierA, value: String(summary.tier_a), link: href({ tier: "A", sort: "rank", page: 1 }), tone: "text-amber-600 dark:text-amber-300" },
    { key: "balance", label: c.summary.outstanding, value: money(summary.outstanding), link: href({ balance: "outstanding", sort: "outstanding_desc", page: 1 }), tone: summary.outstanding > 0 ? "text-rose-600 dark:text-rose-300" : undefined },
  ];
  const select = "h-10 rounded-full border border-ink/15 bg-surface-sunken/60 px-4 text-xs text-ink focus:outline-none focus:border-accent cursor-pointer";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">{c.title}</h1>
          <p className="text-xs text-ink-muted mt-1">{c.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {can("contacts", "export") ? (
            <a href={exportHref} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5 transition-colors">
              <Download className="w-3.5 h-3.5" />
              {c.export}
            </a>
          ) : null}
          {can("contacts", "write") ? (
            <Link href={ROUTES.crm.newCustomer}>
              <Button variant="primary" size="sm" className="gap-1.5 rounded-full px-4 h-9 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" />
                {c.newClient}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((tile) => (
          <Link key={tile.key} href={tile.link ?? "#"} className="rounded-2xl border border-ink/10 bg-white dark:bg-surface-raised p-4 hover:border-accent/50 transition-colors">
            <div className="text-[11px] text-ink-muted">{tile.label}</div>
            <div className={`mt-1 text-lg font-bold tabular-nums ${tile.tone ?? "text-ink"}`}>{tile.value}</div>
          </Link>
        ))}
      </div>

      <form onSubmit={submit} role="search" className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-3 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 basis-60 min-w-0">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-ink-muted" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              maxLength={200}
              aria-label={c.filters.search}
              placeholder={c.filters.search}
              className="h-10 w-full rounded-full border border-ink/15 bg-surface-sunken/60 ps-10 pe-4 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <select name="kind" defaultValue={filters.kind} aria-label={c.filters.kind} className={select}>
            <option value="all">{c.filters.allKinds}</option>
            {CLIENT_KINDS.map((k) => <option key={k} value={k}>{c.kinds[k]}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="hidden sm:inline">{c.filters.sort}</span>
            <select name="sort" defaultValue={filters.sort} aria-label={c.filters.sort} className={select}>
              {CLIENT_SORTS.map((s) => <option key={s} value={s}>{c.sorts[s]}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            className="inline-flex items-center gap-1.5 h-10 rounded-full border border-ink/15 px-4 text-xs font-semibold text-ink hover:bg-ink/5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {c.filters.more}
            {activeFilters ? <span className="rounded-full bg-accent px-1.5 text-[10px] text-white">{activeFilters}</span> : null}
          </button>
          <button className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-white hover:bg-primary/90">{c.filters.apply}</button>
          {activeFilters || filters.q || filters.sort !== "newest" ? (
            <Link href={ROUTES.crm.contacts} className="inline-flex items-center gap-1 h-10 px-3 text-xs font-semibold text-ink-muted hover:text-ink">
              <X className="w-3.5 h-3.5" />
              {c.filters.reset}
            </Link>
          ) : null}
        </div>
        {showMore ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 border-t border-ink/10 pt-3">
            <select name="type" defaultValue={filters.type} aria-label={c.filters.classification} className={select}>
              <option value="all">{c.filters.allClassifications}</option>
              {CONTACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{t.crm.contactTypes[type.value as keyof typeof t.crm.contactTypes]}</option>
              ))}
            </select>
            <select name="origin" defaultValue={filters.origin} aria-label={c.filters.origin} className={select}>
              <option value="all">{c.filters.allOrigins}</option>
              <option value="local">{c.origins.local}</option>
              <option value="foreign">{c.origins.foreign}</option>
            </select>
            <select name="country" defaultValue={filters.country} aria-label={c.filters.country} className={select}>
              <option value="all">{c.filters.allCountries}</option>
              {countries.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
            </select>
            <select name="tier" defaultValue={filters.tier} aria-label={c.filters.tier} className={select}>
              <option value="all">{c.filters.allTiers}</option>
              {CLIENT_TIERS.map((tier) => <option key={tier} value={tier}>{c.tierNames[tier]}</option>)}
            </select>
            <select name="balance" defaultValue={filters.balance} aria-label={c.filters.balance} className={select}>
              <option value="all">{c.filters.allBalances}</option>
              {CLIENT_BALANCE_FILTERS.map((b) => <option key={b} value={b}>{c.balances[b]}</option>)}
            </select>
            <select name="activity" defaultValue={filters.activity} aria-label={c.filters.activity} className={select}>
              <option value="all">{c.filters.anyActivity}</option>
              {CLIENT_ACTIVITY_FILTERS.map((a) => <option key={a} value={a}>{c.activities[a]}</option>)}
            </select>
          </div>
        ) : null}
      </form>

      <div className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold w-20">{c.columns.rank}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{c.columns.client}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{c.columns.contact}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{c.columns.location}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">{c.columns.billed}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">{c.columns.outstanding}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{c.columns.lastActivity}</th>
                <th scope="col" className="px-2 py-3"><span className="sr-only">{c.columns.actions}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-14 text-center text-sm text-ink-muted">{c.empty}</td></tr>
              ) : null}
              {rows.map((row) => {
                const kind = row.client_kind ?? "individual";
                const Icon = KIND_ICONS[kind];
                const name = kind === "individual" ? row.full_name : row.company || row.full_name;
                const altName = kind === "individual" ? "" : locale === "ar" ? row.company_name_ar : "";
                const country = row.address_details?.country || row.registration_country || row.nationality;
                return (
                  <tr key={row.id} className="hover:bg-ink/[0.02] align-top">
                    <td className="px-4 py-3">
                      <span title={c.tierHints[row.tier]} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${TIER_STYLE[row.tier]}`}>
                        {row.tier === "A" ? <Trophy className="w-3 h-3" /> : null}
                        {row.tier === "none" ? "—" : row.tier}
                      </span>
                      {row.rank ? <div className="mt-1 text-[11px] text-ink-muted tabular-nums">#{row.rank}</div> : null}
                    </td>
                    <td className="px-4 py-3 min-w-56">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-mint">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <Link href={ROUTES.crm.customer(row.id)} className="font-semibold text-ink hover:text-accent hover:underline">
                            {altName || name}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                            <span>{c.kinds[kind]}</span>
                            {kind === "company" && row.company_origin ? <span>· {c.origins[row.company_origin]}</span> : null}
                            {row.cr_number ? <span dir="ltr">· {c.crShort} {row.cr_number}</span> : null}
                            {row.contact_type && row.contact_type !== "client" ? <span>· {t.crm.contactTypes[row.contact_type]}</span> : null}
                            {incomplete(row) ? <span className="rounded-full bg-amber-500/10 px-1.5 text-amber-700 dark:text-amber-300">{c.incomplete}</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs min-w-48">
                      <div className="font-medium text-ink">{kind === "individual" ? row.job_title || "—" : row.full_name}</div>
                      {row.email ? (
                        <a href={`mailto:${row.email}`} className="mt-0.5 flex items-center gap-1 text-ink-muted hover:text-accent">
                          <Mail className="h-3 w-3 shrink-0" /><span className="truncate" dir="ltr">{row.email}</span>
                        </a>
                      ) : null}
                      {row.phone ? (
                        <a href={`tel:${row.phone}`} className="mt-0.5 flex items-center gap-1 text-ink-muted hover:text-accent">
                          <Phone className="h-3 w-3 shrink-0" /><span dir="ltr">{row.phone}</span>
                        </a>
                      ) : null}
                      {row.contact_persons_count > 1 ? (
                        <div className="mt-0.5 text-[11px] text-accent">{formatMessage(c.contactsCount, { n: String(row.contact_persons_count) })}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink">
                      <div>{country ? countryName(country, t.countries) : "—"}</div>
                      {row.address_details?.city ? <div className="text-ink-muted">{row.address_details.city}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-end text-xs tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-ink">{row.billed ? money(row.billed) : "—"}</div>
                      {row.invoice_count ? <div className="text-ink-muted">{formatMessage(c.invoicesCount, { n: String(row.invoice_count) })}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-end text-xs tabular-nums whitespace-nowrap">
                      <div className={row.outstanding > 0 ? "font-semibold text-rose-600 dark:text-rose-300" : "text-ink-muted"}>
                        {row.outstanding > 0 ? money(row.outstanding) : "—"}
                      </div>
                      {row.overdue ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                          <AlarmClock className="h-3 w-3" />{c.overdue}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{formatDate(row.last_activity, locale)}</td>
                    <td className="px-2 py-3 text-end">
                      {can("contacts", "delete") ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row.id)}
                          aria-label={t.actions.delete}
                          title={t.actions.delete}
                          className="rounded-lg p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-4 py-3 text-xs text-ink-muted">
          <span>{formatMessage(c.rankingNote, { currency: currency })}</span>
          <nav aria-label={t.listControls.listPages} className="flex items-center gap-2">
            <span className="tabular-nums">
              {formatMessage(t.listControls.page, { page: String(page), pages: String(pages) })} · {total} {t.listControls.records}
            </span>
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} aria-label={t.listControls.previous} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 hover:bg-ink/5">
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={href({ page: page + 1 })} aria-label={t.listControls.next} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 hover:bg-ink/5">
                <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            ) : null}
          </nav>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t.contactsView.deleteConfirmTitle}
        description={t.contactsView.deleteConfirmDesc}
      />
    </div>
  );
}
