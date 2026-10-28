"use client";
import { Select } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { ProductOption } from "@platform/database/constants/products";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { addToCart } from "./cart";

interface StoreProduct {
  product_id: string;
  track_stock: boolean;
  options: ProductOption[];
  price: number;
  available: number | null;
  variants: { id: string; values: string[]; label_en: string; label_ar: string; price: number; available: number | null }[];
}

/** On a catalogue item that is a product: choose the options and quantity, and add it to the cart. */
export function AddToCart({ product, currency }: { product: StoreProduct; currency: string }) {
  const { t, locale } = useTranslation();
  const [values, setValues] = React.useState<string[]>(() => product.variants.find((v) => v.available == null || v.available > 0)?.values ?? product.variants[0]?.values ?? []);
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const variant = product.variants.find((v) => v.values.join("|") === values.join("|"));
  const price = variant?.price ?? product.price;
  const available = product.variants.length ? variant?.available ?? 0 : product.available;
  const soldOut = (product.variants.length > 0 && !variant) || (available != null && available < 1);
  const max = available == null ? 999 : Math.max(1, Math.min(999, available));
  const select = "px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-accent";
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 p-5" data-testid="add-to-cart">
      <p className="text-2xl font-bold text-white">{formatPrice(price, currency, locale)}</p>
      {product.options.map((option, index) => (
        <label key={option.nameEn} className="block space-y-2">
          <span className="text-xs font-semibold text-ink">{t("store.chooseOption", { option: locale === "ar" ? option.nameAr : option.nameEn })}</span>
          <Select value={values[index] ?? ""} onChange={(e) => setValues((current) => current.map((v, i) => (i === index ? e.target.value : v)))} className={`${select} w-full`}>
            {option.values.map((value) => <option key={value.en} value={value.en}>{locale === "ar" ? value.ar : value.en}</option>)}
          </Select>
        </label>
      ))}
      <p className={`text-sm ${soldOut ? "text-m3-error" : "text-m3-primary"}`} data-testid="stock-state">
        {soldOut ? t("store.outOfStock") : available != null && available <= 5 ? t("store.onlyLeft", { count: available }) : t("store.inStock")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <span>{t("store.quantity")}</span>
          <input type="number" min={1} max={max} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))} className={`${select} w-20`} />
        </label>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => {
            addToCart({ productId: product.product_id, variantId: variant?.id, quantity });
            setAdded(true);
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-m3-primary hover:brightness-95 text-m3-on-primary font-bold text-sm transition-colors disabled:opacity-50"
          data-testid="add-to-cart-button"
        >
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          {t("store.addToCart")}
        </button>
      </div>
      {added && (
        <p role="status" className="text-sm text-ink-muted">
          {t("store.added")}{" "}
          <Link href={`/${locale}/cart`} className="font-semibold text-[var(--web-accent)] hover:underline">{t("store.viewCart")}</Link>
        </p>
      )}
    </div>
  );
}
