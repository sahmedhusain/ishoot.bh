"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { BrandImage } from "../site/BrandImage";
import { Menu, Search, ArrowUpRight } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";

export interface NavbarSearchEntry {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  group: "project" | "article" | "page";
}

export function Navbar({
  company,
  pages,
  links = [],
  extraLinks = [],
  searchIndex = [],
}: {
  company: PublicCompanySettings;
  pages?: { id: string; visible: boolean }[];
  links?: { href: string; label: string }[];
  extraLinks?: { href: string; label: string }[];
  searchIndex?: NavbarSearchEntry[];
}) {
  const { t, locale, isRTL, site } = useTranslation();
  const pathname = usePathname() || "";
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [searchFocused, setSearchFocused] = React.useState(false);
  const searchBoxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchFocused(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const visible = (id: string) => pages?.find((p) => p.id === id)?.visible ?? true;
  const searchEnabled = site?.commerce?.search !== false;
  const worksHref = site ? collectionHref(site, locale) : `/${locale}/work`;
  const articlesHref = `/${locale}/${site?.articles.slug ?? "news"}`;

  const combinedExtra = [...links, ...extraLinks];
  const seenHrefs = new Set<string>();
  const navLinks = [
    ...(visible("home") ? [{ href: `/${locale}`, label: t("nav.home"), exact: true }] : []),
    ...(visible("works") ? [{ href: worksHref, label: t("nav.works"), exact: false }] : []),
    ...(visible("about") ? [{ href: `/${locale}/about`, label: t("nav.about"), exact: false }] : []),
    ...(visible("articles") ? [{ href: articlesHref, label: t("nav.articles"), exact: false }] : []),
    ...combinedExtra.map((l) => ({ ...l, exact: false })),
    ...(visible("contact") ? [{ href: `/${locale}/contact`, label: t("nav.contact"), exact: false }] : []),
  ].filter((item) => {
    if (seenHrefs.has(item.href)) return false;
    seenHrefs.add(item.href);
    return true;
  });

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href || pathname === `${href}/`;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const trimmedQuery = query.trim().toLowerCase();
  const quickResults = React.useMemo(() => {
    if (!trimmedQuery) return [];
    const pageDefaults: NavbarSearchEntry[] = [
      { id: "sys-about", title: t("nav.about"), href: `/${locale}/about`, group: "page" },
      { id: "sys-press", title: t("press.title"), href: `/${locale}/press`, group: "page" },
      { id: "sys-terms", title: t("footer.terms"), href: `/${locale}/terms`, group: "page" },
      { id: "sys-privacy", title: t("footer.rules"), href: `/${locale}/privacy`, group: "page" },
      { id: "sys-cookies", title: t("footer.cookies"), href: `/${locale}/cookies`, group: "page" },
      { id: "sys-contact", title: t("nav.contact"), href: `/${locale}/contact`, group: "page" },
    ];
    const pool = [...searchIndex, ...pageDefaults];
    return pool
      .filter((entry) =>
        entry.title.toLowerCase().includes(trimmedQuery) ||
        (entry.subtitle?.toLowerCase().includes(trimmedQuery) ?? false),
      )
      .slice(0, 7);
  }, [trimmedQuery, searchIndex, locale, t]);

  return (
    <>
      <header
        data-scrolled={scrolled ? "true" : "false"}
        dir={isRTL ? "rtl" : "ltr"}
        className={`site-navbar fixed top-0 inset-x-0 z-50 border-b transition-all duration-base ease-standard ${
          scrolled
            ? "bg-m3-surface-container/95 backdrop-blur-xl shadow-m3-2 border-m3-outline-variant"
            : "bg-m3-surface/90 backdrop-blur-md border-m3-outline-variant/60"
        }`}
      >
        <nav
          aria-label="Primary"
          className="site-nav-inner shell h-20 flex items-center justify-between gap-4"
        >
          <Link
            href={`/${locale}`}
            className="site-brand group flex items-center gap-3 shrink-0 min-h-11"
          >
            <BrandImage company={company} icon className="h-9 w-9 shrink-0" />
            <BrandImage
              company={company}
              className="h-7 min-w-0 max-w-[min(36vw,14rem)]"
            />
          </Link>

          <div className="site-navigation hidden lg:flex items-center gap-1 text-sm font-medium">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-10 px-4 py-2 rounded-full inline-flex items-center transition-colors duration-fast whitespace-nowrap ${
                    active
                      ? "bg-m3-secondary-container text-m3-on-secondary-container font-semibold"
                      : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-on-surface/[0.08]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="site-nav-tools flex items-center gap-2.5 shrink-0">
            {searchEnabled && (
              <div ref={searchBoxRef} className="hidden md:block relative">
                <form
                  action={worksHref}
                  method="get"
                  role="search"
                  onSubmit={() => setSearchFocused(false)}
                >
                  <label className="relative flex items-center">
                    <Search
                      aria-hidden="true"
                      className="w-4 h-4 text-m3-on-surface-variant pointer-events-none absolute start-3.5"
                    />
                    <input
                      type="search"
                      name="q"
                      value={query}
                      onFocus={() => setSearchFocused(true)}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchFocused(true);
                      }}
                      aria-label={t("portfolio.searchCatalogue")}
                      placeholder={t("portfolio.searchPlaceholder")}
                      className="w-44 lg:w-56 focus:w-64 transition-all duration-base rounded-full bg-m3-surface-container-high border border-m3-outline-variant ps-10 pe-4 h-10 text-xs text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary"
                    />
                  </label>
                </form>

                {searchFocused && trimmedQuery.length > 0 && (
                  <div className="absolute end-0 mt-2 w-80 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-high border border-m3-outline-variant shadow-m3-3 p-2 z-50 text-m3-on-surface">
                    {quickResults.length > 0 ? (
                      <ul className="divide-y divide-m3-outline-variant/60">
                        {quickResults.map((hit) => (
                          <li key={hit.id}>
                            <Link
                              href={hit.href}
                              onClick={() => setSearchFocused(false)}
                              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-[var(--md-sys-shape-corner-small,8px)] hover:bg-m3-on-surface/[0.08] text-xs transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-m3-on-surface truncate">
                                  {hit.title}
                                </p>
                                {hit.subtitle && (
                                  <p className="text-[11px] text-m3-on-surface-variant truncate">
                                    {hit.subtitle}
                                  </p>
                                )}
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-m3-primary shrink-0 rtl:-scale-x-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-3 text-xs text-m3-on-surface-variant">
                        {t("search.noResults")}
                      </p>
                    )}
                    <div className="pt-2 mt-1 border-t border-m3-outline-variant flex items-center justify-between gap-2 px-2 pb-1">
                      <Link
                        href={`${worksHref}?q=${encodeURIComponent(query.trim())}`}
                        onClick={() => setSearchFocused(false)}
                        className="min-h-9 inline-flex items-center text-[11px] font-semibold text-m3-primary hover:underline"
                      >
                        {t("search.projectsGroup")}
                      </Link>
                      <Link
                        href={`${articlesHref}?q=${encodeURIComponent(query.trim())}`}
                        onClick={() => setSearchFocused(false)}
                        className="min-h-9 inline-flex items-center text-[11px] font-semibold text-m3-primary hover:underline"
                      >
                        {t("search.articlesGroup")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <LanguageSwitcher variant="compact" />

            <button
              type="button"
              aria-label={t("common.menu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen(true)}
              className="lg:hidden min-w-11 min-h-11 p-2 flex items-center justify-center rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface hover:bg-m3-surface-container-high transition-colors cursor-pointer"
            >
              <Menu aria-hidden="true" className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={navLinks}
        company={company}
      />
    </>
  );
}
