"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Card, CurrencyDisplay, formatDate } from "@platform/ui";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface PriceRow {
  order_id: string;
  number: string;
  date: string;
  supplier: string;
  quantity: number;
  unit_price: number;
}

/** On a product: what it was bought at, from whom, newest first. */
export function PurchasePricesCard({ rows, currency }: { rows: PriceRow[]; currency: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.performance;
  return (
    <Card className="p-5 space-y-3" data-testid="purchase-prices" data-page-section>
      <h2 className="font-bold text-ink flex items-center gap-2"><History className="w-4 h-4 text-accent" aria-hidden="true" />{copy.priceHistory}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.noHistory}</p>
      ) : (
        <ul className="divide-y divide-outline-variant text-sm">
          {rows.map((r) => (
            <li key={`${r.order_id}-${r.unit_price}-${r.quantity}`} className="flex flex-wrap items-center gap-x-3 py-2">
              <span className="text-ink-muted">{formatDate(r.date, locale)}</span>
              <Link href={ROUTES.procurement.order(r.order_id)} className="font-mono text-xs hover:text-accent" dir="ltr">{r.number}</Link>
              <span className="text-ink">{r.supplier}</span>
              <span className="text-xs text-ink-muted tabular-nums">× {r.quantity}</span>
              <span className="ms-auto font-semibold"><CurrencyDisplay amount={r.unit_price} currency={currency} /></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
