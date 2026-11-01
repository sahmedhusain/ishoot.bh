"use client";
import { useCompanyCurrency } from "@platform/ui";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Settings2, X } from "lucide-react";
import { Select, Button, formatCurrencyValue, formatDate } from "@platform/ui";
import type { AssetRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { PageHeader } from "../layout/PageHeader";

const STATUSES = ["available", "assigned", "maintenance", "lost", "retired"] as const;
const CONDITIONS = ["new", "excellent", "good", "fair", "poor", "damaged"] as const;
const SORTS = ["tag", "newest", "name", "value_desc", "purchase_desc", "warranty_asc"] as const;
export const ASSET_STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  assigned: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  maintenance: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  lost: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  retired: "bg-ink/10 text-ink-muted",
};

type Option = { id: string; name_en: string; name_ar: string };
type Filters = { q: string; category: string; status: string; condition: string; holder: string; sort: string };

/** Company equipment and property, who holds what, and its value. */
export function AssetsListView({ items, counts, totalValue, filters, categories, employees, canCreate, canEdit }: {
  items: AssetRecord[];
  counts: Record<string, number>;
  totalValue: number;
  filters: Filters;
  categories: Option[];
  employees: Option[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const companyCurrency = useCompanyCurrency();
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const router = useRouter();
  const isAr = locale === "ar";
  const label = (o: Option) => (isAr ? o.name_ar : o.name_en);
  const href = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value && value !== "all" && !(key === "sort" && value === "tag")) params.set(key, value);
    const qs = params.toString();
    return qs ? `${ROUTES.assets.list()}?${qs}` : ROUTES.assets.list();
  };
  const select = "h-10 rounded-full border border-outline-variant bg-surface-sunken/60 px-4 text-xs text-ink focus:outline-none focus:border-accent";
  const filtered = Object.entries(filters).some(([k, v]) => v && v !== "all" && !(k === "sort" && v === "tag"));
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        actions={<div className="flex items-center gap-2">
          {canEdit ? (
            <Link href={ROUTES.assets.categories} className="inline-flex items-center gap-1.5 h-9 rounded-full border border-outline-variant px-4 text-xs font-semibold text-ink hover:bg-ink/5">
              <Settings2 className="h-3.5 w-3.5" />{a.categories}
            </Link>
          ) : null}
          {canCreate ? (
            <Link href={ROUTES.assets.create}><Button size="sm" className="gap-1.5 rounded-full h-9"><Plus className="h-4 w-4" />{a.add}</Button></Link>
          ) : null}
        </div>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          [a.stats.total, String(total), undefined],
          [a.statuses.available, String(counts.available ?? 0), href({ status: "available" })],
          [a.statuses.assigned, String(counts.assigned ?? 0), href({ status: "assigned" })],
          [a.statuses.maintenance, String(counts.maintenance ?? 0), href({ status: "maintenance" })],
          [a.stats.value, formatCurrencyValue(totalValue, companyCurrency, isAr), undefined],
        ].map(([title, value, link]) => {
          const body = (
            <>
              <div className="text-[11px] text-ink-muted">{title}</div>
              <div className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</div>
            </>
          );
          return link ? (
            <Link key={title} href={link} className="rounded-2xl border border-outline-variant bg-surface-raised p-4 hover:border-accent/50">{body}</Link>
          ) : (
            <div key={title} className="rounded-2xl border border-outline-variant bg-surface-raised p-4">{body}</div>
          );
        })}
      </div>

      <form
        role="search"
        className="flex flex-wrap items-center gap-2 rounded-3xl border border-outline-variant bg-surface-raised p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const patch: Record<string, string> = {};
          data.forEach((value, key) => (patch[key] = String(value)));
          router.push(href(patch));
        }}
      >
        <div className="relative flex-1 basis-56 min-w-0">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-ink-muted" />
          <input name="q" defaultValue={filters.q} placeholder={a.filters.search} aria-label={a.filters.search} className="h-10 w-full rounded-full border border-outline-variant bg-surface-sunken/60 ps-10 pe-4 text-sm text-ink focus:outline-none focus:border-accent" />
        </div>
        <Select name="category" defaultValue={filters.category} aria-label={a.fields.category} className={select}>
          <option value="all">{a.filters.allCategories}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
        </Select>
        <Select name="status" defaultValue={filters.status} aria-label={a.fields.status} className={select}>
          <option value="all">{a.filters.allStatuses}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{a.statuses[s]}</option>)}
        </Select>
        <Select name="condition" defaultValue={filters.condition} aria-label={a.fields.condition} className={select}>
          <option value="all">{a.filters.anyCondition}</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{a.conditions[c]}</option>)}
        </Select>
        <Select name="holder" defaultValue={filters.holder} aria-label={a.fields.holder} className={select}>
          <option value="all">{a.filters.anyHolder}</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{label(e)}</option>)}
        </Select>
        <Select name="sort" defaultValue={filters.sort} aria-label={a.filters.sort} className={select}>
          {SORTS.map((s) => <option key={s} value={s}>{a.sorts[s]}</option>)}
        </Select>
        <button className="h-10 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground">{a.filters.apply}</button>
        {filtered ? (
          <Link href={ROUTES.assets.list()} className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" />{a.filters.reset}</Link>
        ) : null}
      </form>

      <div className="rounded-3xl border border-outline-variant bg-surface-raised overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{a.columns.asset}</th>
                <th className="px-4 py-3 text-start font-semibold">{a.columns.serial}</th>
                <th className="px-4 py-3 text-start font-semibold">{a.columns.status}</th>
                <th className="px-4 py-3 text-start font-semibold">{a.columns.holder}</th>
                <th className="px-4 py-3 text-end font-semibold">{a.columns.value}</th>
                <th className="px-4 py-3 text-start font-semibold">{a.columns.warranty}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {items.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-muted">{a.empty}</td></tr> : null}
              {items.map((item) => (
                <tr key={item.id} className="align-top hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 min-w-56">
                    <Link href={ROUTES.assets.detail(item.id)} className="font-semibold text-ink hover:text-accent hover:underline">{item.name}</Link>
                    <div className="text-[11px] text-ink-muted"><bdi dir="ltr">{item.asset_tag}</bdi> · {isAr ? item.category.name_ar : item.category.name_en}{item.brand ? ` · ${[item.brand, item.model].filter(Boolean).join(" ")}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink" dir="ltr">{item.serial_number ?? "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${ASSET_STATUS_STYLE[item.status]}`}>{a.statuses[item.status as keyof typeof a.statuses]}</span>
                    <div className="mt-1 text-ink-muted">{a.conditions[item.condition as keyof typeof a.conditions]}</div>
                    {item.open_handover ? <Link href={ROUTES.assets.handover(item.open_handover.id)} className="mt-1 block text-[11px] font-semibold text-amber-600 dark:text-amber-300">{a.handoverInProgress}</Link> : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {item.holder ? <Link href={ROUTES.hr.employee(item.holder.id)} className="text-ink hover:text-accent">{isAr ? item.holder.name_ar : item.holder.name_en}</Link> : <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-end text-xs whitespace-nowrap tabular-nums">{item.purchase_cost !== undefined ? formatCurrencyValue(item.purchase_cost, item.currency, isAr) : "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-muted">{item.warranty_until ? formatDate(item.warranty_until, locale) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
