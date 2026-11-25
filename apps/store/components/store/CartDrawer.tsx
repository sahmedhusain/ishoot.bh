"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-destructive";
import { showSnackbar } from "../ui/snackbar";
import { clearCart, useCart, writeCart } from "./cart";
import { useQuote } from "./useQuote";

const OPEN_CART_DRAWER_EVENT = "store-open-cart-drawer";

export function openCartDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_CART_DRAWER_EVENT));
  }
}

export function CartDrawer({ currency }: { currency?: string }) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CART_DRAWER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CART_DRAWER_EVENT, onOpen);
  }, []);

  if (!open || !mounted) return null;

  return <CartDrawerSheet currency={currency} onClose={() => setOpen(false)} />;
}

function CartDrawerSheet({ currency, onClose }: { currency?: string; onClose: () => void }) {
  const { t, locale, isRTL, site } = useTranslation();
  const [confirmClearOpen, setConfirmClearOpen] = React.useState(false);
  const lines = useCart();
  const { quote } = useQuote(lines, "", "delivery");

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !confirmClearOpen) {
        onClose();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmClearOpen, onClose]);

  const setOpen = (next: boolean) => {
    if (!next) onClose();
  };

  const ar = locale === "ar";
  const displayCurrency = quote?.currency || site?.currency || currency || "BHD";
  const totalCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const setQuantity = (productId: string, variantKey: string, quantity: number) =>
    writeCart(
      lines
        .map((l) =>
          l.productId === productId && ((l.variantId ?? "") === variantKey || !l.variantId)
            ? { ...l, quantity }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );

  return createPortal(
    <>
      <div
        data-drawer-container
        data-testid="cart-drawer"
        dir={isRTL ? "rtl" : "ltr"}
        className="fixed inset-0 z-[95] flex justify-end"
      >
        <div
          data-modal-backdrop
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="absolute inset-0"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t("store.cartTitle")}
          data-drawer-panel
          data-lenis-prevent
        >
          <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-m3-outline-variant bg-m3-surface-container">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-xl bg-m3-primary-container text-m3-on-primary-container grid place-items-center">
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-m3-on-surface">
                  {t("store.cartTitle")}
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  {totalCount} {ar ? "منتجات" : totalCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              data-keep-round="true"
              className="m3-state-layer h-10 w-10 rounded-full border border-m3-outline-variant bg-m3-surface-container-high grid place-items-center text-m3-on-surface cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {lines.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-m3-surface-container-high text-m3-on-surface-variant grid place-items-center">
                  <ShoppingBag className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="text-sm text-m3-on-surface-variant">{t("store.cartEmpty")}</p>
                <Link
                  href={`/${locale}/shop`}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-m3-primary px-5 py-2 text-xs font-semibold text-m3-on-primary"
                >
                  {t("store.continueShopping")}
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {(quote?.lines ?? []).map((l) => {
                  const title = [
                    ar ? l.nameAr || l.nameEn : l.nameEn,
                    ar ? l.variantAr : l.variantEn,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={`${l.productId}-${l.variantKey}`}
                      className="flex gap-3 rounded-2xl border border-m3-outline-variant bg-m3-surface p-3"
                    >
                      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-m3-surface-container grid place-items-center">
                        {l.imageUrl ? (
                          <ContentImage
                            src={l.imageUrl}
                            alt=""
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-m3-on-surface-variant" aria-hidden="true" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-xs font-semibold text-m3-on-surface line-clamp-2">
                          {title}
                        </p>
                        <p className="text-xs font-medium text-m3-primary">
                          {formatPrice(l.unitPrice * l.quantity, displayCurrency, locale)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={t("store.decreaseQuantity", { defaultValue: "Decrease" })}
                            onClick={() => setQuantity(l.productId, l.variantKey, Math.max(0, l.quantity - 1))}
                            className="h-8 w-8 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low grid place-items-center text-m3-on-surface hover:bg-m3-surface-container-high cursor-pointer"
                          >
                            <Minus className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold text-m3-on-surface">
                            {l.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={t("store.increaseQuantity", { defaultValue: "Increase" })}
                            onClick={() => setQuantity(l.productId, l.variantKey, Math.min(999, l.quantity + 1))}
                            className="h-8 w-8 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low grid place-items-center text-m3-on-surface hover:bg-m3-surface-container-high cursor-pointer"
                          >
                            <Plus className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={t("store.remove", { name: title })}
                            onClick={() => {
                              setQuantity(l.productId, l.variantKey, 0);
                              showSnackbar({
                                message: ar ? `تمت إزالة ${title}` : `Removed ${title}`,
                                tone: "info",
                              });
                            }}
                            className="ms-auto h-8 w-8 rounded-lg text-m3-error hover:bg-m3-error-container/60 grid place-items-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {lines.length > 0 && (
            <footer className="shrink-0 p-4 border-t border-m3-outline-variant bg-m3-surface-container space-y-3">
              {quote && (
                <div className="flex items-center justify-between text-sm font-bold text-m3-on-surface">
                  <span>{t("store.subtotal")}</span>
                  <span>{formatPrice(quote.subtotal, displayCurrency, locale)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/${locale}/cart`}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-m3-outline bg-m3-surface text-xs font-semibold text-m3-primary hover:bg-m3-surface-container-high"
                >
                  {t("store.viewCart")}
                </Link>
                <Link
                  href={`/${locale}/checkout`}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-m3-primary text-xs font-bold text-m3-on-primary hover:brightness-95"
                >
                  <span>{t("store.checkout")}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClearOpen(true)}
                className="w-full text-m3-error hover:bg-m3-error-container/40"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t("store.clearCart", { defaultValue: "Clear Cart" })}
              </Button>
            </footer>
          )}
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearCart();
          setConfirmClearOpen(false);
          showSnackbar({
            message: ar ? "تم إفراغ سلة التسوق" : "Shopping cart cleared",
            tone: "info",
          });
        }}
        title={t("store.clearCartTitle", { defaultValue: "Clear shopping cart?" })}
        description={t("store.clearCartDesc", {
          defaultValue: "All items currently in your bag will be removed. You can add them again anytime.",
        })}
        confirmLabel={t("store.clearCart", { defaultValue: "Clear Cart" })}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />
    </>,
    document.body,
  );
}
