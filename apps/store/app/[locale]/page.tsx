import Link from "next/link";
import { ArrowUpRight, Truck, Store, ShieldCheck, Tag } from "lucide-react";
import { Promotions } from "../../components/store/Promotions";
import { StoreHero } from "../../components/store/StoreHero";
import { ProductGrid } from "../../components/store/ProductGrid";
import { storeEnabled } from "../../lib/customer";
import { catalogueProductPrices } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../lib/site";

export default async function StoreHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [{ website, company }, t, storeOn] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const prices = storeOn
    ? await catalogueProductPrices(website.portfolio.map((item) => item.id))
    : new Map<string, number>();
  const catalogueItems = website.portfolio.map((item) =>
    prices.has(item.id)
      ? { ...item, price: prices.get(item.id) as number | undefined }
      : item,
  );
  const banner = website.banners[0];
  const categories = website.categories ?? [];

  return (
    <div className="home-page flex flex-col w-full space-y-12 pb-20">
      {/* 1. Store Promotional Hero Banner */}
      <StoreHero banner={banner} company={company} locale={locale} />

      <div className="shell space-y-12">
        {/* 2. Store Value Propositions Bar */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-m3-surface-container-low border border-m3-outline-variant/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">Express Delivery</h3>
              <p className="text-[11px] text-m3-on-surface-variant">Fast courier shipping to your door</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">Branch Pickup</h3>
              <p className="text-[11px] text-m3-on-surface-variant">Ready in 1 hour at our branches</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <Tag className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">Best Store Deals</h3>
              <p className="text-[11px] text-m3-on-surface-variant">Direct pricing & verified coupons</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">100% Guaranteed</h3>
              <p className="text-[11px] text-m3-on-surface-variant">Original products & warranty</p>
            </div>
          </div>
        </section>

        {/* 3. Featured Categories */}
        {categories.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-m3-on-surface">
                  {t.store.categoriesTitle}
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  Browse products by store collection
                </p>
              </div>
              <Link
                href={`/${locale}/products`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-m3-primary hover:underline"
              >
                <span>{t.store.allProducts}</span>
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${locale}/categories/${encodeURIComponent(cat.slug)}`}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-m3-outline-variant/60 bg-m3-surface-container-lowest p-4 text-center transition-all hover:border-m3-primary hover:bg-m3-surface-container-low hover:shadow-md group"
                >
                  <div className="h-12 w-12 rounded-full bg-m3-primary/10 flex items-center justify-center text-m3-primary group-hover:scale-110 transition-transform">
                    <Tag className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-m3-on-surface line-clamp-1">
                    {pickText(cat.name_en, cat.name_ar, locale)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 4. Active Promotions Banner */}
        <Promotions locale={locale} placement="home" />

        {/* 5. Product Catalog & Bestsellers Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-m3-on-surface">
                {t.store.allProducts}
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                Top selling items available for instant delivery or local pickup
              </p>
            </div>
          </div>
          <ProductGrid items={catalogueItems} categories={categories} />
        </section>
      </div>
    </div>
  );
}
