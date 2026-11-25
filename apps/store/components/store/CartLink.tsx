"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useCart } from "./cart";

export function CartLink({ className }: { className: string }) {
  const { t, locale } = useTranslation();
  const count = useCart().reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link
      href={`/${locale}/cart`}
      aria-label={count ? `${t("nav.cart")} (${count})` : t("nav.cart")}
      className={`relative ${className}`}
      data-testid="nav-cart"
    >
      <ShoppingBag className="w-5 h-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-1 -end-1 min-w-[20px] h-[20px] rounded-full bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-outline-variant/40 px-1 text-[10px] font-bold leading-[18px] text-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
