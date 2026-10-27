"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { Card, CurrencyDisplay, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { MovementRecord, WarehouseRecord } from "@platform/database";
import { MOVEMENT_TYPES, isAdjustmentReason } from "@platform/database/constants/inventory";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

type Row = MovementRecord & { sku: string; name_en: string; name_ar: string; by: string | null };

interface StockMovementsViewProps {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  filters: { productId: string; warehouse: string; type: string; from: string; to: string };
  warehouses: WarehouseRecord[];
  currency: string;
}

/** Inventory → stock movements: the ledger, filtered by product, warehouse, type and dates. */
export function StockMovementsView({ rows, total, page, pageSize, filters, warehouses, currency }: StockMovementsViewProps) {
  const { t, locale } = useAdminLocale();
  const copy = t.inventory.movements;
  const router = useRouter();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const base = ROUTES.inventory.movements();
  const href = (next: Partial<typeof filters> & { page?: number }) => {
    const params = new URLSearchParams(Object.entries({ ...filters, ...next, page: String(next.page ?? 1) }).filter(([, value]) => value && value !== "1") as [string, string][]);
    return params.toString() ? `${base}?${params}` : base;
  };
  const typeName = (type: string) => (t.inventory.movementTypes as Record<string, string>)[type] ?? type;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div data-page-header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
        <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2" data-page-toolbar>
        <Select aria-label={copy.columns.type} value={filters.type} onChange={(e) => router.push(href({ type: e.target.value }))} className="rounded-xl sm:w-48">
          <option value="">{copy.allTypes}</option>
          {MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{typeName(type)}</option>)}
        </Select>
        <Select aria-label={t.inventory.counts.warehouse} value={filters.warehouse} onChange={(e) => router.push(href({ warehouse: e.target.value }))} className="rounded-xl sm:w-52">
          <option value="">{t.inventory.stock.allWarehouses}</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{locale === "ar" ? w.name_ar : w.name_en}</option>)}
        </Select>
        <Input type="date" aria-label={copy.from} value={filters.from} onChange={(e) => router.push(href({ from: e.target.value }))} className="rounded-xl sm:w-44" />
        <Input type="date" aria-label={copy.to} value={filters.to} onChange={(e) => router.push(href({ to: e.target.value }))} className="rounded-xl sm:w-44" />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <History className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="movements-table">
              <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.date}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.item}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.type}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold hidden md:table-cell">{copy.columns.location}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.columns.quantity}</th>
                  <th scope="col" className="px-4 py-3 text-end font-semibold hidden lg:table-cell">{copy.columns.unitCost}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold hidden lg:table-cell">{copy.columns.by}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">{formatDate(m.created_at, locale, "time")}</td>
                    <td className="px-4 py-3">
                      <Link href={ROUTES.products.detail(m.product_id)} className="font-medium text-ink hover:text-accent">{locale === "ar" ? m.name_ar || m.name_en : m.name_en || m.name_ar}</Link>
                      <span className="block font-mono text-xs text-ink-muted" dir="ltr">{m.sku}{m.batch ? ` · ${m.batch}` : ""}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{typeName(m.type)}</span>
                      {(m.reason || m.note) && <span className="block text-xs text-ink-muted">{[m.reason && isAdjustmentReason(m.reason) ? t.inventory.reasons[m.reason] : null, m.note].filter(Boolean).join(" · ")}</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs" dir="ltr">{m.location}</td>
                    <td className={`px-4 py-3 text-end tabular-nums font-semibold ${m.quantity < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`} dir="ltr">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className="px-4 py-3 text-end hidden lg:table-cell whitespace-nowrap"><CurrencyDisplay amount={m.unit_cost} currency={currency} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-ink-muted">{m.by ?? "—"}</td>
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
    </div>
  );
}
