"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, Share2, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { field, primaryButton, secondaryButton } from "../account/ui";
import { clearCart, useCart, writeCart } from "./cart";
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
  } catch {
    return;
  }
};

export function CartView({
  locale,
  currency,
  shopHref,
  fulfilments,
}: {
  locale: string;
  currency: string;
  shopHref: string;
  fulfilments: { delivery: boolean; pickup: boolean };
}) {
  const { t, site } = useTranslation();
  const lines = useCart();
  const [coupon, setCoupon] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState("");
  const [sharedCopied, setSharedCopied] = React.useState(false);
  const [fulfilment, setFulfilment] = React.useState<"delivery" | "pickup">(
    fulfilments.delivery ? "delivery" : "pickup",
  );
  React.useEffect(() => {
    setAppliedCoupon(remembered(COUPON_KEY));
    const saved = remembered(FULFILMENT_KEY);
    if (
      (saved === "delivery" && fulfilments.delivery) ||
      (saved === "pickup" && fulfilments.pickup)
    )
      setFulfilment(saved);
  }, [fulfilments.delivery, fulfilments.pickup]);

  const { quote, loading, failed, retry } = useQuote(lines, appliedCoupon, fulfilment);
  const displayCurrency = quote?.currency || currency;
  const name = (l: {
    nameEn: string;
    nameAr: string;
    variantEn: string;
    variantAr: string;
  }) =>
    [
      locale === "ar" ? l.nameAr || l.nameEn : l.nameEn,
      locale === "ar" ? l.variantAr : l.variantEn,
    ]
      .filter(Boolean)
      .join(" · ");
  const setQuantity = (productId: string, variantKey: string, quantity: number) =>
    writeCart(
      lines
        .map((l) =>
          l.productId === productId &&
          ((l.variantId ?? "") === variantKey || !l.variantId)
            ? { ...l, quantity }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  const blocked = loading || !quote?.lines.length || (quote?.problems.length ?? 0) > 0;
  const couponProblem = quote?.problems.find((p) => p.problem.startsWith("coupon"));

  const handleShareCart = async () => {
    try {
      const summary = (quote?.lines ?? [])
        .map((l) => `${l.quantity}x ${name(l)}`)
        .join(", ");
      await navigator.clipboard.writeText(`${summary} — ${window.location.href}`);
      setSharedCopied(true);
      setTimeout(() => setSharedCopied(false), 1800);
    } catch {
      return;
    }
  };

  return (
    <div className="bg-m3-surface text-m3-on-surface pb-20">
      <div className="shell page-heading space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink font-display">
            {t("store.cartTitle")}
          </h1>
          {lines.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareCart}
                className={secondaryButton}
              >
                <Share2 className="w-4 h-4 me-1.5" aria-hidden="true" />
                {sharedCopied
                  ? t("store.linkCopied", { defaultValue: "Copied" })
                  : t("store.shareCart", { defaultValue: "Share Cart" })}
              </button>
              <button
                type="button"
                data-testid="cart-clear-all"
                onClick={() => clearCart()}
                className={`${secondaryButton} text-m3-error`}
              >
                <Trash2 className="w-4 h-4 me-1.5" aria-hidden="true" />
                {t("store.clearCart", { defaultValue: "Clear Cart" })}
              </button>
            </div>
          )}
        </div>
        {lines.length === 0 ? (
          <div className="space-y-4">
            <p className="text-ink-muted">{t("store.cartEmpty")}</p>
            <Link href={shopHref} className={secondaryButton}>
              {t("store.continueShopping")}
            </Link>
          </div>
        ) : (
          <div
            className={`grid ${
              site?.commerce?.orderLayout === "stacked" ? "" : "lg:grid-cols-[1fr_340px]"
            } gap-8 items-start`}
          >
            <div className="space-y-3">
              <ul className="space-y-3" data-testid="cart-lines">
                {quote?.lines.map((l) => (
                  <li
                    key={`${l.productId}-${l.variantKey}`}
                    className="flex flex-wrap sm:flex-nowrap gap-4 rounded-brand bg-m3-surface-container-low border border-m3-outline-variant p-4"
                  >
                    <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-m3-surface-container grid place-items-center">
                      {l.imageUrl ? (
                        <ContentImage
                          src={l.imageUrl}
                          alt=""
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-ink-muted" aria-hidden="true" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="font-semibold text-ink">{name(l)}</p>
                      <p className="text-sm text-ink-muted">
                        {formatPrice(l.unitPrice, displayCurrency, locale)}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={t("store.decreaseQuantity", { defaultValue: "Decrease" })}
                          onClick={() => setQuantity(l.productId, l.variantKey, Math.max(0, l.quantity - 1))}
                          className="h-8 w-8 rounded-lg border border-m3-outline-variant grid place-items-center hover:bg-m3-surface-container-high"
                        >
                          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          aria-label={t("store.quantityFor", { name: name(l) })}
                          value={l.quantity}
                          onChange={(e) =>
                            setQuantity(
                              l.productId,
                              l.variantKey,
                              Math.max(1, Math.min(999, Math.floor(Number(e.target.value) || 1))),
                            )
                          }
                          className={`${field} w-16 py-1.5 text-center`}
                        />
                        <button
                          type="button"
                          aria-label={t("store.increaseQuantity", { defaultValue: "Increase" })}
                          onClick={() => setQuantity(l.productId, l.variantKey, Math.min(999, l.quantity + 1))}
                          className="h-8 w-8 rounded-lg border border-m3-outline-variant grid place-items-center hover:bg-m3-surface-container-high"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("store.remove", { name: name(l) })}
                          onClick={() => setQuantity(l.productId, l.variantKey, 0)}
                          className="p-2 rounded-lg text-m3-error hover:bg-m3-error/10 ms-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-ink whitespace-nowrap">
                      {formatPrice(
                        Math.round(l.unitPrice * l.quantity * 1000) / 1000,
                        displayCurrency,
                        locale,
                      )}
                    </p>
                  </li>
                ))}
              </ul>
              {quote?.problems
                .filter((p) => !p.problem.startsWith("coupon"))
                .map((p) => (
                  <div
                    key={`${p.productId}-${p.variantId ?? ""}`}
                    role="alert"
                    className="flex items-center gap-3 text-sm text-m3-error"
                  >
                    <p>{t(`store.problems.${p.problem}`)}</p>
                    {p.productId && (
                      <button
                        type="button"
                        onClick={() => setQuantity(p.productId, p.variantId ?? "", 0)}
                        className="min-h-11 underline"
                      >
                        {t("store.removeItem")}
                      </button>
                    )}
                  </div>
                ))}
            </div>

            <aside
              aria-busy={loading}
              className="space-y-5 rounded-brand bg-m3-surface-container-low border border-m3-outline-variant p-5 lg:sticky lg:top-28"
            >
              {failed && (
                <div role="alert" className="space-y-2 text-sm">
                  <p>{t("account.errors.generic")}</p>
                  <button type="button" className={secondaryButton} onClick={retry}>
                    {t("common.tryAgain")}
                  </button>
                </div>
              )}
              {fulfilments.delivery && fulfilments.pickup && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-ink">
                    {t("store.fulfilment")}
                  </legend>
                  <div className="flex gap-2">
                    {(["delivery", "pickup"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setFulfilment(option);
                          remember(FULFILMENT_KEY, option);
                        }}
                        className={`${secondaryButton} flex-1 ${
                          fulfilment === option ? "border-accent text-ink" : ""
                        }`}
                      >
                        {t(`store.fulfilments.${option}`)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = coupon.trim().toUpperCase();
                  setAppliedCoupon(code);
                  remember(COUPON_KEY, code);
                }}
              >
                <input
                  aria-label={t("store.coupon")}
                  placeholder={t("store.coupon")}
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className={`${field} py-2`}
                  dir="ltr"
                />
                <button type="submit" className={secondaryButton}>
                  {t("store.applyCoupon")}
                </button>
              </form>
              {appliedCoupon && (
                <button
                  type="button"
                  className="text-sm text-m3-primary underline min-h-11"
                  onClick={() => {
                    setCoupon("");
                    setAppliedCoupon("");
                    remember(COUPON_KEY, "");
                  }}
                >
                  {t("store.removeCoupon")}
                </button>
              )}
              {appliedCoupon &&
                (couponProblem ? (
                  <p role="alert" className="text-sm text-m3-error">
                    {t(`store.problems.${couponProblem.problem}`)}
                  </p>
                ) : quote?.couponCode ? (
                  <p className="text-sm text-m3-primary">
                    {t("store.couponApplied", { code: quote.couponCode })}
                  </p>
                ) : null)}
              {quote && <CartTotals quote={quote} delivery={fulfilment === "delivery"} />}
              <Link
                href={`/${locale}/checkout`}
                aria-disabled={blocked}
                tabIndex={blocked ? -1 : undefined}
                className={`${primaryButton} w-full ${
                  blocked ? "pointer-events-none opacity-50" : ""
                }`}
                data-testid="cart-checkout"
              >
                {t("store.checkout")}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
