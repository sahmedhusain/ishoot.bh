"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { field, primaryButton, secondaryButton } from "../account/ui";
import { useCart, writeCart } from "./cart";
import { CartTotals } from "./CartTotals";
import { useQuote } from "./useQuote";

export const COUPON_KEY = "platform-cart-coupon";
export const FULFILMENT_KEY = "platform-cart-fulfilment";
const remembered = (key: string) => {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};
const remember = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch { }
};

/** The cart page: lines priced by the server, quantities, coupon, delivery or pickup, then checkout. */
export function CartView({ locale, currency, shopHref, fulfilments }: { locale: string; currency: string; shopHref: string; fulfilments: { delivery: boolean; pickup: boolean } }) {
  const { t, site } = useTranslation();
  const lines = useCart();
  const [coupon, setCoupon] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState("");
  const [fulfilment, setFulfilment] = React.useState<"delivery" | "pickup">(fulfilments.delivery ? "delivery" : "pickup");
  React.useEffect(() => {
    setAppliedCoupon(remembered(COUPON_KEY));
    const saved = remembered(FULFILMENT_KEY);
    if ((saved === "delivery" && fulfilments.delivery) || (saved === "pickup" && fulfilments.pickup)) setFulfilment(saved);
  }, [fulfilments.delivery, fulfilments.pickup]);
  const { quote, loading, failed, retry } = useQuote(lines, appliedCoupon, fulfilment);
  const name = (l: { nameEn: string; nameAr: string; variantEn: string; variantAr: string }) => [locale === "ar" ? l.nameAr || l.nameEn : l.nameEn, locale === "ar" ? l.variantAr : l.variantEn].filter(Boolean).join(" · ");
  const setQuantity = (productId: string, variantKey: string, quantity: number) => writeCart(lines.map((l) => (l.productId === productId && (l.variantId ?? "") === variantKey ? { ...l, quantity } : l)).filter((l) => l.quantity > 0));
  const blocked = loading || !quote?.lines.length || (quote?.problems.length ?? 0) > 0;
  const couponProblem = quote?.problems.find((p) => p.problem.startsWith("coupon"));

  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading max-w-4xl space-y-8">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">{t("store.cartTitle")}</h1>
        {lines.length === 0 ? (
          <div className="space-y-4">
            <p className="text-ink-muted">{t("store.cartEmpty")}</p>
            <Link href={shopHref} className={secondaryButton}>{t("store.continueShopping")}</Link>
          </div>
        ) : (
          <div className={`grid ${site?.commerce?.orderLayout === "stacked" ? "" : "lg:grid-cols-[1fr_320px]"} gap-8 items-start`}>
            <div className="space-y-3">
              <ul className="space-y-3" data-testid="cart-lines">
                {quote?.lines.map((l) => (
                  <li key={`${l.productId}-${l.variantKey}`} className="flex flex-wrap sm:flex-nowrap gap-4 rounded-brand border border-m3-outline-variant p-4">
                    <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5 grid place-items-center">
                      {l.imageUrl ? <ContentImage src={l.imageUrl} alt="" width={80} height={80} className="h-full w-full object-cover" /> : <ShoppingBag className="w-6 h-6 text-ink-muted" aria-hidden="true" />}
                    </span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="font-semibold text-white">{name(l)}</p>
                      <p className="text-sm text-ink-muted">{formatPrice(l.unitPrice, currency, locale)}</p>
                      <div className="flex items-center gap-3">
                        <input type="number" min={1} max={999} aria-label={t("store.quantityFor", { name: name(l) })} value={l.quantity} onChange={(e) => setQuantity(l.productId, l.variantKey, Math.max(1, Math.min(999, Math.floor(Number(e.target.value) || 1))))} className={`${field} w-20 py-2`} />
                        <button type="button" aria-label={t("store.remove", { name: name(l) })} onClick={() => setQuantity(l.productId, l.variantKey, 0)} className="p-2 rounded-lg text-m3-error hover:bg-white/5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="font-semibold text-white whitespace-nowrap">{formatPrice(Math.round(l.unitPrice * l.quantity * 1000) / 1000, currency, locale)}</p>
                  </li>
                ))}
              </ul>
              {quote?.problems.filter((p) => !p.problem.startsWith("coupon")).map((p) => (
                <div key={`${p.productId}-${p.variantId ?? ""}`} role="alert" className="flex items-center gap-3 text-sm text-m3-error"><p>{t(`store.problems.${p.problem}`)}</p>{p.productId && <button type="button" onClick={() => setQuantity(p.productId, p.variantId ?? "", 0)} className="min-h-11 underline">{t("store.removeItem")}</button>}</div>
              ))}
            </div>

            <aside aria-busy={loading} className="space-y-5 rounded-brand bg-m3-surface-container-low p-5 lg:sticky lg:top-28">
              {failed && <div role="alert" className="space-y-2 text-sm"><p>{t("account.errors.generic")}</p><button type="button" className={secondaryButton} onClick={retry}>{t("common.tryAgain")}</button></div>}
              {fulfilments.delivery && fulfilments.pickup && (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold text-ink">{t("store.fulfilment")}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["delivery", "pickup"] as const).map((f) => (
                      <label key={f} className={`rounded-xl border px-3 py-2 text-sm text-center cursor-pointer ${fulfilment === f ? "border-m3-primary text-white" : "border-white/10 text-ink-muted"}`}>
                        <input type="radio" name="fulfilment" value={f} checked={fulfilment === f} onChange={() => { setFulfilment(f); remember(FULFILMENT_KEY, f); }} className="sr-only" />
                        {t(`store.fulfilments.${f}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const code = coupon.trim().toUpperCase(); setAppliedCoupon(code); remember(COUPON_KEY, code); }}>
                <input aria-label={t("store.coupon")} placeholder={t("store.coupon")} value={coupon} onChange={(e) => setCoupon(e.target.value)} className={`${field} py-2`} dir="ltr" />
                <button type="submit" className={secondaryButton}>{t("store.applyCoupon")}</button>
              </form>
              {appliedCoupon && <button type="button" className="text-sm text-m3-primary underline min-h-11" onClick={() => { setCoupon(""); setAppliedCoupon(""); remember(COUPON_KEY, ""); }}>{t("store.removeCoupon")}</button>}
              {appliedCoupon && (couponProblem ? <p role="alert" className="text-sm text-m3-error">{t(`store.problems.${couponProblem.problem}`)}</p> : quote?.couponCode ? <p className="text-sm text-m3-primary">{t("store.couponApplied", { code: quote.couponCode })}</p> : null)}
              {quote && <CartTotals quote={quote} delivery={fulfilment === "delivery"} />}
              <Link href={`/${locale}/checkout`} aria-disabled={blocked} tabIndex={blocked ? -1 : undefined} className={`${primaryButton} w-full ${blocked ? "pointer-events-none opacity-50" : ""}`} data-testid="cart-checkout">{t("store.checkout")}</Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
