"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Package, Plus, Search } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ProductCategoryRecord, ProductRow } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { setProductsActiveAction } from "../../app/actions/products";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { ContentImage } from "../shared/ContentImage";

interface ProductsListViewProps {
  rows: ProductRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; category: string; status: string };
  categories: ProductCategoryRecord[];
  currency: string;
  canCreate: boolean;
  canEdit: boolean;
}

/** Products → list: search, filters, paging and switching several products on or off sale. */
export function ProductsListView({ rows, total, page, pageSize, filters, categories, currency, canCreate, canEdit }: ProductsListViewProps) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.products;
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.q);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const name = (en: string | null, ar: string | null) => (locale === "ar" ? ar || en : en || ar) ?? "";
  const href = (next: Partial<typeof filters> & { page?: number }) => {
    const params = new URLSearchParams(Object.entries({ ...filters, ...next, page: String(next.page ?? 1) }).filter(([, value]) => value && value !== "1") as [string, string][]);
    const query = params.toString();
    return query ? `${ROUTES.products.list}?${query}` : ROUTES.products.list;
  };
  React.useEffect(() => setSelected([]), [rows]);

  const bulk = (isActive: boolean) => confirmAction({ description: formatMessage(copy.bulkConfirm, { count: selected.length }), confirmMatchText: String(selected.length), onConfirm: async () => {
    setBusy(true);
    setError("");
    try {
      await setProductsActiveAction(selected, isActive);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  } });

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id));
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canCreate && (
          <Link href={ROUTES.products.new} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 h-9 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            {copy.newProduct}
          </Link>
        )}
      </div>

      <form
        role="search"
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(href({ q: search.trim() }));
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </div>
        <Select aria-label={copy.columns.category} value={filters.category} onChange={(e) => router.push(href({ category: e.target.value }))} className="rounded-xl sm:w-52">
          <option value="">{copy.allCategories}</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{name(category.name_en, category.name_ar)}</option>)}
        </Select>
        <Select aria-label={copy.columns.status} value={filters.status} onChange={(e) => router.push(href({ status: e.target.value }))} className="rounded-xl sm:w-40">
          <option value="">{copy.allStatuses}</option>
          <option value="active">{copy.statusActive}</option>
          <option value="inactive">{copy.statusInactive}</option>
        </Select>
      </form>

      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}

      <Card className="overflow-hidden">
        {canEdit && selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-accent/[0.06] px-4 py-2.5 text-sm">
            <span className="font-semibold">{formatMessage(copy.selected, { count: selected.length })}</span>
            <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => bulk(true)}>{copy.activate}</Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => bulk(false)}>{copy.deactivate}</Button>
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Package className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{filters.q || filters.category || filters.status ? copy.emptyFiltered : copy.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                <tr>
                  {canEdit && (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input type="checkbox" aria-label={copy.selectAll} className="h-4 w-4 accent-accent" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? rows.map((row) => row.id) : [])} />
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.product}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.sku}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold hidden md:table-cell">{copy.columns.category}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.columns.price}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold hidden sm:table-cell">{copy.columns.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {rows.map((row) => {
                  const title = name(row.name_en, row.name_ar);
                  return (
                    <tr key={row.id} className="hover:bg-ink/[0.02] transition-colors">
                      {canEdit && (
                        <td className="px-4 py-3">
                          <input type="checkbox" aria-label={formatMessage(copy.select, { name: title })} className="h-4 w-4 accent-accent" checked={selected.includes(row.id)} onChange={(e) => setSelected((current) => (e.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)))} />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link href={ROUTES.products.detail(row.id)} className="flex items-center gap-3 font-semibold text-ink hover:text-accent">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink/5 grid place-items-center">
                            {row.image_url ? <ContentImage src={row.image_url} alt="" width={40} height={40} className="h-full w-full object-cover" /> : <Package className="w-4 h-4 text-ink-muted" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">{title}</span>
                            <span className="flex items-center gap-2 text-xs font-normal text-ink-muted">
                              {row.variant_count > 0 && formatMessage(copy.variantCount, { count: row.variant_count })}
                              {row.on_website && <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" aria-hidden="true" />{copy.onWebsite}</span>}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{row.sku}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-ink-muted">{row.category_id ? name(row.category_en, row.category_ar) : copy.uncategorised}</td>
                      <td className="px-4 py-3 text-end whitespace-nowrap"><CurrencyDisplay amount={row.price} currency={currency} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${row.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-ink/10 text-ink-muted"}`}>{row.is_active ? copy.statusActive : copy.statusInactive}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-ink/10 px-4 py-3 text-xs">
          <span className="text-ink-muted">{formatMessage(copy.showing, { from: total ? (page - 1) * pageSize + 1 : 0, to: Math.min(total, page * pageSize), total })}</span>
          {pages > 1 && (
            <nav aria-label={copy.pages} className="flex items-center gap-4">
              {page > 1 && <Link href={href({ page: page - 1 })} className="font-semibold text-primary dark:text-mint">{copy.previous}</Link>}
              <span className="text-ink-muted">{formatMessage(copy.pageOf, { page, pages })}</span>
              {page < pages && <Link href={href({ page: page + 1 })} className="font-semibold text-primary dark:text-mint">{copy.next}</Link>}
            </nav>
          )}
        </div>
      </Card>
    </div>
  );
}
