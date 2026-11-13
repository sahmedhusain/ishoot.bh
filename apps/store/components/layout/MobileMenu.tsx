"use client";
import { BrandImage } from "../site/BrandImage";
import { SiteModeSwitch } from "../site/SiteTheme";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { PublicCompanySettings } from "@platform/database/types";

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
  const { t, locale, isRTL, site } = useTranslation();

  const navLinks = links || [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/products`, label: t("nav.products") },
    { href: `/${locale}/offers`, label: t("nav.offers") },
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
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <dialog
      ref={dialog}
      id="mobile-navigation"
      aria-label={t("common.menu")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 w-full max-w-none h-[100dvh] max-h-none z-50 flex flex-col overflow-y-auto overscroll-contain justify-between bg-m3-surface text-m3-on-surface p-6 sm:p-10 animate-in fade-in slide-in-from-top-2 duration-200 ease-emphasized"
      data-lenis-prevent
    >
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}`}
          onClick={onClose}
          className="flex items-center gap-2.5"
        >
          <BrandImage company={company} icon className="h-10 w-10 shrink-0" />
          <BrandImage company={company} className="h-7 min-w-0 max-w-[min(36vw,15rem)]" />
        </Link>
        <div className="flex items-center gap-4">
          <button
            aria-label={t("common.closeMenu")}
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-m3-surface-container-low border border-m3-outline-variant text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form
        action={`/${locale}/products`}
        method="get"
        onSubmit={onClose}
        className="mt-6"
      >
        <input
          type="search"
          name="q"
          aria-label={t("store.searchCatalogue")}
          placeholder={t("store.searchPlaceholder")}
          className="w-full rounded-full bg-m3-surface-container-low border border-m3-outline-variant px-4 h-11 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary"
        />
      </form>

      <nav className="flex flex-col gap-6 my-auto py-8 stagger-children">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="group flex items-center justify-between text-3xl sm:text-4xl font-bold text-m3-on-surface hover:text-m3-primary transition-colors py-2 border-b border-m3-outline-variant"
          >
            <span>{link.label}</span>
            <ArrowIcon className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity duration-150 text-m3-primary" />
          </Link>
        ))}
      </nav>

      <div className="space-y-4 pt-4 border-t border-m3-outline-variant">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <SiteModeSwitch locale={locale} /><LanguageSwitcher />
        </div>
        {(locale === "ar" ? company.address_ar : company.address_en) ? (
          <div className="text-center text-xs text-ink-muted">
            {locale === "ar" ? company.address_ar : company.address_en}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
