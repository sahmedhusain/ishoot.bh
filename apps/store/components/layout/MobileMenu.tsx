"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { BrandImage } from "../site/BrandImage";
import { SiteModeSwitch } from "../site/SiteTheme";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links?: { href: string; label: string }[];
  company: PublicCompanySettings;
}

export function MobileMenu({
  isOpen,
  onClose,
  links,
  company,
}: MobileMenuProps) {
  const { t, locale, isRTL } = useTranslation();
  const pathname = usePathname() || "";

  const navLinks = links || [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/shop`, label: t("nav.products") },
    { href: `/${locale}/deals`, label: t("nav.offers") },
    { href: `/${locale}/branches`, label: t("nav.branches") },
    { href: `/${locale}/cart`, label: t("store.cart") },
    { href: `/${locale}/account`, label: t("nav.account") },
  ];

  const dialog = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal?.();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close?.();
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <dialog
      ref={dialog}
      id="mobile-navigation"
      aria-label={t("common.menu")}
      dir={isRTL ? "rtl" : "ltr"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-0 p-0 w-full max-w-sm h-[100dvh] max-h-none z-[95] bg-m3-surface-container-low text-m3-on-surface border-e border-m3-outline-variant shadow-m3-4 backdrop:bg-black/45 backdrop:backdrop-blur-sm flex flex-col overflow-hidden"
      data-lenis-prevent
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-m3-outline-variant bg-m3-surface-container">
        <Link
          href={`/${locale}`}
          onClick={onClose}
          className="flex items-center gap-2.5 min-w-0"
        >
          <BrandImage company={company} icon className="h-9 w-9 shrink-0" />
          <BrandImage company={company} className="h-6 min-w-0 max-w-[10rem] object-contain" />
        </Link>
        <button
          type="button"
          aria-label={t("common.closeMenu")}
          onClick={onClose}
          data-keep-round="true"
          className="m3-state-layer w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-m3-surface-container-high border border-m3-outline-variant text-m3-on-surface cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-2">
        <form
          action={`/${locale}/shop`}
          method="get"
          onSubmit={onClose}
          className="relative flex items-center"
        >
          <Search
            className="w-4 h-4 absolute start-4 text-m3-on-surface-variant pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            aria-label={t("store.searchCatalogue")}
            placeholder={t("store.searchPlaceholder")}
            className="w-full h-11 rounded-full bg-m3-surface-container-high border border-m3-outline-variant ps-10 pe-4 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary"
          />
        </form>
      </div>

      <nav
        aria-label={t("common.navigation")}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1"
      >
        {navLinks.map((link) => {
          const isActive =
            link.href === `/${locale}`
              ? pathname === `/${locale}`
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
              className={`m3-state-layer group flex min-h-12 items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                  : "text-m3-on-surface hover:bg-m3-surface-container-high"
              }`}
            >
              <span className="truncate">{link.label}</span>
              <ArrowIcon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 ${
                  isActive ? "text-m3-on-secondary-container" : "text-m3-on-surface-variant"
                }`}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-m3-outline-variant bg-m3-surface-container space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LanguageSwitcher variant="footer" />
          <SiteModeSwitch locale={locale} placement="up" />
        </div>
        {(locale === "ar" ? company.address_ar : company.address_en) ? (
          <p className="text-xs text-m3-on-surface-variant line-clamp-2">
            {locale === "ar" ? company.address_ar : company.address_en}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
