import Link from "next/link";
import { Flame, Trophy } from "lucide-react";
import { CountdownCampaignBanner } from "../../../components/store/StorefrontShowcase";
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
  const cmsPage = website?.pages?.find((p) => p.slug === "black-friday");
  const label =
    pickText(cmsPage?.seo_title_en || cmsPage?.title_en, cmsPage?.seo_title_ar || cmsPage?.title_ar, locale) ||
    (locale === "ar" ? "عروض الجمعة البيضاء والموسم" : "Seasonal Mega Sale & Black Friday");
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function BlackFridayPage({
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
  const saleItems = catalogueItems.filter(
    (item) =>
      (item.compare_at_price != null && item.price != null && item.compare_at_price > item.price) ||
      Boolean(item.price_note_en || item.price_note_ar),
  );
  const cmsPage = website.pages?.find((p) => p.slug === "black-friday");

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <div className="shell pt-6 space-y-6">
        <CountdownCampaignBanner
          locale={locale}
          badge={isAr ? "حدث الموسم الأكبر" : "Seasonal Event · Up to 45% Off"}
          title={
            pickText(cmsPage?.title_en, cmsPage?.title_ar, locale) ||
            (isAr ? "عروض التخفيضات الكبرى والموسم" : "Seasonal Mega Deals & Raffle Event")
          }
          subtitle={
            pickText(cmsPage?.seo_description_en, cmsPage?.seo_description_ar, locale) ||
            (isAr
              ? "خصومات محدودة عبر جميع الفئات المختارة مع تذاكر سحب تلقائية ونقاط ولاء."
              : "Unbeatable limited-run discounts across curated store collections + automatic giveaway entries.")
          }
          ctaLabel={isAr ? "عرض تفاصيل السحب" : "View Giveaway Prizes"}
          ctaHref={`/${locale}/giveaways/seasonal`}
          daysRemaining={11}
        />

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-m3-error shrink-0" aria-hidden="true" />
            <div>
              <h1 className="font-display text-2xl font-bold text-m3-on-surface">
                {isAr ? "تخفيضات الموسم الحصرية" : "Flash Campaign Selection"}
              </h1>
              <p className="text-xs text-m3-on-surface-variant">
                {isAr ? "متوفرة حتى نفاذ الكمية" : "Available online & in-store while stocks last"}
              </p>
            </div>
          </div>
          <Link
            href={`/${locale}/deals`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-m3-outline-variant bg-m3-surface px-4 py-2 text-xs font-semibold hover:border-m3-primary"
          >
            <Trophy className="w-3.5 h-3.5 text-m3-primary" aria-hidden="true" />
            {isAr ? "كل القسائم" : "All Coupons"}
          </Link>
        </div>

        <ProductGrid items={saleItems.length > 0 ? saleItems : catalogueItems} categories={categories} />
      </div>
    </div>
  );
}
