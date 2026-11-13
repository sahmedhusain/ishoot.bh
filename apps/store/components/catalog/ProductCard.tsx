"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag, Check, Heart } from "lucide-react";
import type { PortfolioItem } from "@platform/database/types";
import { pickText } from "@platform/database/constants/languages";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { useCart, addToCart } from "../store/cart";

export interface ProductCardProps {
  item: PortfolioItem;
  horizontal?: boolean;
}

export function ProductCard({ item, horizontal = false }: ProductCardProps) {
  const { t, locale, site } = useTranslation();
  const cartLines = useCart();
  const [added, setAdded] = React.useState(false);

  const title = pickText(item.title_en, item.title_ar, locale);
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const priceFormatted =
    item.price !== undefined && site ? formatPrice(item.price, site.currency, locale) : "";
  const priceNote = pickText(item.price_note_en, item.price_note_ar, locale);

  const isInCart = cartLines.some((line) => line.productId === item.id);
  const attributes = item.attributes?.slice(0, 3) ?? [];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: item.id,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-m3-outline-variant/60 bg-m3-surface-container-lowest transition-all duration-200 hover:border-m3-primary/40 hover:shadow-lg ${
        horizontal ? "sm:flex-row" : ""
      }`}
      data-testid={`product-card-${item.slug}`}
    >
      <Link
        href={`/${locale}/products/${item.slug}`}
        aria-label={title}
        className="absolute inset-0 z-0"
      />
      <div className="flex flex-col flex-1 relative pointer-events-none">
        {/* Image & Overlay Badges */}
        <div className="relative aspect-square w-full overflow-hidden bg-m3-surface-container-low pointer-events-auto">
          <ContentImage
            src={item.thumbnail_url}
            alt={title}
            loading="lazy"
            width={600}
            height={600}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 pointer-events-none"
          />

          {/* Wishlist Link */}
          <Link
            href={`/${locale}/account?next=${encodeURIComponent(`/${locale}/products/${item.slug}`)}`}
            aria-label={t("account.saveToWishlist", { defaultValue: "Save to Wishlist" })}
            className="absolute top-3 end-3 z-20 h-9 w-9 rounded-full bg-m3-surface-container-lowest/90 backdrop-blur-sm grid place-items-center text-m3-on-surface hover:text-m3-primary transition-colors shadow-sm pointer-events-auto"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
          </Link>

          {/* Stock & Discount Badges */}
          {priceNote && (
            <div className="absolute top-3 start-3 z-10">
              <span className="rounded-full bg-m3-error-container px-2.5 py-1 text-[11px] font-bold text-m3-on-error-container shadow-sm">
                {priceNote}
              </span>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="flex flex-col flex-1 justify-between p-4 space-y-3 pointer-events-auto">
          <div className="space-y-1 pointer-events-none">
            {subtitle && (
              <span className="text-xs font-semibold text-m3-primary uppercase tracking-wider block">
                {subtitle}
              </span>
            )}
            <h3 className="font-display text-base font-bold text-m3-on-surface line-clamp-2 group-hover:text-m3-primary transition-colors">
              {title}
            </h3>

            {/* Spec attributes */}
            {attributes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {attributes.map((attr, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-m3-surface-container-high px-2 py-0.5 text-[10px] font-medium text-m3-on-surface-variant"
                  >
                    {pickText(attr.valueEn, attr.valueAr, locale)}{" "}
                    {pickText(attr.labelEn, attr.labelAr, locale)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Price & Add to Cart Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-m3-outline-variant/40">
            <div>
              {priceFormatted ? (
                <span className="text-lg font-bold text-m3-on-surface block">
                  {priceFormatted}
                </span>
              ) : (
                <span className="text-xs text-m3-on-surface-variant font-medium">
                  {t("store.contactForPrice", { defaultValue: "Price on request" })}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={t("store.addToCart")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all pointer-events-auto ${
                added || isInCart
                  ? "bg-m3-secondary-container text-m3-on-secondary-container"
                  : "bg-m3-primary text-m3-on-primary hover:brightness-95 active:scale-95"
              }`}
            >
              {added || isInCart ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("store.added", { defaultValue: "Added" })}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("store.add", { defaultValue: "Add" })}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
