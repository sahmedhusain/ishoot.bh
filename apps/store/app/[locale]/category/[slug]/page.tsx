import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Promotions } from "../../../../components/store/Promotions";
import { ProductGrid } from "../../../../components/store/ProductGrid";
import { storeEnabled } from "../../../../lib/customer";
import { getStoreCatalog } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite } from "../../../../lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { website } = await getSite();
  const { categories } = await getStoreCatalog(
    website?.portfolio ?? [],
    website?.categories ?? [],
  );
  const category = categories.find((cat) => cat.slug === slug);
  if (!category) return {};
  return {
    title: pickText(category.name_en, category.name_ar, locale),
  };
}

export default async function SingularCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [{ website }, storeOn] = await Promise.all([
    getSite(),
    storeEnabled().catch(() => false),
  ]);
  if (!website) notFound();
  const { items: catalogueItems, categories } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [], categories: website.categories ?? [] };
  const category = categories.find((cat) => cat.slug === slug);
  if (!category) notFound();

  const categoryTitle = pickText(category.name_en, category.name_ar, locale);

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />
      <header className="shell pt-6 space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
          <Link href={`/${locale}`} className="hover:text-m3-primary">
            {locale === "ar" ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          <Link href={`/${locale}/products`} className="hover:text-m3-primary">
            {locale === "ar" ? "المنتجات" : "Products"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          <span className="text-m3-on-surface font-medium">{categoryTitle}</span>
        </nav>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-m3-on-surface">
          {categoryTitle}
        </h1>
      </header>
      <div className="shell">
        <ProductGrid
          items={catalogueItems}
          categories={categories}
          initialCategory={slug}
        />
      </div>
    </div>
  );
}
