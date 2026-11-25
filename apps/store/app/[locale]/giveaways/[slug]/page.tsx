import Link from "next/link";
import { ArrowUpRight, Sparkles, Ticket, Trophy } from "lucide-react";
import { storeEnabled } from "../../../../lib/customer";
import { getStoreCatalog, getStoreSettings } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite } from "../../../../lib/site";
import { ProductGrid } from "../../../../components/store/ProductGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [{ company, website }, settings] = await Promise.all([
    getSite(),
    getStoreSettings().catch(() => null),
  ]);
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const cmsPage = website?.pages?.find((p) => p.slug === "giveaways");
  const prize = pickText(settings?.raffle_prize_en, settings?.raffle_prize_ar, locale);
  const label =
    pickText(cmsPage?.seo_title_en || cmsPage?.title_en, cmsPage?.seo_title_ar || cmsPage?.title_ar, locale) ||
    prize ||
    (slug === "grand"
      ? locale === "ar" ? "السحب على الجائزة الكبرى" : "Grand Prize Giveaway"
      : locale === "ar" ? "سحب جوائز المتجر الموسمية" : "Store Seasonal Giveaway");
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function GiveawayDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isAr = locale === "ar";
  const [{ website, info }, storeOn, settings] = await Promise.all([
    getSite(),
    storeEnabled().catch(() => false),
    getStoreSettings().catch(() => null),
  ]);
  if (!website) return null;

  const { items: catalogueItems, categories } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [], categories: website.categories ?? [] };

  const isGrand = slug === "grand" || slug === "car";
  const spendUnit = settings?.raffle_spend_unit ?? 10;
  const cmsPage = website.pages?.find((p) => p.slug === "giveaways");
  const prizeHeadline =
    pickText(settings?.raffle_prize_en, settings?.raffle_prize_ar, locale) ||
    pickText(cmsPage?.title_en, cmsPage?.title_ar, locale);

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6 space-y-6">
        <div className="rounded-3xl bg-m3-inverse-surface text-m3-inverse-on-surface border border-m3-outline-variant/40 p-6 sm:p-10 space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
            <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
            {isGrand
              ? isAr ? "سحب الجائزة الكبرى" : "GRAND PRIZE RAFFLE"
              : isAr ? "سحب جوائز المتجر" : "SEASONAL RAFFLE CAMPAIGN"}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            {prizeHeadline ||
              (isAr
                ? "سحب الجوائز والمكافآت الموسمية"
                : "Store Seasonal Prize Draw")}
          </h1>
          <p className="text-sm sm:text-base opacity-80 max-w-2xl">
            {pickText(cmsPage?.seo_description_en, cmsPage?.seo_description_ar, locale) ||
              (isAr
                ? `كل ${spendUnit} ${info.currency} تنفقه في المتجر يمنحك تذكرة سحب إلكترونية مرتبطة برقم طلبك وحسابك.`
                : `Every ${spendUnit} ${info.currency} spent earns 1 verified raffle entry linked automatically to your paid order.`)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/deals`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary hover:brightness-95"
            >
              {isAr ? "تسوق المنتجات المؤهلة" : "Shop Eligible Products"}
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={`/${locale}/account/rewards`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              {isAr ? "عرض تذاكري ونقاطي" : "View My Tickets & Rewards"}
            </Link>
          </div>
        </div>

        <section
          id="how-to-enter"
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            {
              step: "01",
              title: isAr ? "اختر منتجاتك المفضلة" : "Shop Eligible Products",
              desc: isAr
                ? `جميع الطلبات بقيمة ${spendUnit} ${info.currency} فأكثر مؤهلة للسحب.`
                : `Any confirmed online or in-store order above ${spendUnit} ${info.currency} qualifies automatically.`,
            },
            {
              step: "02",
              title: isAr ? "إصدار التذاكر تلقائيا" : "Automatic Ticket Issuance",
              desc: isAr
                ? "تُضاف التذاكر إلى حسابك وتظهر في صفحة السلة والدفع والطلبات."
                : "Tickets are calculated dynamically in Cart, Checkout, and attached to your Order record.",
            },
            {
              step: "03",
              title: isAr ? "السحب وإعلان الفائزين" : "Verified Monthly Draw",
              desc: isAr
                ? "يتم إعلان الفائزين عبر القنوات الرسمية والتواصل عبر البريد والهاتف."
                : "Draws are conducted transparently under commercial promotional supervision.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 space-y-2"
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-m3-primary">
                <Ticket className="w-4 h-4" aria-hidden="true" />
                STEP {s.step}
              </div>
              <h2 className="font-display text-base font-bold text-m3-on-surface">{s.title}</h2>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </section>
      </header>

      <div className="shell space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-m3-primary" aria-hidden="true" />
          <h2 className="font-display text-2xl font-bold text-m3-on-surface">
            {isAr ? "المنتجات المؤهلة للسحب" : "Eligible Products"}
          </h2>
        </div>
        <ProductGrid items={catalogueItems} categories={categories} />
      </div>
    </div>
  );
}
