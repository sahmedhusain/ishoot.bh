import { Sparkles } from "lucide-react";
import { Promotions } from "../../../components/store/Promotions";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { storeEnabled } from "../../../lib/customer";
import { getStoreCatalog } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite } from "../../../lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company }] = await Promise.all([getSite()]);
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "وصل حديثا" : "New Arrivals";
  return {
    title: companyName ? `${label} — ${companyName}` : label,
  };
}

export default async function NewArrivalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ website }, storeOn] = await Promise.all([
    getSite(),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const { items: catalogueItems, categories } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [], categories: website.categories ?? [] };

  const sortedNewest = [...catalogueItems].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />
      <header className="shell pt-6">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3 py-1 text-xs font-semibold text-m3-on-secondary-container">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {isAr ? "أحدث الإصدارات" : "Fresh Drop"}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-m3-on-surface">
            {isAr ? "وصل حديثا" : "New Arrivals"}
          </h1>
          <p className="text-sm sm:text-base text-m3-on-surface-variant max-w-2xl">
            {isAr
              ? "تصفح أحدث المنتجات والمكونات التي وصلت إلى المتجر."
              : "Explore the newest hardware, accessories, and peripherals added to the catalogue."}
          </p>
        </div>
      </header>
      <div className="shell">
        <ProductGrid items={sortedNewest} categories={categories} />
      </div>
    </div>
  );
}
