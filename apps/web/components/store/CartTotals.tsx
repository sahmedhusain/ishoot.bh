"use client";

import type { CartQuote } from "@platform/database";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";

export function CartTotals({ quote, delivery }: { quote: CartQuote; delivery: boolean }) {
  const { t, locale } = useTranslation();
  const money = (value: number) => formatPrice(value, quote.currency, locale);
  const row = "flex justify-between gap-4 text-sm";
  return (
    <dl className="space-y-2" data-testid="cart-totals">
      <div className={row}><dt className="text-ink-muted">{t("store.subtotal")}</dt><dd>{money(quote.subtotal)}</dd></div>
      {quote.discount > 0 && <div className={row}><dt className="text-ink-muted">{t("store.discount")}</dt><dd>- {money(quote.discount)}</dd></div>}
      {delivery && <div className={row}><dt className="text-ink-muted">{t("store.delivery")}</dt><dd>{quote.deliveryFee > 0 ? money(quote.deliveryFee) : t("store.freeDelivery")}</dd></div>}
      {quote.vatAmount > 0 && <div className={row}><dt className="text-ink-muted">{t("store.vat")}</dt><dd>{money(quote.vatAmount)}</dd></div>}
      <div className={`${row} border-t border-white/10 pt-2 text-base font-bold text-white`}><dt>{t("store.total")}</dt><dd data-testid="cart-total">{money(quote.total)}</dd></div>
    </dl>
  );
}
