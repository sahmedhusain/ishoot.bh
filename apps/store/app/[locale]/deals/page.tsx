import Link from "next/link";
import { Award, Flame, Sparkles, Tag, Ticket } from "lucide-react";
import { Promotions } from "../../../components/store/Promotions";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { CountdownCampaignBanner } from "../../../components/store/StorefrontShowcase";
import { storeEnabled } from "../../../lib/customer";
import { getStoreCatalog, getStoreSettings, listActiveCouponsPublic } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../lib/site";
import { formatPrice } from "../../../lib/site-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company, website }] = await Promise.all([getSite()]);
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const cmsPage = website?.pages?.find((p) => p.slug === "deals");
  const label =
    pickText(cmsPage?.seo_title_en || cmsPage?.title_en, cmsPage?.seo_title_ar || cmsPage?.title_ar, locale) ||
    (locale === "ar" ? "العروض والصفقات" : "Store Deals & Special Offers");
  return {
    title: companyName ? `${label} — ${companyName}` : label,
  };
}

export default async function DealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ website, info }, t, storeOn, settings, coupons] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    storeEnabled().catch(() => false),
    getStoreSettings().catch(() => null),
    listActiveCouponsPublic().catch(() => []),
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
  const displayItems = saleItems.length > 0 ? saleItems : catalogueItems;
  const cmsPage = website.pages?.find((p) => p.slug === "deals");

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-8 pb-20">
      <Promotions locale={locale} placement="catalogue" />

      <div className="shell pt-6 space-y-6">
        <CountdownCampaignBanner
          locale={locale}
          badge={isAr ? "متاح الآن" : "On now · Seasonal Sale"}
          title={
            pickText(cmsPage?.title_en, cmsPage?.title_ar, locale) ||
            (isAr ? "عروض التخفيضات الكبرى" : "Seasonal Storewide Sale")
          }
          subtitle={
            pickText(cmsPage?.seo_description_en, cmsPage?.seo_description_ar, locale) ||
            (isAr
              ? "خصومات فورية عبر أحدث المنتجات المختارة مع نقاط ولاء وتذاكر سحب إضافية."
              : "Limited-time savings across featured store collections, active coupon codes, and raffle bonuses.")
          }
          ctaLabel={isAr ? "تصفح جميع العروض" : "Shop the deals"}
          ctaHref={`/${locale}/black-friday`}
          daysRemaining={12}
        />

        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3.5 py-1 text-xs font-semibold text-m3-on-secondary-container">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "عروض حصرية ومحدودة" : "CURRENT OFFERS"}
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface">
              {isAr ? "العروض والصفقات الحصرية" : "Deals & Offers"}
            </h1>
            <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
              {isAr
                ? "استفد من أحدث التخفيضات وقسائم الخصم واكسب نقاط ولاء وتذاكر سحب مع كل طلب."
                : "Save more across seasonal collections, active coupon codes, loyalty point bonuses, and raffle entries."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {settings?.loyalty_enabled !== false && (
              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-4 flex items-center gap-3">
                <Award className="w-5 h-5 text-m3-primary shrink-0" aria-hidden="true" />
                <div className="text-xs">
                  <p className="font-bold text-m3-on-surface">
                    {isAr ? "نقاط الولاء" : "Loyalty Rewards"}
                  </p>
                  <p className="text-m3-on-surface-variant">
                    {settings?.points_per_unit ?? 10} {isAr ? "نقطة / د.ب" : "pts / BD"}
                  </p>
                </div>
              </div>
            )}
            {settings?.raffle_enabled !== false && (
              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-m3-primary shrink-0" aria-hidden="true" />
                <div className="text-xs">
                  <p className="font-bold text-m3-on-surface">
                    {isAr ? "سحب الجوائز" : "Monthly Giveaway"}
                  </p>
                  <p className="text-m3-on-surface-variant">
                    {pickText(settings?.raffle_prize_en, settings?.raffle_prize_ar, locale)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {coupons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="deals-coupons-grid">
            {coupons.map((c) => (
              <article
                key={c.id}
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-4 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-m3-primary" dir="ltr">
                    <Ticket className="w-4 h-4" aria-hidden="true" />
                    {c.code}
                  </span>
                  <p className="text-xs text-m3-on-surface-variant">
                    {c.kind === "percent"
                      ? isAr
                        ? `خصم ${c.value}% عند الدفع`
                        : `${c.value}% off at checkout`
                      : isAr
                        ? `خصم ${formatPrice(c.value, info.currency, locale)}`
                        : `${formatPrice(c.value, info.currency, locale)} off order`}
                  </p>
                </div>
                <Link
                  href={`/${locale}/cart`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-m3-primary px-4 py-2 text-xs font-semibold text-m3-on-primary hover:brightness-95"
                >
                  <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                  {t.store.applyCoupon}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="shell space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-m3-on-surface">
            {isAr ? "تخفيضات جارية الآن" : "On sale now"}
          </h2>
          <Link href={`/${locale}/shop`} className="text-xs font-bold text-m3-primary hover:underline">
            {isAr ? "عرض الكل" : "VIEW ALL"}
          </Link>
        </div>
        <ProductGrid items={displayItems} categories={categories} />
      </div>
    </div>
  );
}
