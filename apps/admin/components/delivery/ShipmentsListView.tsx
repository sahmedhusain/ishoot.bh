"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Truck } from "lucide-react";
import { Card, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { SHIPMENT_STATUSES } from "@platform/database/constants/delivery";
import type { listShipments, shipmentCounts } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { LatePill, ShipmentStatusPill } from "./ShipmentPills";
import { PageHeader } from "../layout/PageHeader";

type Result = Awaited<ReturnType<typeof listShipments>>;
interface Filters {
  q: string;
  status: string;
  date: string;
  zone: string;
  late: boolean;
}

export function ShipmentsListView({ rows, total, page, pageSize, counts, zones, filters, currency }: Result & { counts: Awaited<ReturnType<typeof shipmentCounts>>; zones: { id: string; name_en: string; name_ar: string }[]; filters: Filters; currency: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery;
  const router = useRouter();
  const [search, setSearch] = React.useState(filters.q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const zoneName = (z: { name_en: string; name_ar: string }) => (locale === "ar" ? z.name_ar || z.name_en : z.name_en || z.name_ar);
  const href = (next: Partial<Filters> & { page?: number }) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.status) params.set("status", merged.status);
    if (merged.date) params.set("date", merged.date);
    if (merged.zone) params.set("zone", merged.zone);
    if (merged.late) params.set("late", "1");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    return params.toString() ? `${ROUTES.delivery.shipments}?${params}` : ROUTES.delivery.shipments;
  };
  const board = (["pending", "assigned", "out_for_delivery", "failed", "late"] as const).map((key) => ({ key, count: counts[key] ?? 0 }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="delivery-board">
        {board.map((b) => (
          <Link key={b.key} href={b.key === "late" ? href({ late: true, status: "" }) : href({ status: b.key, late: false })} className={`rounded-2xl border px-4 py-3 hover:border-accent ${b.key === "late" && b.count ? "border-rose-500/40 bg-rose-500/5" : "border-outline-variant bg-surface-raised dark:bg-surface"}`}>
            <p className="text-xs text-ink-muted">{copy.counts[b.key]}</p>
            <p className="text-2xl font-bold tabular-nums text-ink">{b.count}</p>
          </Link>
        ))}
      </div>
      <form role="search" className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); router.push(href({ q: search.trim() })); }}>
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
          <Input type="search" aria-label={copy.search} placeholder={copy.search} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 rounded-xl" />
        </div>
        <Select aria-label={copy.allStatuses} value={filters.status} onChange={(e) => router.push(href({ status: e.target.value, late: false }))} className="rounded-xl sm:w-44">
          <option value="">{copy.allStatuses}</option>
          {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
        </Select>
        {zones.length > 0 && (
          <Select aria-label={copy.allZones} value={filters.zone} onChange={(e) => router.push(href({ zone: e.target.value }))} className="rounded-xl sm:w-44">
            <option value="">{copy.allZones}</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{zoneName(z)}</option>)}
          </Select>
        )}
        <Input type="date" aria-label={copy.detail.slot} value={filters.date} onChange={(e) => router.push(href({ date: e.target.value }))} className="rounded-xl sm:w-44" />
      </form>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Truck className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant" data-testid="shipments-list">
            {rows.map((s) => (
              <li key={s.id}>
                <Link href={ROUTES.delivery.shipment(s.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold text-ink" dir="ltr">{s.number}</span>
                  <ShipmentStatusPill status={s.status} />
                  {s.late && <LatePill />}
                  <span className="text-sm text-ink">{s.recipient}</span>
                  <span className="text-xs text-ink-muted">{[s.area, locale === "ar" ? s.zone_ar : s.zone_en].filter(Boolean).join(" · ")}</span>
                  <span className="text-xs text-ink-muted">{s.slot ? `${formatDate(s.slot.date, locale)} ${s.slot.start}–${s.slot.end}` : formatMessage(copy.promised, { time: formatDate(s.promised_by, locale, "time") })}</span>
                  {s.cod_amount > 0 && <span className="ms-auto text-xs font-semibold text-amber-700 dark:text-amber-300">{formatMessage(copy.cod, { amount: formatCurrencyValue(s.cod_amount, currency, locale === "ar") })}</span>}
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
