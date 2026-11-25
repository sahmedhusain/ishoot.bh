"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandImage } from "../site/BrandImage";
import { SiteRegion } from "../site/SiteTheme";
import { useTranslation } from "../../hooks/useTranslation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { CartLink } from "../store/CartLink";
import { CartDrawer, openCartDrawer } from "../store/CartDrawer";
import {
  ArrowUpRight,
  ChevronDown,
  Cpu,
  Flame,
  Gift,
  Globe,
  Heart,
  LayoutGrid,
  MapPin,
  Menu,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Trophy,
  Truck,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";
import {
  openPreferencesModal,
  StorePreferencesBar,
  useStorePreferences,
} from "./StorePreferencesBar";

interface NavbarCategoryLink {
  slug: string;
  name_en: string;
  name_ar: string;
}

interface NavbarProps {
  company: PublicCompanySettings;
  pages?: { id: string; visible: boolean }[];
  links?: { id: string; href: string; label: string; external?: boolean }[];
  accountHref?: string;
  cartEnabled?: boolean;
  cookieBannerEnabled?: boolean;
  sslBadgeEnabled?: boolean;
  categories?: NavbarCategoryLink[];
  showCategoryBar?: boolean;
  announcement?: string;
}

const WISHLIST_STORAGE_KEY = "store-guest-wishlist";

export function Navbar({
  company,
  cookieBannerEnabled = true,
  sslBadgeEnabled = true,
  categories = [],
  showCategoryBar = true,
  announcement,
}: NavbarProps) {
  const { t, locale, isRTL } = useTranslation();
  const ar = locale === "ar";
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = React.useState(false);
  const [wishlistCount, setWishlistCount] = React.useState(0);
  const { region } = useStorePreferences();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<{
    products: {
      id: string;
      slug: string;
      title_en: string;
      title_ar: string;
      price: number | null;
      brand?: string | null;
    }[];
    categories: { slug: string; name_en: string; name_ar: string }[];
  } | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchFormRef = React.useRef<HTMLFormElement>(null);
  const megaContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMobileMenuOpen(false);
    setMegaMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchFormRef.current && !searchFormRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (megaContainerRef.current && !megaContainerRef.current.contains(target)) {
        setMegaMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMegaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  React.useEffect(() => {
    const syncWishlist = () => {
      try {
        const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setWishlistCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setWishlistCount(0);
      }
    };
    syncWishlist();
    window.addEventListener("store-wishlist-change", syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener("store-wishlist-change", syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, []);

  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/store/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions({
          products: Array.isArray(data?.products) ? data.products : [],
          categories: Array.isArray(data?.categories) ? data.categories : [],
        });
        setSearchOpen(true);
      } catch {
        setSuggestions(null);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const shopLinks = [
    { id: "home", href: `/${locale}`, label: t("nav.home"), icon: Store },
    { id: "shop", href: `/${locale}/shop`, label: ar ? "تسوق الكل" : "Shop All", icon: Package, hasMega: true },
    { id: "packages", href: `/${locale}/ready-made-pcs`, label: ar ? "الباقات الجاهزة" : "Curated Packages", icon: Cpu },
    { id: "builder", href: `/${locale}/build-pc`, label: ar ? "مصمم الباقات" : "Package Builder", icon: Wrench },
    { id: "new-arrivals", href: `/${locale}/new-arrivals`, label: t("store.navNewArrivals", { defaultValue: "New Arrivals" }), icon: Sparkles },
    { id: "season-sale", href: `/${locale}/black-friday`, label: ar ? "عروض الموسم" : "Season Sale", icon: Flame, highlight: true },
    { id: "deals", href: `/${locale}/deals`, label: t("store.navDeals", { defaultValue: "Offers" }), icon: Tag },
    { id: "drops", href: `/${locale}/drops`, label: ar ? "إصدارات محدودة" : "Drops", icon: Sparkles },
    { id: "giveaways", href: `/${locale}/giveaways/seasonal`, label: ar ? "السحوبات" : "Giveaways", icon: Trophy },
    { id: "gift-cards", href: `/${locale}/gift-cards`, label: t("store.navGiftCards", { defaultValue: "Gift Cards" }), icon: Gift },
    { id: "rewards", href: `/${locale}/rewards`, label: ar ? "المكافآت" : "Rewards", icon: Sparkles },
  ];

  const mobileLinks = [
    ...shopLinks.map(({ href, label }) => ({ href, label })),
    { href: `/${locale}/categories`, label: ar ? "كل الفئات" : "All Categories" },
    { href: `/${locale}/track-order`, label: ar ? "تتبع الطلب" : "Track Order" },
    { href: `/${locale}/contact`, label: ar ? "تواصل معنا" : "Contact" },
  ];

  const mobileNavTabs = [
    { href: `/${locale}`, label: t("nav.home"), icon: Store, exact: true },
    { href: `/${locale}/shop`, label: ar ? "المتجر" : "Shop", icon: Package, exact: false },
    { href: `/${locale}/deals`, label: t("store.navDeals", { defaultValue: "Deals" }), icon: Flame, exact: false },
    { href: `/${locale}/cart`, label: t("store.cart"), icon: ShoppingBag, exact: false },
    { href: `/${locale}/account`, label: t("nav.account"), icon: UserRound, exact: false },
  ];

  return (
    <SiteRegion region="header">
      <header className="site-navbar relative z-[80] bg-m3-surface border-b border-m3-outline-variant shadow-m3-1 overflow-x-clip">
        {/* Tier 1: M3 Utility Bar (Dispatch Notice, Track Order, Store Location, Phone, Locale, Currency/Region) */}
        <div className="bg-m3-surface-container-highest text-m3-on-surface border-b border-m3-outline-variant/60 py-1.5 text-xs">
          <div className="shell flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 font-semibold text-m3-on-surface truncate">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-m3-primary-container text-m3-on-primary-container shrink-0">
                  <Truck className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="truncate">{announcement || t("store.fastDeliveryNotice")}</span>
              </span>

              <span className="hidden md:inline-block h-3.5 w-px bg-m3-outline-variant" aria-hidden="true" />

              <Link
                href={`/${locale}/track-order`}
                className="hidden md:inline-flex items-center gap-1.5 font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors whitespace-nowrap"
              >
                <Package className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                <span>{ar ? "تتبع الطلب" : "Track order"}</span>
              </Link>

              <Link
                href={`/${locale}/stores`}
                className="hidden md:inline-flex items-center gap-1.5 font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors whitespace-nowrap"
              >
                <MapPin className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                <span>{ar ? "موقعنا" : "Our location"}</span>
              </Link>

              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="hidden lg:inline-flex items-center gap-1.5 font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors whitespace-nowrap"
                >
                  <Phone className="h-3.5 w-3.5 text-m3-primary" aria-hidden="true" />
                  <bdi dir="ltr">{company.phone}</bdi>
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher variant="compact" />
              <button
                type="button"
                data-testid="preferences-trigger"
                onClick={() => openPreferencesModal()}
                className="m3-state-layer inline-flex min-h-9 items-center gap-1.5 px-3 py-1 rounded-full bg-m3-surface-container-low border border-m3-outline-variant text-xs font-semibold text-m3-on-surface hover:border-m3-primary transition-colors cursor-pointer whitespace-nowrap"
                aria-label={t("store.preferencesTitle", { defaultValue: "Store Preferences" })}
              >
                <Globe className="h-3.5 w-3.5 text-m3-primary shrink-0" aria-hidden="true" />
                <span>{region.currency}</span>
                <span className="hidden sm:inline text-m3-on-surface-variant font-medium">
                  · {ar ? region.name_ar : region.name_en}
                </span>
                <ChevronDown className="h-3 w-3 text-m3-on-surface-variant" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Brand Lockup + M3 Search Bar + Wishlist / Cart / Quick-Bag / Account */}
        <div className="shell py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 lg:gap-6">
          <Link href={`/${locale}`} className="site-brand flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <div className="relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center shrink-0 rounded-2xl bg-m3-surface-container border border-m3-outline-variant p-1.5 group-hover:border-m3-primary transition-colors">
              <BrandImage company={company} icon className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 object-contain" />
            </div>
            <BrandImage company={company} className="h-6 sm:h-7 min-w-0 max-w-[110px] sm:max-w-[min(34vw,14rem)] object-contain" />
          </Link>

          <form
            ref={searchFormRef}
            action={`/${locale}/shop`}
            method="get"
            onSubmit={() => setSearchOpen(false)}
            className="order-last md:order-none w-full md:w-auto md:flex-1 md:max-w-2xl flex items-center relative"
          >
            <input
              type="search"
              name="q"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (suggestions) setSearchOpen(true);
              }}
              aria-label={t("store.searchCatalogue")}
              placeholder={t("store.searchPlaceholder")}
              className="w-full h-12 rounded-full bg-m3-surface-container-high border border-m3-outline-variant ps-11 pe-28 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant transition-all focus:outline-none focus:border-m3-primary focus:bg-m3-surface-container-lowest focus:ring-2 focus:ring-m3-primary/20 [&::-webkit-search-cancel-button]:hidden"
            />
            <Search className="h-4 w-4 absolute start-4 text-m3-on-surface-variant pointer-events-none" aria-hidden="true" />
            {searchQuery.length > 0 && (
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions(null);
                  setSearchOpen(false);
                }}
                data-keep-round="true"
                className="absolute end-24 h-8 w-8 rounded-full text-m3-on-surface-variant hover:bg-m3-surface-container-highest flex items-center justify-center cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="m3-state-layer absolute end-1.5 top-1.5 bottom-1.5 px-5 rounded-full bg-m3-primary text-xs font-bold text-m3-on-primary transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>{t("common.search")}</span>
            </button>

            {searchOpen && suggestions && (suggestions.products.length > 0 || suggestions.categories.length > 0) && (
              <div
                data-testid="search-autocomplete"
                dir={isRTL ? "rtl" : "ltr"}
                className="m3-menu absolute top-full start-0 end-0 mt-2 shadow-m3-3 p-3 space-y-2 z-50"
              >
                {suggestions.categories.length > 0 && (
                  <div className="space-y-1.5 pb-2 border-b border-m3-outline-variant/60">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-m3-on-surface-variant px-1">
                      {ar ? "في الفئات" : "In categories"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.categories.map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/${locale}/category/${cat.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="px-3 py-1 rounded-full bg-m3-secondary-container text-xs font-semibold text-m3-on-secondary-container hover:opacity-90"
                        >
                          {ar ? cat.name_ar || cat.name_en : cat.name_en}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-m3-on-surface-variant px-1">
                    {ar ? "أبرز المنتجات" : "Top products"}
                  </p>
                  {suggestions.products.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${locale}/products/${item.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="m3-menu-item"
                    >
                      <span className="truncate font-medium text-m3-on-surface">
                        {ar ? item.title_ar || item.title_en : item.title_en}
                      </span>
                      {item.price != null && (
                        <span className="shrink-0 font-mono text-m3-primary font-semibold">
                          {Number(item.price).toFixed(3)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/${locale}/shop?q=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={() => setSearchOpen(false)}
                  className="block text-center text-xs font-semibold text-m3-primary py-2 hover:underline"
                >
                  {t("store.seeAllResults", { defaultValue: "View all search results" })}
                </Link>
              </div>
            )}
          </form>

          {/* Right User Actions: Wishlist + Cart Link + Quick-Cart Drawer + Account + Mobile Drawer Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href={`/${locale}/wishlist`}
              data-testid="navbar-wishlist-link"
              aria-label={t("account.wishlist")}
              title={t("account.wishlist")}
              className="m3-state-layer hidden sm:grid relative h-11 w-11 place-items-center rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface hover:border-m3-primary transition-colors"
            >
              <Heart className="w-4 h-4 text-m3-primary" aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -end-1 h-5 min-w-[20px] px-1 rounded-full bg-m3-primary text-m3-on-primary text-[10px] font-bold grid place-items-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <CartLink className="m3-state-layer inline-flex items-center gap-2 h-11 px-3.5 sm:px-4 rounded-full bg-m3-primary text-m3-on-primary transition-all shadow-m3-1 font-bold text-xs" />

            <button
              type="button"
              data-testid="cart-drawer-trigger"
              aria-label={ar ? "فتح درج السلة السريع" : "Open quick bag drawer"}
              title={ar ? "معاينة السلة" : "Quick bag"}
              onClick={() => openCartDrawer()}
              data-keep-round="true"
              className="m3-state-layer hidden lg:grid h-11 w-11 place-items-center rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface hover:border-m3-primary transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4 text-m3-primary" aria-hidden="true" />
            </button>

            <Link
              href={`/${locale}/account`}
              aria-label={t("nav.account")}
              title={t("nav.account")}
              className="m3-state-layer hidden sm:inline-flex h-11 items-center gap-2 px-3.5 sm:px-4 rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface hover:border-m3-primary transition-colors text-xs font-semibold"
            >
              <UserRound className="w-4 h-4 text-m3-primary" aria-hidden="true" />
              <span className="hidden md:inline">{t("nav.account")}</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              data-keep-round="true"
              className="m3-state-layer md:hidden w-11 h-11 grid place-items-center rounded-full border border-m3-outline-variant bg-m3-surface-container-high text-m3-on-surface cursor-pointer shrink-0"
              aria-label={t("common.openMenu")}
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tier 3: Category Strip + Shop Navigation & Mega Menu */}
        <div
          ref={megaContainerRef}
          className="relative bg-m3-surface-container-low border-t border-m3-outline-variant/60 hidden md:block"
        >
          <div className="shell flex flex-col">
            <nav
              aria-label={t("common.navigation")}
              data-testid="navbar-shop-subbar"
              className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 py-2"
            >
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-1 min-w-0">
                {shopLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.href === `/${locale}`
                      ? pathname === `/${locale}`
                      : pathname.startsWith(link.href);

                  if (link.hasMega) {
                    return (
                      <div key={link.id} className="inline-flex items-center rounded-full border border-m3-outline-variant bg-m3-surface shrink-0">
                        <Link
                          href={link.href}
                          className={`m3-state-layer inline-flex min-h-9 items-center gap-1.5 ps-3 pe-2 py-1 rounded-s-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            isActive
                              ? "bg-m3-secondary-container text-m3-on-secondary-container"
                              : "text-m3-on-surface hover:bg-m3-surface-container-high"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 text-m3-primary shrink-0" aria-hidden="true" />
                          <span>{link.label}</span>
                        </Link>
                        <button
                          type="button"
                          aria-expanded={megaMenuOpen}
                          aria-label={ar ? "فتح قائمة الفئات" : "Toggle category mega menu"}
                          data-testid="navbar-mega-toggle"
                          onClick={() => setMegaMenuOpen((open) => !open)}
                          className={`inline-flex min-h-9 items-center pe-2.5 ps-1.5 py-1 rounded-e-full border-s border-m3-outline-variant transition-colors cursor-pointer ${
                            megaMenuOpen
                              ? "bg-m3-primary text-m3-on-primary"
                              : "text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
                          }`}
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${megaMenuOpen ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                    );
                  }

                  if (link.highlight) {
                    return (
                      <Link
                        key={link.id}
                        href={link.href}
                        className="m3-state-layer inline-flex min-h-9 items-center gap-1.5 px-3 py-1 rounded-full bg-m3-tertiary-container text-m3-on-tertiary-container text-xs font-bold whitespace-nowrap transition-colors shrink-0"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={`m3-state-layer inline-flex min-h-9 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                        isActive
                          ? "bg-m3-secondary-container text-m3-on-secondary-container"
                          : "text-m3-on-surface-variant hover:text-m3-on-surface hover:bg-m3-surface-container-high"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 text-m3-primary shrink-0" aria-hidden="true" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              <Link
                href={`/${locale}/contact`}
                className="m3-state-layer inline-flex min-h-9 items-center gap-1 px-3 rounded-full border border-m3-outline-variant bg-m3-surface text-xs font-semibold text-m3-on-surface hover:border-m3-primary hover:text-m3-primary transition-colors whitespace-nowrap shrink-0"
              >
                <span>{ar ? "تواصل معنا" : "Contact"}</span>
                <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </nav>

            {showCategoryBar && categories.length > 0 && (
              <nav
                aria-label={t("store.customCategoriesNav", { defaultValue: "Categories" })}
                data-testid="navbar-custom-categories"
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-m3-outline-variant/50"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-m3-on-surface-variant me-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-m3-primary" aria-hidden="true" />
                    <span>{ar ? "الأقسام:" : "Departments:"}</span>
                  </span>
                  {categories.slice(0, 9).map((cat) => {
                    const activeCat =
                      pathname === `/${locale}/category/${cat.slug}` ||
                      pathname === `/${locale}/categories/${cat.slug}`;
                    return (
                      <Link
                        key={cat.slug}
                        href={`/${locale}/category/${cat.slug}`}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                          activeCat
                            ? "border-m3-primary bg-m3-secondary-container text-m3-on-secondary-container"
                            : "border-m3-outline-variant bg-m3-surface text-m3-on-surface hover:border-m3-primary hover:text-m3-primary"
                        }`}
                      >
                        {ar ? cat.name_ar || cat.name_en : cat.name_en}
                      </Link>
                    );
                  })}
                </div>
                <Link
                  href={`/${locale}/categories`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-m3-primary hover:underline shrink-0"
                >
                  <span>{ar ? "كل الفئات" : "All categories"}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </nav>
            )}
          </div>

          {megaMenuOpen && (
            <div
              data-testid="navbar-mega-menu"
              className="border-t border-m3-outline-variant bg-m3-surface-container shadow-m3-3 py-6"
            >
              <div className="shell grid gap-6 lg:grid-cols-[1fr_280px]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface-variant">
                      {ar ? "تصفح حسب الفئة" : "Shop by Category"}
                    </h3>
                    <Link
                      href={`/${locale}/categories`}
                      onClick={() => setMegaMenuOpen(false)}
                      className="text-xs font-bold text-m3-primary hover:underline"
                    >
                      {ar ? "عرض كل الفئات" : "View All Categories"}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/${locale}/category/${cat.slug}`}
                        onClick={() => setMegaMenuOpen(false)}
                        className="rounded-xl border border-m3-outline-variant bg-m3-surface-container-low px-3.5 py-2.5 text-xs font-semibold text-m3-on-surface hover:border-m3-primary hover:text-m3-primary transition-colors"
                      >
                        {ar ? cat.name_ar || cat.name_en : cat.name_en}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-m3-primary-container text-m3-on-primary-container border border-m3-outline-variant/50 p-5 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-m3-primary px-2.5 py-0.5 text-[10px] font-bold text-m3-on-primary">
                      <Flame className="w-3 h-3" aria-hidden="true" /> HOT DEALS
                    </span>
                    <h4 className="font-display text-lg font-bold">
                      {ar ? "عروض وتخفيضات الأسبوع" : "Featured Store Deals"}
                    </h4>
                    <p className="text-xs opacity-85">
                      {ar ? "وفّر على المنتجات المختارة واكسب نقاط ولاء إضافية" : "Save on selected collections and earn bonus loyalty rewards."}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/deals`}
                    onClick={() => setMegaMenuOpen(false)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-m3-primary px-4 py-2 text-xs font-bold text-m3-on-primary hover:brightness-95"
                  >
                    {ar ? "تصفح العروض" : "Shop Deals"}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={mobileLinks}
        company={company}
      />

      <CartDrawer />

      <StorePreferencesBar
        cookieBannerEnabled={cookieBannerEnabled}
        sslBadgeEnabled={sslBadgeEnabled}
      />

      {/* M3 Mobile Bottom Navigation Bar */}
      <nav
        aria-label={t("nav.home")}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-m3-surface-container border-t border-m3-outline-variant grid grid-cols-5 py-1.5 text-[11px] font-medium text-m3-on-surface-variant shadow-m3-2"
      >
        {mobileNavTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
                active ? "text-m3-on-surface font-semibold" : "text-m3-on-surface-variant hover:text-m3-primary"
              }`}
            >
              <span
                className={`px-4 py-1 rounded-full transition-colors ${
                  active ? "bg-m3-secondary-container text-m3-on-secondary-container" : ""
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="truncate max-w-full px-1">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </SiteRegion>
  );
}

export const StoreNavbar = Navbar;
