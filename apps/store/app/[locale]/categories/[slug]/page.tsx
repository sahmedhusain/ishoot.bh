import { notFound } from "next/navigation";
import { Promotions } from "../../../../components/store/Promotions";
import { ProductGrid } from "../../../../components/store/ProductGrid";
import { storeEnabled } from "../../../../lib/customer";
import { getStoreCatalog } from "@platform/database/queries/store";
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

export default async function CategoryPage({
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

  return (
    <div className="space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />
      <ProductGrid
        items={catalogueItems}
        categories={categories}
        initialCategory={slug}
      />
    </div>
  );
}
