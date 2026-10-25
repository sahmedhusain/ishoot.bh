"use client";
import { siteIcon, siteLogo } from "../../lib/brand-images";
import {ContentImage} from "../shared/ContentImage";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { CartLink } from "../store/CartLink";
import { Menu, UserRound } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";

interface NavbarProps {
  company: PublicCompanySettings;
  pages?: { id: string; visible: boolean }[];
  /** Menu links built from the website's pages (lib/menus.ts); missing for websites published before pages existed. */
  links?: { id: string; href: string; label: string; external?: boolean }[];
  /** The customer account page, when the online store is on. */
  accountHref?: string;
}

export function Navbar({ company, pages, links, accountHref }: NavbarProps) {
  const { t, locale, site } = useTranslation();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
  ] .filter((item) => item.id === "home" || pageMap.get(item.id) !== false);

  return (
    <>
      <header
        className={`fixed top-0 start-0 end-0 z-[80] py-4 border-b transition-colors duration-150 ${
          isScrolled
            ? "bg-brand-base border-white/10"
            : "bg-gradient-to-b from-brand-base/90 to-transparent border-transparent"
        }`}
      >
        <div className="shell flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <ContentImage
                src={
                  siteIcon(company)
                }
                alt={t("common.brandIconAlt", { companyName: locale === "ar" ? company.company_name_ar : company.company_name_en })}
                className="h-full w-full object-contain "
               width={40} height={40} />
            </div>
            <ContentImage
              src={
                siteLogo(company)
              }
              alt={t("common.brandLogoAlt", { companyName: locale === "ar" ? company.company_name_ar : company.company_name_en })}
              className="h-7 w-auto object-contain"
             fallbackText={company.company_name_en}  width={240} height={60} />
          </Link>

          <nav
            aria-label={t("common.navigation")}
            className="hidden lg:flex items-center gap-2"
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
                  className={`relative px-4 py-3 text-sm font-sans transition-colors duration-150 rounded-md select-none ${
                    isActive
                      ? "text-mint font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 inset-x-4 h-0.5 bg-mint"
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            {accountHref ? <CartLink className="w-10 h-10 grid place-items-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors" /> : null}
            {accountHref ? (
              <Link href={accountHref} aria-label={t("nav.account")} title={t("nav.account")} className="w-10 h-10 grid place-items-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors" data-testid="nav-account">
                <UserRound className="w-5 h-5" aria-hidden="true" />
              </Link>
            ) : null}
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            {accountHref ? <CartLink className="w-11 h-11 flex items-center justify-center rounded-md border border-white/20 text-white" /> : null}
            {accountHref ? (
              <Link href={accountHref} aria-label={t("nav.account")} className="w-11 h-11 flex items-center justify-center rounded-md border border-white/20 text-white">
                <UserRound className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : null}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-md bg-brand-surface border border-white/20 text-paper hover:bg-primary transition-colors duration-150"
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
    </>
  );
}
