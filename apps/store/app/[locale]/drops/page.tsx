import { Sparkles } from "lucide-react";
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
  const { company, website } = await getSite();
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const cmsPage = website?.pages?.find((p) => p.slug === "drops");
  const label =
    pickText(cmsPage?.seo_title_en || cmsPage?.title_en, cmsPage?.seo_title_ar || cmsPage?.title_ar, locale) ||
    (locale === "ar" ? "إصدارات محدودة Drops" : "Limited Store Drops");
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function DropsPage({
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
  const dropItems = [...catalogueItems].reverse();
  const cmsPage = website.pages?.find((p) => p.slug === "drops");

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-8 pb-20">
      <header className="shell pt-6">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-inverse-surface text-m3-inverse-on-surface p-6 sm:p-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {isAr ? "دفعات حصرية محدودة" : "LIMITED STORE DROPS"}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            {pickText(cmsPage?.title_en, cmsPage?.title_ar, locale) ||
              (isAr ? "أحدث الإصدارات الحصرية" : "Latest Limited Drops")}
          </h1>
          <p className="text-sm sm:text-base opacity-80 max-w-2xl">
            {pickText(cmsPage?.seo_description_en, cmsPage?.seo_description_ar, locale) ||
              (isAr
                ? "إصدارات أسبوعية محدودة الكمية عبر مختلف أقسام المتجر المختارة."
                : "Curated small-batch releases across flagship store collections and limited seasonal sets.")}
          </p>
        </div>
      </header>
      <div className="shell">
        <ProductGrid items={dropItems} categories={categories} />
      </div>
    </div>
  );
}
