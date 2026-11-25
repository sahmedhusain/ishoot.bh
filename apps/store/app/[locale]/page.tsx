import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Flame,
  Gift,
  Headphones,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  Trophy,
  Wrench,
} from "lucide-react";
import { Promotions } from "../../components/store/Promotions";
import { StoreHero } from "../../components/store/StoreHero";
import { ProductGrid } from "../../components/store/ProductGrid";
import {
  PcMatchmakerBanner,
  ProductCarouselSection,
} from "../../components/store/StorefrontShowcase";
import { storeEnabled } from "../../lib/customer";
import {
  getEffectiveStoreCategories,
  getStoreCatalog,
  getStoreSettings,
} from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../lib/site";

export default async function StoreHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ website, company, info }, t, storeOn] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const [{ items: catalogueItems, categories: rawCategories }, storeSettings, categories] =
    await Promise.all([
      storeOn
        ? getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
        : Promise.resolve({
            items: website.portfolio ?? [],
            categories: website.categories ?? [],
          }),
      getStoreSettings().catch(() => null),
      getEffectiveStoreCategories(website.categories ?? []).catch(
        () => website.categories ?? [],
      ),
    ]);
  const effectiveCategories = categories.length > 0 ? categories : rawCategories;
  const banner = website.banners?.[0];
  const showDeals = storeSettings?.show_deals_section ?? true;
  const showGiftCards = storeSettings?.show_gift_cards_section ?? true;

  const flashDeals = catalogueItems.filter(
    (item) =>
      (item.compare_at_price != null &&
        item.price != null &&
        item.compare_at_price > item.price) ||
      Boolean(item.price_note_en || item.price_note_ar),
  );
  const dealsCarouselItems = flashDeals.length > 0 ? flashDeals : catalogueItems.slice(0, 10);
  const newArrivalsItems = [...catalogueItems].reverse().slice(0, 10);
  const specialistPicks = catalogueItems.slice(0, 10);

  return (
    <div className="home-page flex flex-col w-full space-y-12 pb-20 bg-m3-surface text-m3-on-surface">
      {/* 1. Asymmetric 70:30 Hero Carousel + 2 Stacked Promo Cards */}
      <StoreHero
        banner={banner}
        banners={website.banners}
        company={company}
        locale={locale}
        categories={effectiveCategories}
        loyaltyEnabled={storeSettings?.loyalty_enabled ?? true}
        raffleEnabled={Boolean(storeSettings?.raffle_enabled)}
        rafflePrize={pickText(
          storeSettings?.raffle_prize_en,
          storeSettings?.raffle_prize_ar,
          locale,
        )}
      />

      <div className="shell space-y-12">
        {/* 2. 4-Column Store Assurance & Support Trust Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-m3-surface-container-low border border-m3-outline-variant/60">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">
                {isAr ? "جودة ومواصفات موثوقة" : "Verified product quality"}
              </h3>
              <p className="text-[11px] text-m3-on-surface-variant">
                {isAr ? "مراجعة وفحص دقيق قبل التسليم" : "Inspected & certified before dispatch"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">
                {isAr ? "تجهيز وتغليف احترافي" : "Careful order preparation"}
              </h3>
              <p className="text-[11px] text-m3-on-surface-variant">
                {isAr ? "تغليف آمن وجاهزية تامة للاستخدام" : "Protective packaging & verification"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">{t.store.guaranteed}</h3>
              <p className="text-[11px] text-m3-on-surface-variant">{t.store.guaranteedSub}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-m3-primary/10 flex items-center justify-center shrink-0">
              <Headphones className="h-5 w-5 text-m3-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-m3-on-surface">
                {isAr ? "دعم محلي مباشر" : "Local support"}
              </h3>
              <p className="text-[11px] text-m3-on-surface-variant">{t.store.expressDeliverySub}</p>
            </div>
          </div>
        </section>

        {/* 3. 2-Column Giveaway Banner Grid */}
        {storeSettings?.raffle_enabled &&
          (storeSettings?.raffle_prize_en || storeSettings?.raffle_prize_ar) && (
          <section
            className="grid gap-4 md:grid-cols-2"
            data-testid="home-giveaway-banners"
          >
            <div className="rounded-3xl bg-m3-primary-container text-m3-on-primary-container border border-m3-outline-variant/60 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
                  <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                  {isAr ? "سحب الموسم الرئيسي" : "SEASONAL RAFFLE DRAW"}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  {pickText(
                    storeSettings?.raffle_prize_en,
                    storeSettings?.raffle_prize_ar,
                    locale,
                  )}
                </h2>
                <p className="text-xs sm:text-sm opacity-85">
                  {isAr
                    ? `احصل على تذكرة سحب تلقائيا مقابل كل ${storeSettings?.raffle_spend_unit ?? 10} ${info.currency} من مشترياتك.`
                    : `Receive 1 automatic raffle entry for every ${storeSettings?.raffle_spend_unit ?? 10} ${info.currency} spent online or in-store.`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/${locale}/giveaways/seasonal`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-m3-primary px-5 py-2.5 text-xs font-bold text-m3-on-primary hover:brightness-95"
                >
                  <Ticket className="w-4 h-4" aria-hidden="true" />
                  {isAr ? "طريقة الدخول للسحب" : "How to Enter"}
                </Link>
                <Link
                  href={`/${locale}/deals`}
                  className="text-xs font-bold text-m3-primary hover:underline"
                >
                  {isAr ? "تسوق المنتجات المؤهلة" : "Shop eligible deals"}
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-m3-secondary-container text-m3-on-secondary-container border border-m3-outline-variant/60 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface text-m3-on-surface border border-m3-outline-variant px-3.5 py-1 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-m3-primary" aria-hidden="true" />
                  {isAr ? "حملة المكافآت الكبرى" : "GRAND PRIZE CAMPAIGN"}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                  {isAr
                    ? "السحب المميز للجوائز والقسائم الكبرى"
                    : "Grand Prize & Seasonal Voucher Draw"}
                </h2>
                <p className="text-xs sm:text-sm opacity-85">
                  {isAr
                    ? "تُضاعف فرصك مع الباقات المختارة وبطاقات الهدايا طوال فترة الحملة."
                    : "Bonus entries on curated collections, bundles, and gift cards throughout the campaign."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/${locale}/giveaways/grand`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-m3-primary px-5 py-2.5 text-xs font-bold text-m3-on-primary hover:brightness-95"
                >
                  <Trophy className="w-4 h-4" aria-hidden="true" />
                  {isAr ? "عرض تفاصيل الجائزة" : "View Prize Details"}
                </Link>
                <Link
                  href={`/${locale}/rewards`}
                  className="text-xs font-bold text-m3-primary hover:underline"
                >
                  {isAr ? "نقاط الولاء" : "Check rewards tier"}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 4. 6-Column "Shop by Category" Showcase */}
        {effectiveCategories.length > 0 && (
          <section className="space-y-5" data-testid="home-categories-grid">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-m3-on-surface">
                  {t.store.categoriesTitle}
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  {t.store.browseByCollection}
                </p>
              </div>
              <Link
                href={`/${locale}/categories`}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-m3-primary hover:underline"
              >
                <span>{isAr ? "عرض الكل" : "VIEW ALL"}</span>
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {effectiveCategories.slice(0, 6).map((cat) => {
                const count = catalogueItems.filter(
                  (it) =>
                    it.category?.slug === cat.slug || it.category_id === cat.id,
                ).length;
                return (
                  <Link
                    key={cat.id}
                    href={`/${locale}/categories/${encodeURIComponent(cat.slug)}`}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-m3-outline-variant/60 bg-m3-surface-container-low p-4 transition-all hover:border-m3-primary hover:bg-m3-surface-container hover:shadow-sm group min-h-[164px]"
                  >
                    <div className="h-16 w-full rounded-xl bg-m3-secondary-container/60 flex items-center justify-center text-m3-on-secondary-container group-hover:scale-[1.03] transition-transform">
                      <Tag className="h-6 w-6 text-m3-primary" />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-sm font-bold text-m3-on-surface line-clamp-1">
                        {pickText(cat.name_en, cat.name_ar, locale)}
                      </span>
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-m3-on-surface-variant">
                        <span>
                          {count > 0 ? `${count} ${isAr ? "منتج" : "ITEMS"}` : isAr ? "مختارة" : "CURATED"}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-m3-primary rtl:-scale-x-100" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 5a. Season Flash Deals 5-Card Horizontal Carousel */}
        <ProductCarouselSection
          id="flash-deals"
          title={isAr ? "عروض وتخفيضات الموسم" : "Season Flash Deals"}
          subtitle={isAr ? "عروض لفترة محدودة على مختارات المتجر" : "Limited-time seasonal price drops"}
          viewAllHref={`/${locale}/black-friday`}
          viewAllLabel={isAr ? "عرض الكل" : "View All"}
          items={dealsCarouselItems}
          locale={locale}
          accentTone="error"
        />

        {/* 5b. New Arrivals 5-Card Horizontal Carousel */}
        <ProductCarouselSection
          id="new-arrivals"
          title={isAr ? "وصل حديثاً" : "New Arrivals"}
          subtitle={isAr ? "أحدث المنتجات المضافة للمتجر" : "Fresh in store"}
          viewAllHref={`/${locale}/new-arrivals`}
          viewAllLabel={isAr ? "عرض الكل" : "View All"}
          items={newArrivalsItems}
          locale={locale}
        />

        {/* 6. Interactive Package & Bundle Finder Banner */}
        <PcMatchmakerBanner
          locale={locale}
          baseCurrency={info.currency}
          categories={effectiveCategories}
        />

        {/* 7. 3-Column "Choose Your Path: Customize, Explore, or Shop" Cards */}
        <section className="space-y-4" data-testid="home-path-cards">
          <h2 className="font-display text-2xl font-bold text-m3-on-surface">
            {isAr ? "اختر مسارك: خصّص، اكتشف، أو تسوق" : "Choose your path: Customize, explore, or shop"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href={`/${locale}/build-pc`}
              className="rounded-3xl bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant p-6 flex flex-col justify-between gap-6 min-h-[210px] hover:border-m3-primary hover:bg-m3-surface-container-highest transition-colors group"
            >
              <div className="h-11 w-11 rounded-2xl bg-m3-primary-container text-m3-on-primary-container grid place-items-center">
                <Wrench className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold">
                  {isAr ? "منسق الباقات المخصصة" : "Custom Package Builder"}
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  {isAr ? "اجمع المنتجات والعناصر المناسبة لاحتياجك وميزانيتك" : "Combine products & bundles tailored to your requirements"}
                </p>
                <span className="inline-flex items-center gap-1 pt-2 text-xs font-bold text-m3-primary group-hover:underline">
                  {isAr ? "ابدأ التخصيص" : "Start building"} <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                </span>
              </div>
            </Link>

            <Link
              href={
                effectiveCategories[0]
                  ? `/${locale}/categories/${encodeURIComponent(effectiveCategories[0].slug)}`
                  : `/${locale}/categories`
              }
              className="rounded-3xl bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant p-6 flex flex-col justify-between gap-6 min-h-[210px] hover:border-m3-primary hover:bg-m3-surface-container-highest transition-colors group"
            >
              <div className="h-11 w-11 rounded-2xl bg-m3-secondary-container text-m3-on-secondary-container grid place-items-center">
                <Cpu className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold">
                  {effectiveCategories[0]
                    ? pickText(effectiveCategories[0].name_en, effectiveCategories[0].name_ar, locale)
                    : isAr
                      ? "تصفح الفئات المختارة"
                      : "Browse Featured Categories"}
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  {isAr ? "اكتشف الأقسام الأعلى طلبا والمنتجات المميزة" : "Explore flagship collections, bundles, and top-rated picks"}
                </p>
                <span className="inline-flex items-center gap-1 pt-2 text-xs font-bold text-m3-primary group-hover:underline">
                  {isAr ? "اكتشف القسم" : "Explore collection"} <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                </span>
              </div>
            </Link>

            <Link
              href={`/${locale}/shop`}
              className="rounded-3xl bg-m3-surface-container-high text-m3-on-surface border border-m3-outline-variant p-6 flex flex-col justify-between gap-6 min-h-[210px] hover:border-m3-primary hover:bg-m3-surface-container-highest transition-colors group"
            >
              <div className="h-11 w-11 rounded-2xl bg-m3-tertiary-container text-m3-on-tertiary-container grid place-items-center">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold">
                  {isAr ? "تصفح الكتالوج الكامل" : "Shop All Products"}
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  {isAr ? "جميع المنتجات والإصدارات الجديدة وبطاقات الهدايا" : "Full catalogue, new arrivals & instant gift vouchers"}
                </p>
                <span className="inline-flex items-center gap-1 pt-2 text-xs font-bold text-m3-primary group-hover:underline">
                  {isAr ? "عرض جميع المنتجات" : "Shop all products"} <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* 8. Specialist Picks 5-Card Shelf & Featured Hubs */}
        <ProductCarouselSection
          id="specialist-picks"
          title={isAr ? "مختارات المتجر المميزة" : "Store Specialist Picks"}
          subtitle={isAr ? "أفضل الاختيارات جودة وقيمة" : "Curated by our team for value and reliability"}
          viewAllHref={`/${locale}/shop`}
          viewAllLabel={isAr ? "عرض الكل" : "View All"}
          items={specialistPicks}
          locale={locale}
        />

        {(showDeals || showGiftCards) && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="home-featured-hubs">
            {showDeals && (
              <Link
                href={`/${locale}/deals`}
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 flex items-center justify-between gap-4 hover:border-m3-primary transition-colors min-h-[88px]"
              >
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-m3-on-secondary-container">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    {isAr ? "تخفيضات" : "Deals"}
                  </span>
                  <h3 className="font-display font-bold text-base text-m3-on-surface">
                    {isAr ? "العروض والصفقات الحصرية" : "Deals & Coupon Codes"}
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant">
                    {isAr ? "أفضل الأسعار والخصومات النشطة" : "Active discounts & flash promotions"}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-m3-primary shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            )}
            <Link
              href={`/${locale}/rewards`}
              className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 flex items-center justify-between gap-4 hover:border-m3-primary transition-colors min-h-[88px]"
            >
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-m3-on-secondary-container">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAr ? "برنامج المكافآت" : "Rewards Program"}
                </span>
                <h3 className="font-display font-bold text-base text-m3-on-surface">
                  {isAr ? "نقاط الولاء والمحفظة" : "Loyalty Points & VIP Tiers"}
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  {isAr ? "اكسب واستبدل مع كل طلب" : "Earn & redeem points into wallet credit"}
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-m3-primary shrink-0 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            {showGiftCards && (
              <Link
                href={`/${locale}/gift-cards`}
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 flex items-center justify-between gap-4 hover:border-m3-primary transition-colors min-h-[88px]"
              >
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-m3-on-secondary-container">
                    <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                    {isAr ? "بطاقات الهدايا" : "E-Gift Cards"}
                  </span>
                  <h3 className="font-display font-bold text-base text-m3-on-surface">
                    {isAr ? "بطاقات الهدايا والمحفظة" : "Gift Cards & Wallet Credit"}
                  </h3>
                  <p className="text-xs text-m3-on-surface-variant">
                    {isAr ? "اشحن محفظتك أو أهدِ من تحب" : "Instant redeemable digital vouchers"}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-m3-primary shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            )}
          </section>
        )}

        {/* 9. Performance Consultation Banner */}
        <section className="rounded-3xl bg-m3-surface-container border border-m3-outline-variant p-6 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-m3-on-surface">
              {isAr
                ? "هل تبحث عن توصية أو باقة مخصصة؟"
                : "Need a tailored recommendation or custom bundle?"}
            </h2>
            <p className="text-sm text-m3-on-surface-variant">
              {isAr
                ? "مراجعة ومطابقة كاملة مع فريقنا المختص قبل اعتماد الطلب."
                : "Requirements and compatibility reviewed by our specialists before you order."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/${locale}/build-pc`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary hover:brightness-95"
            >
              {isAr ? "جرب منسق الباقات" : "Open Package Builder"}
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-m3-outline bg-m3-surface px-5 py-3 text-sm font-semibold text-m3-on-surface hover:border-m3-primary"
            >
              {isAr ? "استشر خبيرا" : "Ask an expert"}
            </Link>
          </div>
        </section>

        {/* 10. Active Promotions Banner + Recommended Full Interactive Product Grid */}
        <Promotions locale={locale} placement="home" />

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-m3-on-surface">
                {isAr ? "موصى به لك" : "Recommended for you"}
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                {t.store.topSellingSubtitle}
              </p>
            </div>
          </div>
          <ProductGrid items={catalogueItems} categories={effectiveCategories} />
        </section>
      </div>
    </div>
  );
}
