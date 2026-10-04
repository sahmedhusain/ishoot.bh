"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { Menu } from "lucide-react";
import type { CompanySettings } from "@ishoot/database/types";

interface NavbarProps {
  company: CompanySettings;
  pages?: { id: string; visible: boolean }[];
}

export function Navbar({ company, pages }: NavbarProps) {
  const { t, locale } = useTranslation();
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

  const navLinks = [
    { id: "home", href: `/${locale}`, label: t("nav.home") },
    { id: "works", href: `/${locale}/works`, label: t("nav.works") },
    { id: "about", href: `/${locale}/about`, label: t("nav.about") },
    { id: "contact", href: `/${locale}/contact`, label: t("nav.contact") },
  ].filter((item) => item.id === "home" || pageMap.get(item.id) !== false);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[80] py-4 border-b transition-colors duration-150 ${
          isScrolled
            ? "bg-[var(--ishoot-bg-base)] border-white/10"
            : "bg-gradient-to-b from-[#050807]/90 to-transparent border-transparent"
        }`}
      >
        <div className="shell flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <img
                src={
                  company.dark_icon_url ||
                  company.icon_url ||
                  "/brand/icon-dark.svg"
                }
                alt={t("common.brandIconAlt")}
                className="h-full w-full object-contain "
              />
            </div>
            <img
              src={
                company.dark_logo_url ||
                company.logo_url ||
                "/brand/logo-text-light.svg"
              }
              alt={t("common.brandLogoAlt")}
              className="h-7 w-auto object-contain"
            />
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
                      ? "text-[#5EEAD4] font-bold"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 inset-x-4 h-0.5 bg-[#5EEAD4]"
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-md bg-[var(--ishoot-bg-surface)] border border-white/20 text-white hover:bg-[var(--ishoot-primary)] transition-colors duration-150"
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
