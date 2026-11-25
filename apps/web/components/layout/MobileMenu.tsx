"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ArrowRight, ArrowLeft, Search } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";
import { BrandImage } from "../site/BrandImage";
import { SiteModeSwitch } from "../site/SiteTheme";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links?: { href: string; label: string; exact?: boolean }[];
  company: PublicCompanySettings;
}

export function MobileMenu({
  isOpen,
  onClose,
  links,
  company,
}: MobileMenuProps) {
  const { t, locale, isRTL, site } = useTranslation();
  const pathname = usePathname() || "";

  const navLinks = links || [
    { href: `/${locale}`, label: t("nav.home"), exact: true },
    { href: site ? collectionHref(site, locale) : `/${locale}/works`, label: t("nav.works"), exact: false },
    { href: `/${locale}/about`, label: t("nav.about"), exact: false },
    { href: `/${locale}/contact`, label: t("nav.contact"), exact: false },
  ];

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href || pathname === `${href}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-y-0 start-0 m-0 w-full sm:max-w-sm h-[100dvh] max-h-none z-50 flex flex-col overflow-y-auto overscroll-contain justify-between bg-m3-surface-container-low text-m3-on-surface border-e border-m3-outline-variant sm:rounded-e-[var(--md-sys-shape-corner-extra-large,28px)] shadow-m3-4 p-6 backdrop:bg-black/60 animate-in fade-in duration-200"
      data-lenis-prevent
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/${locale}`}
            onClick={onClose}
            className="flex items-center gap-2.5 min-h-11"
          >
            <BrandImage company={company} icon className="h-9 w-9 shrink-0" />
            <BrandImage company={company} className="h-6 min-w-0 max-w-[11rem]" />
          </Link>
          <button
            type="button"
            aria-label={t("common.closeMenu")}
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-m3-surface-container-high border border-m3-outline-variant text-m3-on-surface hover:bg-m3-surface-container-highest transition-colors cursor-pointer shrink-0"
          >
            <X aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>

        {site?.commerce?.search !== false && (
          <form
            action={site ? collectionHref(site, locale) : `/${locale}/works`}
            method="get"
            role="search"
            onSubmit={onClose}
          >
            <label className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-m3-on-surface-variant pointer-events-none absolute start-4"
              />
              <input
                type="search"
                name="q"
                aria-label={t("portfolio.searchCatalogue")}
                placeholder={t("portfolio.searchPlaceholder")}
                className="w-full rounded-full bg-m3-surface-container-high border border-m3-outline-variant ps-11 pe-4 h-12 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary"
              />
            </label>
          </form>
        )}

        <nav aria-label={t("common.navigation")} className="flex flex-col gap-1.5">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between min-h-14 px-4 py-3 rounded-full text-base font-semibold transition-colors ${
                  active
                    ? "bg-m3-secondary-container text-m3-on-secondary-container"
                    : "text-m3-on-surface hover:bg-m3-on-surface/[0.08]"
                }`}
              >
                <span>{link.label}</span>
                <ArrowIcon
                  aria-hidden="true"
                  className={`w-5 h-5 transition-transform duration-150 ${
                    active ? "text-m3-on-secondary-container" : "text-m3-on-surface-variant group-hover:text-m3-primary"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 pt-5 mt-6 border-t border-m3-outline-variant">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LanguageSwitcher variant="footer" />
          <SiteModeSwitch locale={locale} placement="up" />
        </div>
        {(locale === "ar" ? company.address_ar : company.address_en) ? (
          <p className="text-xs text-m3-on-surface-variant leading-relaxed">
            {locale === "ar" ? company.address_ar : company.address_en}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
