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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "py-3.5 bg-[#050807]/95 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            : "py-5 bg-gradient-to-b from-[#050807]/90 via-[#050807]/45 to-transparent"
        }`}
        style={
          isScrolled
            ? {
                boxShadow:
                  "0 16px 48px rgba(9, 147, 127, 0.12), 0 -8px 24px rgba(9, 147, 127, 0.06), 0 0 2px rgba(255, 255, 255, 0.08)",
              }
            : {}
        }
      >
        <div className="shell flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <img
                src={
                  company.dark_icon_url ||
                  company.icon_url ||
                  "/brand/icon-dark.svg"
                }
                alt={t("common.brandIconAlt")}
                className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:rotate-45 filter drop-shadow-[0_0_8px_rgba(9,147,127,0.3)]"
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

          <nav className="hidden lg:flex items-center gap-1.5 p-1.5 rounded-full bg-[#070D0B]/90 dark:bg-[#070D0B]/95 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)]">
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
                  className={`relative px-4 py-1.5 text-xs sm:text-sm font-sans tracking-wide transition-all duration-300 rounded-full select-none ${
                    isActive
                      ? "text-white font-bold"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[#09937F] border border-[#5EEAD4]/40 shadow-[0_0_16px_rgba(9,147,127,0.55)] -z-0"
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
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#070D0B]/85 border border-white/20 text-white hover:bg-[#09937F]/20 transition-colors shadow-lg backdrop-blur-xl"
              aria-label="Open menu"
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
