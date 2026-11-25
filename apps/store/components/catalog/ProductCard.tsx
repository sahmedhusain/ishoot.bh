"use client";

import * as React from "react";
import Link from "next/link";
import { Award, Bell, Check, Eye, Heart, Scale, ShoppingBag, Star } from "lucide-react";
import type { PortfolioItem } from "@platform/database/types";
import { pickText } from "@platform/database/constants/languages";
import { calculatePointsEarned } from "@platform/database/constants/store";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { useCart, addToCart } from "../store/cart";
import { useStorePreferences } from "../layout/StorePreferencesBar";
import { showSnackbar } from "../ui/snackbar";

const WISHLIST_STORAGE_KEY = "store-guest-wishlist";
const PRICE_ALERT_STORAGE_KEY = "store-price-alerts";

export interface ProductCardProps {
  item: PortfolioItem;
  horizontal?: boolean;
  onQuickView?: (item: PortfolioItem) => void;
  onCompareToggle?: (item: PortfolioItem) => void;
  compared?: boolean;
}

export function ProductCard({
  item,
  horizontal = false,
  onQuickView,
  onCompareToggle,
  compared = false,
}: ProductCardProps) {
  const { t, locale, site } = useTranslation();
  const cartLines = useCart();
  const { region, convertFromBase } = useStorePreferences();
  const [added, setAdded] = React.useState(false);
  const [wishlisted, setWishlisted] = React.useState(false);
  const [priceAlertOn, setPriceAlertOn] = React.useState(false);

  React.useEffect(() => {
    try {
      const savedWish = JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
      if (Array.isArray(savedWish)) setWishlisted(savedWish.includes(item.id));
      const savedAlert = JSON.parse(window.localStorage.getItem(PRICE_ALERT_STORAGE_KEY) || "[]");
      if (Array.isArray(savedAlert)) setPriceAlertOn(savedAlert.includes(item.id));
    } catch {
      return;
    }
  }, [item.id]);

  const title = pickText(item.title_en, item.title_ar, locale);
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const baseCurrency = site?.currency || "BHD";
  const displayCurrency = region?.currency || baseCurrency;
  const priceValue =
    item.price !== undefined
      ? displayCurrency !== baseCurrency
        ? convertFromBase(item.price)
        : item.price
      : undefined;
  const priceFormatted =
    priceValue !== undefined && site ? formatPrice(priceValue, displayCurrency, locale) : "";
  const compareAtValue =
    item.compare_at_price != null && item.compare_at_price > (item.price ?? 0)
      ? displayCurrency !== baseCurrency
        ? convertFromBase(item.compare_at_price)
        : item.compare_at_price
      : null;
  const compareAtFormatted =
    compareAtValue != null && site ? formatPrice(compareAtValue, displayCurrency, locale) : "";
  const discountPct =
    compareAtValue != null && priceValue != null && compareAtValue > 0
      ? Math.round(((compareAtValue - priceValue) / compareAtValue) * 100)
      : 0;
  const priceNote = pickText(item.price_note_en, item.price_note_ar, locale);

  const isOutOfStock = Boolean(
    item.track_stock && item.available_stock != null && item.available_stock <= 0,
  );
  const lowStock = Boolean(
    item.track_stock &&
      item.available_stock != null &&
      item.available_stock > 0 &&
      item.available_stock <= 5,
  );
  const earnedPoints =
    item.price != null ? calculatePointsEarned(item.price) : 0;

  const isInCart = cartLines.some((line) => line.productId === item.id);
  const attributes = item.attributes?.slice(0, 2) ?? [];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart({
      productId: item.id,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    showSnackbar({
      message: locale === "ar" ? `تمت إضافة ${title} إلى السلة` : `Added ${title} to bag`,
      tone: "success",
    });
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const current: string[] = JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]");
      const removing = current.includes(item.id);
      const next = removing
        ? current.filter((id) => id !== item.id)
        : [...current, item.id];
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      setWishlisted(!removing);
      window.dispatchEvent(new Event("store-wishlist-change"));
      showSnackbar({
        message: removing
          ? locale === "ar" ? "تمت الإزالة من المفضلة" : "Removed from wishlist"
          : locale === "ar" ? "تم الحفظ في المفضلة" : "Saved to wishlist",
        tone: "info",
      });
    } catch {
      return;
    }
  };

  const togglePriceAlert = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const current: string[] = JSON.parse(window.localStorage.getItem(PRICE_ALERT_STORAGE_KEY) || "[]");
      const removing = current.includes(item.id);
      const next = removing
        ? current.filter((id) => id !== item.id)
        : [...current, item.id];
      window.localStorage.setItem(PRICE_ALERT_STORAGE_KEY, JSON.stringify(next));
      setPriceAlertOn(!removing);
      showSnackbar({
        message: removing
          ? locale === "ar" ? "تم إيقاف تنبيه السعر" : "Price alert disabled"
          : locale === "ar" ? "تم تفعيل تنبيه انخفاض السعر" : "Price-drop alert enabled",
        tone: "info",
      });
    } catch {
      return;
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-m3-outline-variant/60 bg-m3-surface-container-lowest transition-all duration-200 hover:border-m3-primary/50 hover:shadow-lg ${
        horizontal ? "sm:flex-row" : ""
      }`}
      data-testid={`product-card-${item.slug}`}
      data-product-id={item.id}
    >
      <Link
        href={`/${locale}/products/${item.slug}`}
        aria-label={title}
        className="absolute inset-0 z-0"
      />
      <div className={`flex flex-col flex-1 relative pointer-events-none ${horizontal ? "sm:flex-row" : ""}`}>
        {/* Square 1:1 Image Frame with Top-Left Badges & Top-Right 4 Action Icons */}
        <div
          className={`relative overflow-hidden bg-m3-surface-container-low pointer-events-auto ${
            horizontal ? "sm:w-56 shrink-0 aspect-square" : "aspect-square w-full"
          }`}
        >
          <ContentImage
            src={item.thumbnail_url}
            alt={title}
            loading="lazy"
            width={600}
            height={600}
            className="h-full w-full object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-105 pointer-events-none"
          />

          {/* 4 Stacked Circular Action Buttons (Wishlist, Compare, Quick View, Price Alert) */}
          <div className="absolute top-3 end-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
            <button
              type="button"
              data-testid={`wishlist-toggle-${item.slug}`}
              aria-label={t("account.saveToWishlist")}
              aria-pressed={wishlisted}
              onClick={toggleWishlist}
              className={`h-8 w-8 rounded-full backdrop-blur-sm grid place-items-center transition-colors shadow-m3-1 cursor-pointer ${
                wishlisted
                  ? "bg-m3-error text-m3-on-error"
                  : "bg-m3-surface-container-lowest/90 text-m3-on-surface hover:text-m3-primary"
              }`}
            >
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} aria-hidden="true" />
            </button>
            {onCompareToggle && (
              <button
                type="button"
                data-testid={`compare-toggle-${item.slug}`}
                aria-label={t("store.compareProduct", { defaultValue: "Compare" })}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCompareToggle(item);
                }}
                className={`h-8 w-8 rounded-full backdrop-blur-sm grid place-items-center transition-colors shadow-sm ${
                  compared
                    ? "bg-m3-primary text-m3-on-primary"
                    : "bg-m3-surface-container-lowest/90 text-m3-on-surface hover:text-m3-primary"
                }`}
              >
                <Scale className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {onQuickView && (
              <button
                type="button"
                data-testid={`quick-view-${item.slug}`}
                aria-label={t("store.quickView", { defaultValue: "Quick View" })}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView(item);
                }}
                className="h-8 w-8 rounded-full bg-m3-surface-container-lowest/90 backdrop-blur-sm grid place-items-center text-m3-on-surface hover:text-m3-primary transition-colors shadow-sm"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              data-testid={`price-alert-${item.slug}`}
              aria-label={locale === "ar" ? "تنبيه انخفاض السعر" : "Price-drop alert"}
              aria-pressed={priceAlertOn}
              onClick={togglePriceAlert}
              className={`h-8 w-8 rounded-full backdrop-blur-sm grid place-items-center transition-colors shadow-sm ${
                priceAlertOn
                  ? "bg-m3-secondary-container text-m3-on-secondary-container"
                  : "bg-m3-surface-container-lowest/90 text-m3-on-surface hover:text-m3-primary"
              }`}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Top-Left Discount & Availability Pills */}
          <div className="absolute top-3 start-3 z-10 flex flex-col items-start gap-1">
            {discountPct > 0 && (
              <span className="rounded-full bg-m3-error px-2.5 py-0.5 text-[11px] font-bold text-m3-on-error shadow-m3-1">
                -{discountPct}%
              </span>
            )}
            {priceNote && (
              <span className="rounded-full bg-m3-error-container px-2.5 py-0.5 text-[11px] font-bold text-m3-on-error-container shadow-m3-1">
                {priceNote}
              </span>
            )}
            {isOutOfStock && (
              <span className="rounded-full bg-m3-surface-container-highest border border-m3-outline-variant px-2.5 py-0.5 text-[11px] font-semibold text-m3-on-surface">
                {t("store.outOfStock")}
              </span>
            )}
            {lowStock && item.available_stock != null && (
              <span className="rounded-full bg-m3-tertiary-container px-2.5 py-0.5 text-[11px] font-semibold text-m3-on-tertiary-container">
                {t("store.onlyLeft", { count: item.available_stock })}
              </span>
            )}
          </div>
        </div>

        {/* Product Body */}
        <div className="flex flex-col flex-1 justify-between p-4 space-y-3 pointer-events-auto">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              {item.brand ? (
                <Link
                  href={`/${locale}/shop?brand=${encodeURIComponent(item.brand)}`}
                  className="text-[11px] font-bold text-m3-primary uppercase tracking-wider truncate hover:underline pointer-events-auto relative z-10"
                >
                  {item.brand}
                </Link>
              ) : subtitle ? (
                <span className="text-[11px] font-semibold text-m3-primary uppercase tracking-wider truncate">
                  {subtitle}
                </span>
              ) : (
                <span />
              )}
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-m3-tertiary shrink-0">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                5.0
              </span>
            </div>

            <h3 className="font-display text-sm sm:text-base font-bold text-m3-on-surface line-clamp-2 group-hover:text-m3-primary transition-colors pointer-events-none">
              {title}
            </h3>

            {attributes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5 pointer-events-none">
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

            {earnedPoints > 0 && (
              <div className="inline-flex items-center gap-1 pt-0.5 text-[11px] font-medium text-m3-tertiary pointer-events-none">
                <Award className="h-3 w-3" aria-hidden="true" />
                <span>+{earnedPoints} {t("store.pointsShort", { defaultValue: "pts" })}</span>
              </div>
            )}
          </div>

          {/* Price + Add Row */}
          <div className="space-y-1.5 pt-2 border-t border-m3-outline-variant/40">
            <div className="flex items-center justify-between gap-2">
              <div>
                {priceFormatted ? (
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg font-bold text-m3-on-surface">
                      {priceFormatted}
                    </span>
                    {compareAtFormatted && (
                      <span className="text-xs text-m3-on-surface-variant line-through">
                        {compareAtFormatted}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-m3-on-surface-variant font-medium">
                    {t("store.contactForPrice")}
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                aria-label={t("store.addToCart")}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all pointer-events-auto disabled:opacity-45 disabled:cursor-not-allowed ${
                  added || isInCart
                    ? "bg-m3-secondary-container text-m3-on-secondary-container"
                    : "bg-m3-primary text-m3-on-primary hover:brightness-95 active:scale-95"
                }`}
              >
                {added || isInCart ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("store.addedShort")}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t("store.add")}</span>
                  </>
                )}
              </button>
            </div>
            {lowStock && item.available_stock != null && (
              <p className="text-[11px] font-semibold text-m3-tertiary">
                {t("store.onlyLeft", { count: item.available_stock })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
