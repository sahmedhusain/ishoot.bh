"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { Card, CurrencyDisplay, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { PURCHASE_ORDER_STATUSES } from "@platform/database/constants/procurement";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { StatusPill } from "./StatusPill";
import { PageHeader } from "../layout/PageHeader";

interface Row {
  id: string;
  number: string;
  supplier: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  total: number;
}

/** Purchasing → purchase orders. */
export function PurchaseOrdersListView({ rows, total, page, pageSize, filters, currency, canCreate }: { rows: Row[]; total: number; page: number; pageSize: number; filters: { q: string; status: string }; currency: string; canCreate: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.orders;
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: Partial<typeof filters> & { page?: number }) => {
    const params = new URLSearchParams(Object.entries({ ...filters, ...next, page: String(next.page ?? 1) }).filter(([, value]) => value && value !== "1") as [string, string][]);
    return params.toString() ? `${ROUTES.procurement.orders}?${params}` : ROUTES.procurement.orders;
  };
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={canCreate && (
          <Link href={ROUTES.procurement.newOrder()} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 h-9 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            {copy.new}
          </Link>
        )}
      />
      <form role="search" className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); router.push(href({ q: search.trim() })); }}>
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </div>
        <Select aria-label={t.procurement.common.status} value={filters.status} onChange={(e) => router.push(href({ status: e.target.value }))} className="rounded-xl sm:w-52">
          <option value="">{copy.allStatuses}</option>
          {PURCHASE_ORDER_STATUSES.map((status) => <option key={status} value={status}>{(t.procurement.statuses as Record<string, string>)[status]}</option>)}
        </Select>
      </form>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ShoppingCart className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={ROUTES.procurement.order(o.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold text-ink" dir="ltr">{o.number}</span>
                  <StatusPill status={o.status} />
                  <span className="text-sm text-ink">{o.supplier}</span>
                  <span className="text-xs text-ink-muted">{formatDate(o.order_date, locale)}</span>
                  <span className="ms-auto text-sm font-semibold"><CurrencyDisplay amount={o.total} currency={currency} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label={t.products.pages} className="flex items-center justify-between border-t border-outline-variant px-4 py-3 text-xs">
            {page > 1 ? <Link href={href({ page: page - 1 })} className="font-semibold text-primary dark:text-mint">{t.products.previous}</Link> : <span />}
            <span className="text-ink-muted">{formatMessage(t.products.pageOf, { page, pages })}</span>
            {page < pages ? <Link href={href({ page: page + 1 })} className="font-semibold text-primary dark:text-mint">{t.products.next}</Link> : <span />}
          </nav>
        )}
      </Card>
    </div>
  );
}
