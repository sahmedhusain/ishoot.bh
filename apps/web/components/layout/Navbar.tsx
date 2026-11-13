"use client";
import { BrandImage } from "../site/BrandImage";
import { SiteRegion, SiteModeSwitch } from "../site/SiteTheme";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { Menu } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";

interface NavbarProps {
  company: PublicCompanySettings;
  pages?: { id: string; visible: boolean }[];
  links?: { id: string; href: string; label: string; external?: boolean }[];
}

export function Navbar({ company, pages, links }: NavbarProps) {
  const { t, locale, site } = useTranslation();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const handleScroll = () => {
      const hero =
        document.getElementById("home") ||
        document.querySelector('[data-hero="true"]');
      if (hero) {
        const rect = hero.getBoundingClientRect();
        setIsScrolled(rect.bottom <= 75);
      } else {
        setIsScrolled(window.scrollY > 80);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname]);

  const pageMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    pages?.forEach((p) => map.set(p.id, p.visible));
    return map;
  }, [pages]);

  const navLinks = links ?? [
    { id: "home", href: `/${locale}`, label: t("nav.home") },
    { id: "works", href: site ? collectionHref(site, locale) : `/${locale}/works`, label: t("nav.works") },
    { id: "about", href: `/${locale}/about`, label: t("nav.about") },
    { id: "contact", href: `/${locale}/contact`, label: t("nav.contact") },
  ].filter((item) => item.id === "home" || pageMap.get(item.id) !== false);

  const fullNavigation = navLinks.length <= 6;
  return (
    <SiteRegion region="header">
      <header
        className={`site-navbar fixed top-0 start-0 end-0 z-[80] py-4 border-b transition-colors duration-150 ${isScrolled
          ? "bg-brand-base border-white/10"
          : "bg-gradient-to-b from-brand-base/90 to-transparent border-transparent"
          }`}
      >
        <div className="site-nav-inner shell flex items-center justify-between gap-4">
          <Link href={`/${locale}`} className="site-brand flex items-center gap-3 group min-w-0 shrink-0">
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <BrandImage company={company} icon className="h-10 w-10 shrink-0" />
            </div>
            <BrandImage company={company} className="h-7 min-w-0 max-w-[min(36vw,15rem)]" />
          </Link>

          <nav
            aria-label={t("common.navigation")}
            className={`site-navigation hidden min-w-0 items-center gap-1 xl:gap-2 ${fullNavigation ? "lg:flex" : ""}`}
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
                  aria-current={isActive ? "page" : undefined}
                  title={link.label}
                  className={`relative max-w-40 truncate px-2.5 xl:px-3.5 py-2.5 text-sm font-sans transition-colors duration-150 rounded-full select-none ${isActive
                    ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                    : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-high/60"
                    }`}
                >
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className={`site-nav-tools hidden items-center gap-2 xl:gap-3 ${fullNavigation ? "lg:flex" : ""}`}>
            {site?.commerce?.search !== false && (
              <form action={site ? collectionHref(site, locale) : `/${locale}/works`} method="get" className="hidden xl:block">
                <input
                  type="search"
                  name="q"
                  aria-label={t("portfolio.searchCatalogue")}
                  placeholder={t("common.search")}
                  className="w-28 xl:w-36 focus:w-44 rounded-full bg-m3-surface-container-low border border-m3-outline-variant px-3.5 h-10 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant transition-all focus:outline-none focus:border-m3-primary"
                />
              </form>
            )}
            <SiteModeSwitch locale={locale} /><LanguageSwitcher />
          </div>

          <div className={`flex items-center gap-3 ${fullNavigation ? "lg:hidden" : ""}`}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-md bg-brand-surface border border-white/20 text-ink hover:bg-m3-surface-container-high transition-colors duration-150"
              aria-label={t("common.openMenu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
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
