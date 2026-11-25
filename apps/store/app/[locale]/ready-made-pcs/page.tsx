import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Layers, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { ProductGrid } from "../../../components/store/ProductGrid";
import { storeEnabled } from "../../../lib/customer";
import { getEffectiveStoreCategories, getStoreCatalog } from "@platform/database";
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
  const cmsPage = website?.pages?.find((p) => p.slug === "ready-made-pcs");
  const label =
    pickText(cmsPage?.seo_title_en || cmsPage?.title_en, cmsPage?.seo_title_ar || cmsPage?.title_ar, locale) ||
    (locale === "ar" ? "الباقات والمجموعات الجاهزة" : "Curated Store Packages");
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function ReadyMadePackagesPage({
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

  const [{ items: catalogueItems, categories: rawCategories }, effectiveList] = await Promise.all([
    storeOn
      ? getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
      : Promise.resolve({ items: website.portfolio ?? [], categories: website.categories ?? [] }),
    getEffectiveStoreCategories(website.categories ?? []).catch(() => website.categories ?? []),
  ]);
  const categories = effectiveList.length > 0 ? effectiveList : rawCategories;
  const cmsPage = website.pages?.find((p) => p.slug === "ready-made-pcs");
  const pageTitle =
    pickText(cmsPage?.title_en, cmsPage?.title_ar, locale) ||
    (isAr ? "الباقات والمجموعات الجاهزة" : "Curated Store Packages");
  const pageSubtitle =
    pickText(cmsPage?.seo_description_en, cmsPage?.seo_description_ar, locale) ||
    (isAr
      ? "مجموعات وباقات مختارة ومجهزة بعناية مع ضمان المتجر الكامل ودعم ما بعد البيع."
      : "Professionally curated bundles and ready-to-dispatch sets backed by full warranty coverage.");

  const tiers = [
    {
      title: isAr ? "الباقة الأساسية" : "Starter Packages",
      desc: isAr ? "خيارات عملية وموثوقة تلبي الاحتياجات اليومية" : "Balanced everyday value ready out of the box.",
    },
    {
      title: isAr ? "الباقة الاحترافية" : "Professional Sets",
      desc: isAr ? "تشكيلات متكاملة بمواصفات عالية وجودة معتمدة" : "Upgraded specifications verified for reliability.",
    },
    {
      title: isAr ? "الباقة الشاملة" : "Complete Collections",
      desc: isAr ? "أعلى الفئات مع ضمان شامل وتجهيز كامل" : "Flagship multi-item bundles with priority support.",
    },
  ];

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6 space-y-6">
        <div className="rounded-3xl bg-m3-inverse-surface text-m3-inverse-on-surface border border-m3-outline-variant/40 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "مجهزة ومختبرة ومضمونة" : "CURATED, VERIFIED & WARRANTED"}
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-sm sm:text-base opacity-80">{pageSubtitle}</p>
          </div>
          <Link
            href={`/${locale}/build-pc`}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary shrink-0 hover:brightness-95"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            {isAr ? "أو خصص باقتك بنفسك" : "Custom Package Builder"}
            <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.title}
              className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-1.5"
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-m3-primary">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <h2 className="font-display text-base font-bold text-m3-on-surface">{tier.title}</h2>
              <p className="text-xs text-m3-on-surface-variant">{tier.desc}</p>
            </div>
          ))}
        </div>
      </header>
      <div className="shell">
        <ProductGrid items={catalogueItems} categories={categories} />
      </div>
    </div>
  );
}
