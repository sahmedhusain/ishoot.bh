"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@platform/ui";
import {
  Award,
  Check,
  Copy,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ticket,
  Truck,
  Zap,
} from "lucide-react";
import { calculatePointsEarned, calculateRaffleTickets } from "@platform/database/constants/store";
import { formatPrice } from "../../lib/site-copy";
import { useTranslation } from "../../hooks/useTranslation";
import { addToCart } from "./cart";
import { useStorePreferences } from "../layout/StorePreferencesBar";
import { showSnackbar } from "../ui/snackbar";

export interface ProductOption {
  nameEn: string;
  nameAr: string;
  values: { en: string; ar: string }[];
}

export interface StoreProduct {
  product_id: string;
  sku?: string;
  options: ProductOption[];
  price: number;
  available: number | null;
  variants: { id: string; values: string[]; label_en: string; label_ar: string; price: number; available: number | null }[];
}

export function AddToCart({
  product,
  currency,
  brand,
  compareAtPrice,
  loyaltyEnabled = true,
  raffleEnabled = true,
  pointsPerUnit = 10,
  raffleSpendUnit = 10,
}: {
  product: StoreProduct;
  currency: string;
  brand?: string | null;
  compareAtPrice?: number | null;
  loyaltyEnabled?: boolean;
  raffleEnabled?: boolean;
  pointsPerUnit?: number;
  raffleSpendUnit?: number;
}) {
  const { t, locale } = useTranslation();
  const ar = locale === "ar";
  const router = useRouter();
  const { region, convertFromBase } = useStorePreferences();
  const [values, setValues] = React.useState<string[]>(
    () => product.variants.find((v) => v.available == null || v.available > 0)?.values ?? product.variants[0]?.values ?? [],
  );
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const variant = product.variants.find((v) => v.values.join("|") === values.join("|"));
  const basePrice = variant?.price ?? product.price;
  const displayCurrency = region?.currency || currency;
  const shownPrice = displayCurrency !== currency ? convertFromBase(basePrice) : basePrice;
  const shownCompare =
    compareAtPrice != null && compareAtPrice > basePrice
      ? displayCurrency !== currency
        ? convertFromBase(compareAtPrice)
        : compareAtPrice
      : null;

  const discountPct =
    shownCompare != null && shownCompare > shownPrice
      ? Math.round(((shownCompare - shownPrice) / shownCompare) * 100)
      : 0;
  const savingsAmount = shownCompare != null && shownCompare > shownPrice ? shownCompare - shownPrice : 0;
  const priceInclVat = shownPrice * 1.1;

  const available = product.variants.length ? variant?.available ?? 0 : product.available;
  const soldOut = (product.variants.length > 0 && !variant) || (available != null && available < 1);
  const max = available == null ? 999 : Math.max(1, Math.min(999, available));

  const lineTotalBase = basePrice * quantity;
  const pointsEarned = calculatePointsEarned(lineTotalBase, pointsPerUnit, loyaltyEnabled);
  const raffleTickets = calculateRaffleTickets(lineTotalBase * 1.1, raffleSpendUnit, raffleEnabled);

  const select = "px-3 py-2.5 rounded-xl bg-m3-surface border border-m3-outline-variant text-m3-on-surface text-sm focus:outline-none focus:border-m3-primary";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      showSnackbar({
        message: ar ? "تم نسخ رابط المنتج" : "Product link copied",
        tone: "info",
      });
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 text-m3-on-surface" data-testid="add-to-cart">
      {/* Price, Savings & VAT Breakdown Block */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <p className="text-3xl font-bold text-m3-on-surface">
              {formatPrice(shownPrice, displayCurrency, locale)}
            </p>
            {shownCompare != null && (
              <p className="text-sm text-m3-on-surface-variant line-through">
                {formatPrice(shownCompare, displayCurrency, locale)}
              </p>
            )}
            {discountPct > 0 && (
              <span className="rounded-full bg-m3-error px-2.5 py-0.5 text-xs font-bold text-m3-on-error">
                -{discountPct}%
              </span>
            )}
          </div>
          {(brand || product.sku) && (
            <div className="text-xs text-m3-on-surface-variant font-mono">
              {brand ? `${brand}` : ""}{brand && product.sku ? " · " : ""}{product.sku ? `SKU: ${product.sku}` : ""}
            </div>
          )}
        </div>
        {savingsAmount > 0 && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {ar
              ? `وفّر ${formatPrice(savingsAmount, displayCurrency, locale)}`
              : `You save ${formatPrice(savingsAmount, displayCurrency, locale)}`}
          </p>
        )}
        {shownPrice > 0 && (
          <p className="text-xs text-m3-on-surface-variant">
            {ar
              ? `غير شامل الضريبة · شامل 10% ضريبة القيمة المضافة: ${formatPrice(priceInclVat, displayCurrency, locale)}`
              : `Excludes VAT. 10% VAT added at checkout: ${formatPrice(priceInclVat, displayCurrency, locale)} incl. VAT`}
          </p>
        )}
      </div>

      {/* Variant Option Selectors */}
      {product.options.map((option, index) => (
        <label key={option.nameEn} className="block space-y-2">
          <span className="text-xs font-semibold text-m3-on-surface">
            {t("store.chooseOption", { option: ar ? option.nameAr : option.nameEn })}
          </span>
          <Select
            value={values[index] ?? ""}
            onChange={(e) => setValues((current) => current.map((v, i) => (i === index ? e.target.value : v)))}
            className={`${select} w-full`}
          >
            {option.values.map((value) => (
              <option key={value.en} value={value.en}>
                {ar ? value.ar : value.en}
              </option>
            ))}
          </Select>
        </label>
      ))}

      <p className={`text-sm font-medium ${soldOut ? "text-m3-error" : "text-m3-primary"}`} data-testid="stock-state">
        {soldOut
          ? t("store.outOfStock")
          : available != null && available <= 5
            ? t("store.onlyLeft", { count: available })
            : t("store.inStock")}
      </p>

      {/* Giveaway Raffle Estimate Callout */}
      {raffleEnabled && raffleTickets > 0 && (
        <div className="rounded-xl border border-m3-primary/30 bg-m3-secondary-container/40 p-3 flex items-start gap-2.5 text-xs">
          <Ticket className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-bold text-m3-on-surface">
              {ar
                ? `اكسب ${raffleTickets} تذكرة سحب مع هذا الطلب`
                : `Earns ${raffleTickets} prize giveaway raffle ${raffleTickets === 1 ? "ticket" : "tickets"}`}
            </p>
            <p className="text-m3-on-surface-variant">
              {ar
                ? "تُحتسب التقديرات على السعر شامل الضريبة وتُصدر فور تأكيد الدفع."
                : "Estimate calculated incl. VAT; tickets issue automatically once paid."}
            </p>
          </div>
        </div>
      )}

      {/* Quantity Stepper + Add to Cart + Buy Now */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-m3-outline-variant bg-m3-surface overflow-hidden">
          <button
            type="button"
            data-testid="qty-decrease"
            aria-label={t("store.decreaseQuantity", { defaultValue: "Decrease quantity" })}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-11 w-10 grid place-items-center hover:bg-m3-surface-container-high"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <input
            type="number"
            data-testid="qty-input"
            aria-label={t("store.quantity")}
            min={1}
            max={max}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))}
            className="w-12 h-11 text-center bg-transparent text-sm font-semibold text-m3-on-surface focus:outline-none"
          />
          <button
            type="button"
            data-testid="qty-increase"
            aria-label={t("store.increaseQuantity", { defaultValue: "Increase quantity" })}
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            className="h-11 w-10 grid place-items-center hover:bg-m3-surface-container-high"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          disabled={soldOut}
          onClick={() => {
            addToCart({ productId: product.product_id, variantId: variant?.id, quantity });
            setAdded(true);
            showSnackbar({
              message: t("store.added"),
              tone: "success",
              actionLabel: t("store.viewCart"),
              onAction: () => router.push(`/${locale}/cart`),
            });
          }}
          className="flex-1 min-w-[160px] min-h-12 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-m3-primary hover:brightness-95 text-m3-on-primary font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer"
          data-testid="add-to-cart-button"
        >
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          {t("store.addToCart")}
        </button>

        <button
          type="button"
          disabled={soldOut}
          data-testid="buy-now-button"
          onClick={() => {
            addToCart({ productId: product.product_id, variantId: variant?.id, quantity });
            router.push(`/${locale}/checkout`);
          }}
          className="min-h-12 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-m3-primary text-m3-primary hover:bg-m3-primary/10 font-bold text-sm transition-colors disabled:opacity-50"
        >
          <Zap className="w-4 h-4" aria-hidden="true" />
          {t("store.buyNow", { defaultValue: "Buy Now" })}
        </button>
      </div>

      {added && (
        <p role="status" className="text-sm text-m3-on-surface-variant">
          {t("store.added")}{" "}
          <Link href={`/${locale}/cart`} className="font-semibold text-m3-primary hover:underline">
            {t("store.viewCart")}
          </Link>
        </p>
      )}

      {/* 3-Card Trust & Loyalty Breakdown + Share Controls */}
      <div className="space-y-2 pt-3 border-t border-m3-outline-variant/60 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-m3-outline-variant bg-m3-surface p-2.5 flex items-center gap-2">
            <Truck className="w-4 h-4 text-m3-primary shrink-0" aria-hidden="true" />
            <span className="font-medium text-m3-on-surface">{t("store.fastDelivery")}</span>
          </div>
          {loyaltyEnabled && pointsEarned > 0 && (
            <div className="rounded-xl border border-m3-outline-variant bg-m3-surface p-2.5 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span className="font-medium text-m3-on-surface">
                {t("store.earnPointsWithPurchase", { points: pointsEarned, defaultValue: `Earn +${pointsEarned} pts` })}
              </span>
            </div>
          )}
          <Link
            href={`/${locale}/warranty`}
            className="rounded-xl border border-m3-outline-variant bg-m3-surface p-2.5 flex items-center gap-2 hover:border-m3-primary transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-m3-primary shrink-0" aria-hidden="true" />
            <span className="font-medium text-m3-on-surface">{t("store.guaranteed")}</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-m3-on-surface-variant">
          <span className="inline-flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-m3-primary" aria-hidden="true" />
            {ar ? "تُضاف نقاط الولاء عند استلام الطلب" : "Loyalty points credited after order delivery"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="pdp-copy-link"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 rounded-full border border-m3-outline-variant px-2.5 py-1 hover:text-m3-on-surface"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? t("store.linkCopied", { defaultValue: "Copied" }) : t("store.copyLink", { defaultValue: "Copy Link" })}</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(product.sku || product.product_id)}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="pdp-share-native"
              className="inline-flex items-center gap-1 rounded-full border border-m3-outline-variant px-2.5 py-1 hover:text-m3-on-surface"
            >
              <Share2 className="w-3 h-3" aria-hidden="true" />
              <span>{t("store.shareItem", { defaultValue: "Share" })}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
