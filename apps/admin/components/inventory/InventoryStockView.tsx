"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, Boxes, PackagePlus, Search } from "lucide-react";
import { Card, CurrencyDisplay, Input, Select, formatCurrencyValue } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { StockRow, WarehouseRecord } from "@platform/database";
import { daysToExpiry } from "@platform/database/constants/inventory";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { StockChangeModal, TransferModal, useLocationOptions, type StockTarget } from "./StockDialogs";
import { PageHeader } from "../layout/PageHeader";

interface InventoryStockViewProps {
  rows: StockRow[];
  total: number;
  page: number;
  pageSize: number;
  totalValue: number;
  filters: { q: string; warehouse: string; filter: string };
  warehouses: WarehouseRecord[];
  expiring: { product_id: string; sku: string; name_en: string; name_ar: string; batch: string; expiry: string; on_hand: number }[];
  currency: string;
  canEdit: boolean;
}

const qty = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 3 });

/** Inventory → stock: on hand, reserved and available per item, with receive, adjust, write off and transfer. */
export function InventoryStockView({ rows, total, page, pageSize, totalValue, filters, warehouses, expiring, currency, canEdit }: InventoryStockViewProps) {
  const { t, locale } = useAdminLocale();
  const copy = t.inventory.stock;
  const router = useRouter();
  const locations = useLocationOptions(warehouses);
  const [search, setSearch] = React.useState(filters.q);
  const [dialog, setDialog] = React.useState<{ kind: "change" | "transfer"; target: StockTarget } | null>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: Partial<typeof filters> & { page?: number }) => {
    const params = new URLSearchParams(Object.entries({ ...filters, ...next, page: String(next.page ?? 1) }).filter(([, value]) => value && value !== "1") as [string, string][]);
    return params.toString() ? `${ROUTES.inventory.stock}?${params}` : ROUTES.inventory.stock;
  };
  const name = (row: { name_en: string; name_ar: string }) => (locale === "ar" ? row.name_ar || row.name_en : row.name_en || row.name_ar);
  const target = (row: StockRow): StockTarget => ({ productId: row.product_id, variantId: row.variant_id, name: [name(row), locale === "ar" ? row.variant_ar : row.variant_en].filter(Boolean).join(" · "), trackBatches: row.track_batches });
  const done = () => {
    setDialog(null);
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        actions={<p className="text-sm font-semibold text-ink" data-testid="stock-value">{formatMessage(copy.totalValue, { value: formatCurrencyValue(totalValue, currency, locale === "ar") })}</p>}
      />

      {expiring.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/[0.06]" data-page-section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />{copy.expiring}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {expiring.map((b) => {
              const days = daysToExpiry(b.expiry) ?? 0;
              return (
                <li key={`${b.product_id}-${b.batch}`} className="flex flex-wrap gap-x-3 text-ink">
                  <Link href={ROUTES.products.detail(b.product_id)} className="font-medium hover:text-accent">{name(b)}</Link>
                  <span className="font-mono text-xs text-ink-muted" dir="ltr">{b.sku} · {b.batch}</span>
                  <span className="text-xs text-ink-muted">{qty(b.on_hand)}</span>
                  <span className={`text-xs font-semibold ${days < 0 ? "text-rose-600" : "text-amber-700 dark:text-amber-300"}`}>{days < 0 ? copy.expired : formatMessage(copy.expiresIn, { days })}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <form role="search" className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); router.push(href({ q: search.trim() })); }}>
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </div>
        <Select aria-label={t.inventory.counts.warehouse} value={filters.warehouse} onChange={(e) => router.push(href({ warehouse: e.target.value }))} className="rounded-xl sm:w-52">
          <option value="">{copy.allWarehouses}</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{locale === "ar" ? w.name_ar : w.name_en}</option>)}
        </Select>
        <Select aria-label={copy.filterAll} value={filters.filter} onChange={(e) => router.push(href({ filter: e.target.value }))} className="rounded-xl sm:w-44">
          <option value="">{copy.filterAll}</option>
          <option value="low">{copy.filterLow}</option>
          <option value="out">{copy.filterOut}</option>
        </Select>
      </form>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Boxes className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{filters.q || filters.warehouse || filters.filter ? copy.emptyFiltered : copy.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="stock-table">
              <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.item}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.sku}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.columns.onHand}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold hidden md:table-cell">{copy.columns.reserved}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.columns.available}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold hidden lg:table-cell">{copy.columns.reorderPoint}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold hidden lg:table-cell">{copy.columns.value}</th>
                  {canEdit && <th scope="col" className="px-4 py-3"><span className="sr-only">{copy.change}</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((row) => (
                  <tr key={`${row.product_id}-${row.variant_id ?? ""}`} className="hover:bg-ink/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={ROUTES.products.detail(row.product_id)} className="font-semibold text-ink hover:text-accent">{name(row)}</Link>
                      {(row.variant_en || row.variant_ar) && <span className="block text-xs text-ink-muted">{locale === "ar" ? row.variant_ar : row.variant_en}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">{row.sku}</td>
                    <td className="px-4 py-3 text-end tabular-nums">{qty(row.on_hand)}</td>
                    <td className="px-4 py-3 text-end tabular-nums hidden md:table-cell text-ink-muted">{qty(row.reserved)}</td>
                    <td className="px-4 py-3 text-end tabular-nums font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {row.low && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{copy.low}</span>}
                        {qty(row.available)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums hidden lg:table-cell text-ink-muted">{row.reorder_point == null ? "—" : qty(row.reorder_point)}</td>
                    <td className="px-4 py-3 text-end hidden lg:table-cell whitespace-nowrap"><CurrencyDisplay amount={row.value} currency={currency} /></td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label={formatMessage(copy.changeFor, { name: target(row).name })} title={copy.change} onClick={() => setDialog({ kind: "change", target: target(row) })} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-accent">
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          {locations.length > 1 && (
                            <button type="button" aria-label={formatMessage(copy.transferFor, { name: target(row).name })} title={copy.transfer} onClick={() => setDialog({ kind: "transfer", target: target(row) })} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-accent">
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-outline-variant px-4 py-3 text-xs">
          <span className="text-ink-muted">{formatMessage(t.products.showing, { from: total ? (page - 1) * pageSize + 1 : 0, to: Math.min(total, page * pageSize), total })}</span>
          {pages > 1 && (
            <nav aria-label={t.products.pages} className="flex items-center gap-4">
              {page > 1 && <Link href={href({ page: page - 1 })} className="font-semibold text-primary dark:text-mint">{t.products.previous}</Link>}
              <span className="text-ink-muted">{formatMessage(t.products.pageOf, { page, pages })}</span>
              {page < pages && <Link href={href({ page: page + 1 })} className="font-semibold text-primary dark:text-mint">{t.products.next}</Link>}
            </nav>
          )}
        </div>
      </Card>

      {dialog?.kind === "change" && <StockChangeModal target={dialog.target} locations={locations} currency={currency} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "transfer" && <TransferModal target={dialog.target} locations={locations} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  );
}
