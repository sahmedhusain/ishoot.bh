"use client";

import type { CartQuote } from "@platform/database";
import { Award, Sparkles, Wallet } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";

export function CartTotals({ quote, delivery }: { quote: CartQuote; delivery: boolean }) {
  const { t, locale } = useTranslation();
  const money = (value: number) => formatPrice(value, quote.currency, locale);
  const row = "flex justify-between gap-4 text-sm";
  const accountDiscount = (quote as CartQuote & { accountDiscount?: number }).accountDiscount ?? 0;
  const pointsDiscount = (quote as CartQuote & { pointsDiscount?: number }).pointsDiscount ?? 0;
  const pointsRedeemed = (quote as CartQuote & { pointsRedeemed?: number }).pointsRedeemed ?? 0;
  const walletApplied = (quote as CartQuote & { walletApplied?: number }).walletApplied ?? 0;
  const amountDue = (quote as CartQuote & { amountDue?: number }).amountDue ?? quote.total;
  const pointsEarned = (quote as CartQuote & { pointsEarned?: number }).pointsEarned ?? 0;
  const raffleTickets = (quote as CartQuote & { raffleTickets?: number }).raffleTickets ?? 0;

  return (
    <dl className="space-y-2" data-testid="cart-totals">
      <div className={row}><dt className="text-ink-muted">{t("store.subtotal")}</dt><dd>{money(quote.subtotal)}</dd></div>
      {quote.discount > 0 && <div className={row}><dt className="text-ink-muted">{t("store.discount")}</dt><dd>- {money(quote.discount)}</dd></div>}
      {accountDiscount > 0 && (
        <div className={row}>
          <dt className="text-ink-muted">{t("store.accountDiscountLabel", { defaultValue: "Member Discount" })}</dt>
          <dd className="text-emerald-600 dark:text-emerald-400">- {money(accountDiscount)}</dd>
        </div>
      )}
      {pointsDiscount > 0 && (
        <div className={row}>
          <dt className="text-ink-muted">
            {t("store.pointsRedeemedLabel", { points: pointsRedeemed, defaultValue: `Loyalty Points (${pointsRedeemed})` })}
          </dt>
          <dd className="text-amber-600 dark:text-amber-400">- {money(pointsDiscount)}</dd>
        </div>
      )}
      {delivery && <div className={row}><dt className="text-ink-muted">{t("store.delivery")}</dt><dd>{quote.deliveryFee > 0 ? money(quote.deliveryFee) : t("store.freeDelivery")}</dd></div>}
      {quote.vatAmount > 0 && <div className={row}><dt className="text-ink-muted">{t("store.vat")}</dt><dd>{money(quote.vatAmount)}</dd></div>}
      <div className={`${row} border-t border-m3-outline-variant pt-2 text-base font-bold text-ink`}>
        <dt>{t("store.total")}</dt>
        <dd data-testid="cart-total">{money(quote.total)}</dd>
      </div>
      {walletApplied > 0 && (
        <>
          <div className={`${row} text-xs text-m3-primary font-medium`}>
            <dt className="inline-flex items-center gap-1"><Wallet className="w-3.5 h-3.5" aria-hidden="true" />{t("store.walletCreditApplied", { defaultValue: "Wallet Credit" })}</dt>
            <dd>- {money(walletApplied)}</dd>
          </div>
          <div className={`${row} text-sm font-bold text-ink`}>
            <dt>{t("store.amountDueLabel", { defaultValue: "Amount Due" })}</dt>
            <dd data-testid="cart-amount-due">{money(amountDue)}</dd>
          </div>
        </>
      )}
      {(pointsEarned > 0 || raffleTickets > 0) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-m3-outline-variant/60 text-xs">
          {pointsEarned > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
              <Award className="w-3.5 h-3.5" aria-hidden="true" />
              +{pointsEarned} {t("store.pointsShort", { defaultValue: "pts" })}
            </span>
          )}
          {raffleTickets > 0 && (
            <span className="inline-flex items-center gap-1 text-m3-primary font-medium">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {t("store.raffleTicketEstimate", { count: raffleTickets, defaultValue: `${raffleTickets} raffle entry` })}
            </span>
          )}
        </div>
      )}
    </dl>
  );
}
