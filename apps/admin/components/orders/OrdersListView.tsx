"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { Card, CurrencyDisplay, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { ORDER_CHANNELS, ORDER_STATUSES } from "@platform/database/constants/store";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { OrderStatusPill, PaymentStatusPill } from "./OrderPills";

interface Row {
  id: string;
  number: string;
  name: string;
  channel: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  placed_at: string;
}

/** Store → orders: every order with its status and payment, searchable and filtered. */
export function OrdersListView({ rows, total, page, pageSize, filters, currency, canCreate }: { rows: Row[]; total: number; page: number; pageSize: number; filters: { q: string; status: string; channel: string }; currency: string; canCreate: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.orders;
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: Partial<typeof filters> & { page?: number }) => {
    const params = new URLSearchParams(Object.entries({ ...filters, ...next, page: String(next.page ?? 1) }).filter(([, v]) => v && v !== "1") as [string, string][]);
    return params.toString() ? `${ROUTES.orders.list}?${params}` : ROUTES.orders.list;
  };
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canCreate && (
          <Link href={ROUTES.orders.new} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 h-9 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            {copy.nav.newSale}
          </Link>
        )}
      </div>
      <form role="search" className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); router.push(href({ q: search.trim() })); }}>
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </div>
        <Select aria-label={copy.allStatuses} value={filters.status} onChange={(e) => router.push(href({ status: e.target.value }))} className="rounded-xl sm:w-44">
          <option value="">{copy.allStatuses}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
        </Select>
        <Select aria-label={copy.allChannels} value={filters.channel} onChange={(e) => router.push(href({ channel: e.target.value }))} className="rounded-xl sm:w-40">
          <option value="">{copy.allChannels}</option>
          {ORDER_CHANNELS.map((c) => <option key={c} value={c}>{copy.channels[c]}</option>)}
        </Select>
      </form>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ShoppingBag className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10" data-testid="orders-list">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={ROUTES.orders.detail(o.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold text-ink" dir="ltr">{o.number}</span>
                  <OrderStatusPill status={o.status} />
                  <PaymentStatusPill status={o.payment_status} />
                  <span className="text-sm text-ink">{o.name}</span>
                  <span className="text-xs text-ink-muted">{(copy.channels as Record<string, string>)[o.channel]}</span>
                  <span className="text-xs text-ink-muted">{formatDate(o.placed_at, locale, "time")}</span>
                  <span className="ms-auto text-sm font-semibold"><CurrencyDisplay amount={o.total} currency={currency} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label={t.products.pages} className="flex items-center justify-between border-t border-ink/10 px-4 py-3 text-xs">
            {page > 1 ? <Link href={href({ page: page - 1 })} className="font-semibold text-primary dark:text-mint">{t.products.previous}</Link> : <span />}
            <span className="text-ink-muted">{formatMessage(t.products.pageOf, { page, pages })}</span>
            {page < pages ? <Link href={href({ page: page + 1 })} className="font-semibold text-primary dark:text-mint">{t.products.next}</Link> : <span />}
          </nav>
        )}
      </Card>
    </div>
  );
}
