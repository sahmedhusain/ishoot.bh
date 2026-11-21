import { Promotions } from "../../../components/store/Promotions";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { storeEnabled } from "../../../lib/customer";
import { getStoreCatalog } from "@platform/database/queries/store";
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
  return {
    title: companyName ? `${t.store.allProducts} — ${companyName}` : t.store.allProducts,
  };
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ website }, t, storeOn] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const { items: catalogueItems, categories } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [], categories: website.categories ?? [] };

  return (
    <div className="space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />
      <header className="shell pt-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          {t.store.allProducts}
        </h1>
      </header>
      <ProductGrid
        items={catalogueItems}
        categories={categories}
      />
    </div>
  );
}
