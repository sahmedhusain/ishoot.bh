import { Promotions } from "../../../components/store/Promotions";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { storeEnabled } from "../../../lib/customer";
import { catalogueProductPrices } from "@platform/database/queries/store";
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

  const prices = storeOn
    ? await catalogueProductPrices(website.portfolio.map((item) => item.id))
    : new Map<string, number>();
  const catalogueItems = website.portfolio.map((item) =>
    prices.has(item.id)
      ? { ...item, price: prices.get(item.id) as number | undefined }
      : item,
  );
  const categories = website.categories ?? [];

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
