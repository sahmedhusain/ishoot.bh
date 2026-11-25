import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ShieldCheck, SlidersHorizontal, Tag } from "lucide-react";
import { storeEnabled } from "../../../lib/customer";
import { getEffectiveStoreCategories, getStoreCatalog } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite } from "../../../lib/site";
import { formatPrice } from "../../../lib/site-copy";
import { ProductGrid } from "../../../components/store/ProductGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { company, website } = await getSite();
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const cmsPage = website?.pages?.find((p) => p.slug === "build-pc");
  const label =
    pickText(cmsPage?.seo_title_en || cmsPage?.title_en, cmsPage?.seo_title_ar || cmsPage?.title_ar, locale) ||
    (locale === "ar" ? "منسق الباقات والطلبات المخصصة" : "Custom Package & Bundle Builder");
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function BuildPcPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ goal?: string; budget?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const isAr = locale === "ar";
  const goal =
    query.goal === "essential" || query.goal === "complete" || query.goal === "enterprise"
      ? query.goal
      : "professional";
  const budget = Math.max(100, Math.min(5000, Number(query.budget || 500) || 500));

  const [{ website, info }, storeOn] = await Promise.all([
    getSite(),
    storeEnabled().catch(() => false),
  ]);
  if (!website) return null;

  const [{ items: catalogueItems, categories: rawCategories }, effectiveList] = await Promise.all([
    storeOn
      ? getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
      : Promise.resolve({ items: website.portfolio ?? [], categories: website.categories ?? [] }),
    getEffectiveStoreCategories(website.categories ?? []).catch(() => website.categories ?? []),
  ]);
  const categories = effectiveList.length > 0 ? effectiveList : rawCategories;
  const cmsPage = website.pages?.find((p) => p.slug === "build-pc");
  const pageTitle =
    pickText(cmsPage?.title_en, cmsPage?.title_ar, locale) ||
    (isAr ? "منسق الباقات والطلبات المخصصة" : "Custom Package Builder");
  const pageSubtitle =
    pickText(cmsPage?.seo_description_en, cmsPage?.seo_description_ar, locale) ||
    (isAr
      ? `الفئة المختارة: ${goal.toUpperCase()} — ميزانية مستهدفة ${formatPrice(budget, info.currency, locale)}.`
      : `Selected tier: ${goal.toUpperCase()} · Target budget ${formatPrice(budget, info.currency, locale)} · Prepared and reviewed before dispatch.`);

  const slots = categories.slice(0, 5);
  const budgetPresets = [150, 300, 500, 1000, 2000];
  const tiers = [
    { id: "essential", label: isAr ? "أساسي" : "Essential" },
    { id: "professional", label: isAr ? "احترافي" : "Professional" },
    { id: "complete", label: isAr ? "متكامل" : "Complete" },
  ] as const;

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6 space-y-6">
        <div className="rounded-3xl bg-m3-inverse-surface text-m3-inverse-on-surface border border-m3-outline-variant/40 p-6 sm:p-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                {isAr ? "مراجعة التوافق والتجهيز" : "VERIFIED PACKAGE CONFIGURATION"}
              </span>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-sm sm:text-base opacity-80">{pageSubtitle}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-xs space-y-1">
              <div className="inline-flex items-center gap-1.5 font-bold text-m3-primary">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                {isAr ? "ضمان ومطابقة كاملة" : "Full Quality Verification"}
              </div>
              <p className="opacity-80">
                {isAr ? "فحص ومطابقة كل عناصر الباقة قبل الشحن" : "Includes quality inspection before dispatch"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tiers.map((tier) => (
              <Link
                key={tier.id}
                href={`/${locale}/build-pc?goal=${tier.id}&budget=${budget}`}
                className={`inline-flex min-h-11 items-center rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  goal === tier.id
                    ? "bg-m3-primary text-m3-on-primary"
                    : "border border-white/25 text-white hover:bg-white/10"
                }`}
              >
                {tier.label}
              </Link>
            ))}
            <span className="opacity-40 px-1">|</span>
            {budgetPresets.map((b) => (
              <Link
                key={b}
                href={`/${locale}/build-pc?goal=${goal}&budget=${b}`}
                className={`inline-flex min-h-11 items-center rounded-full px-3.5 py-1.5 text-xs font-mono font-bold transition-colors ${
                  budget === b
                    ? "bg-m3-secondary-container text-m3-on-secondary-container"
                    : "border border-white/20 text-white hover:bg-white/10"
                }`}
                dir="ltr"
              >
                {formatPrice(b, info.currency, locale)}
              </Link>
            ))}
          </div>
        </div>

        {slots.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3" data-testid="pc-builder-slots">
            {slots.map((cat) => (
              <Link
                key={cat.id}
                href={`/${locale}/categories/${encodeURIComponent(cat.slug)}`}
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 flex flex-col justify-between gap-3 hover:border-m3-primary transition-colors min-h-[120px]"
              >
                <div className="flex items-center justify-between text-m3-primary">
                  <Tag className="w-5 h-5" aria-hidden="true" />
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xs font-bold text-m3-on-surface line-clamp-1">
                    {pickText(cat.name_en, cat.name_ar, locale)}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-m3-primary">
                    {isAr ? "تصفح القسم" : "Browse collection"}
                    <ArrowUpRight className="w-3 h-3 rtl:-scale-x-100" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="shell">
        <ProductGrid items={catalogueItems} categories={categories} />
      </div>
    </div>
  );
}
