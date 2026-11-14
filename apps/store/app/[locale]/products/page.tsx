import { Promotions } from "../../../components/store/Promotions";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { storeEnabled } from "../../../lib/customer";
import { getStoreCatalog } from "@platform/database/queries/store";
import { getSite, siteTranslations } from "../../../lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [, t] = await Promise.all([getSite(), siteTranslations(locale)]);
  return {
    title: t.store.allProducts,
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const [{ locale }, { category }] = await Promise.all([params, searchParams]);
  const [{ website }, storeOn] = await Promise.all([
    getSite(),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const { items: catalogueItems, categories } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [], categories: website.categories ?? [] };

  return (
    <div className="space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />
      <ProductGrid
        items={catalogueItems}
        categories={categories}
        initialCategory={category}
      />
    </div>
  );
}
