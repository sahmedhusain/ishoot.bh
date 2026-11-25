import Link from "next/link";
import { Package, Sparkles } from "lucide-react";
import { Promotions } from "../../../components/store/Promotions";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { storeEnabled } from "../../../lib/customer";
import { getEffectiveStoreCategories, getStoreCatalog } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company }, t] = await Promise.all([getSite(), siteTranslations(locale)]);
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "تسوق الكل" : t.store.allProducts;
  return {
    title: companyName ? `${label} — ${companyName}` : label,
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ website }, t, storeOn] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const [{ items: catalogueItems, categories: rawCategories }, customCats] =
    await Promise.all([
      storeOn
        ? getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
        : Promise.resolve({
            items: website.portfolio ?? [],
            categories: website.categories ?? [],
          }),
      getEffectiveStoreCategories(website.categories ?? []).catch(
        () => website.categories ?? [],
      ),
    ]);
  const categories = customCats.length > 0 ? customCats : rawCategories;
  const brands = Array.from(
    new Set(
      catalogueItems
        .map((it) => it.brand?.trim())
        .filter((b): b is string => Boolean(b)),
    ),
  ).slice(0, 12);

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />
      <header className="shell pt-6 space-y-4">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3 py-1 text-xs font-semibold text-m3-on-secondary-container">
              <Package className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "كتالوج المتجر الكامل" : "Complete Hardware Catalog"}
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface">
              {isAr ? "تسوق جميع المنتجات" : t.store.allProducts}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/deals`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-m3-primary px-4 py-2 text-xs font-bold text-m3-on-primary"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "العروض والتخفيضات" : "Hot Deals"}
            </Link>
            <Link
              href={`/${locale}/categories`}
              className="inline-flex min-h-10 items-center rounded-full border border-m3-outline-variant bg-m3-surface px-4 py-2 text-xs font-semibold text-m3-on-surface hover:border-m3-primary"
            >
              {isAr ? "دليل الفئات" : "Browse Categories"}
            </Link>
          </div>
        </div>

        {brands.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-m3-on-surface-variant">
              {isAr ? "العلامات التجارية:" : "Brands:"}
            </span>
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/${locale}/shop?brand=${encodeURIComponent(brand)}`}
                className="rounded-full border border-m3-outline-variant bg-m3-surface-container-low px-3 py-1 font-medium text-m3-on-surface hover:border-m3-primary hover:text-m3-primary"
              >
                {brand}
              </Link>
            ))}
          </div>
        )}
      </header>
      <div className="shell">
        <ProductGrid items={catalogueItems} categories={categories} />
      </div>
    </div>
  );
}
