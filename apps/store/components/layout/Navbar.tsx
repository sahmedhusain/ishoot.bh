"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandImage } from "../site/BrandImage";
import { SiteRegion, SiteModeSwitch } from "../site/SiteTheme";
import { useTranslation } from "../../hooks/useTranslation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { CartLink } from "../store/CartLink";
import { Menu, Search, UserRound, Heart, Store, Tag, Package, Truck, Phone } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";

interface NavbarProps {
  company: PublicCompanySettings;
  pages?: { id: string; visible: boolean }[];
  links?: { id: string; href: string; label: string; external?: boolean }[];
  accountHref?: string;
  cartEnabled?: boolean;
}

export function Navbar({ company }: NavbarProps) {
  const { t, locale, site } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { id: "products", href: `/${locale}/products`, label: t("nav.products"), icon: Package },
    { id: "offers", href: `/${locale}/offers`, label: t("nav.offers"), icon: Tag },
    { id: "branches", href: `/${locale}/branches`, label: t("nav.branches"), icon: Store },
  ];

  return (
    <SiteRegion region="header">
      <header className="site-navbar sticky top-0 start-0 end-0 z-[80] bg-m3-surface/95 backdrop-blur-md border-b border-m3-outline-variant/60 shadow-sm">
        {/* Top Announcement Bar */}
        <div className="bg-m3-surface-container-high py-1.5 px-4 text-xs text-m3-on-surface-variant border-b border-m3-outline-variant/40">
          <div className="shell flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 truncate">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Truck className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                {t("store.fastDeliveryNotice", { defaultValue: "Express Shipping & Local Pickup Available" })}
              </span>
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="hidden sm:inline-flex items-center gap-1 text-m3-on-surface-variant hover:text-m3-primary transition-colors"
                >
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  <span dir="ltr">{company.phone}</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SiteModeSwitch locale={locale} />
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Main Store Header */}
        <div className="shell py-3.5 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href={`/${locale}`} className="site-brand flex items-center gap-3 group shrink-0 min-w-0">
            <div className="relative h-10 w-10 flex items-center justify-center shrink-0 rounded-xl bg-m3-surface-container p-1">
              <BrandImage company={company} icon className="h-8 w-8 shrink-0 object-contain" />
            </div>
            <BrandImage company={company} className="h-7 min-w-0 max-w-[min(36vw,14rem)] object-contain" />
          </Link>

          {/* Global Store Search Bar */}
          <form
            action={`/${locale}/products`}
            method="get"
            className="hidden md:flex flex-1 max-w-lg items-center relative"
          >
            <input
              type="search"
              name="q"
              aria-label={t("store.searchCatalogue")}
              placeholder={t("store.searchPlaceholder", { defaultValue: "Search products, categories, SKUs..." })}
              className="w-full h-11 rounded-full bg-m3-surface-container-low border border-m3-outline-variant px-4 ps-11 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant transition-all focus:outline-none focus:border-m3-primary focus:bg-m3-surface-container-lowest focus:ring-2 focus:ring-m3-primary/20"
            />
            <Search className="h-4 w-4 absolute start-4 text-m3-on-surface-variant pointer-events-none" aria-hidden="true" />
            <button
              type="submit"
              className="absolute end-1.5 top-1.5 bottom-1.5 px-4 rounded-full bg-m3-primary text-xs font-bold text-m3-on-primary hover:brightness-95 transition-all"
            >
              {t("common.search")}
            </button>
          </form>

          {/* User Tools: Account, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Account Link */}
            <Link
              href={`/${locale}/account`}
              aria-label={t("nav.account")}
              title={t("nav.account")}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-full text-m3-on-surface hover:bg-m3-surface-container-high transition-colors text-xs font-semibold"
            >
              <UserRound className="w-4 h-4 text-m3-primary" aria-hidden="true" />
              <span className="hidden sm:inline">{t("nav.account")}</span>
            </Link>

            {/* Wishlist Link */}
            <Link
              href={`/${locale}/account?tab=wishlist`}
              aria-label={t("account.wishlist")}
              title={t("account.wishlist")}
              className="w-10 h-10 grid place-items-center rounded-full text-m3-on-surface hover:bg-m3-surface-container-high transition-colors"
            >
              <Heart className="w-4 h-4 text-m3-primary" aria-hidden="true" />
            </Link>

            {/* Cart Link */}
            <CartLink className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full bg-m3-primary text-m3-on-primary hover:brightness-95 transition-all shadow-sm font-bold text-xs" />

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 grid place-items-center rounded-full bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-surface-container-highest transition-colors"
              aria-label={t("common.openMenu")}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Navigation Sub-Bar */}
        <div className="bg-m3-surface-container-low/80 border-t border-m3-outline-variant/40 hidden md:block">
          <div className="shell flex items-center justify-between gap-6 py-2">
            <nav aria-label={t("common.navigation")} className="flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-m3-secondary-container text-m3-on-secondary-container"
                        : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-high"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks}
        company={company}
      />
    </SiteRegion>
  );
}

export const StoreNavbar = Navbar;
