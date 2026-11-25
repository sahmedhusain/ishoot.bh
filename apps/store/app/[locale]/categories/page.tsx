import Link from "next/link";
import { ArrowUpRight, FolderKanban, Tag } from "lucide-react";
import { getEffectiveStoreCategories, getStoreCatalog } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { storeEnabled } from "../../../lib/customer";
import { getSite } from "../../../lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { company } = await getSite();
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "جميع الفئات" : "All Categories";
  return {
    title: companyName ? `${label} — ${companyName}` : label,
  };
}

export default async function CategoriesDirectoryPage({
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

  const [{ items: catalogueItems, categories: rawCats }, customCats] =
    await Promise.all([
      storeOn
        ? getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
        : Promise.resolve({
            items: website.portfolio ?? [],
            categories: website.categories ?? [],
          }),
      getEffectiveStoreCategories(website.categories ?? []).catch(
        () => website.categories ?? [],
      ),
    ]);
  const categories = customCats.length > 0 ? customCats : rawCats;

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3.5 py-1 text-xs font-semibold text-m3-on-secondary-container">
            <FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />
            {categories.length} {isAr ? "فئة متاحة" : "Categories Available"}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface">
            {isAr ? "تصفح حسب الفئة" : "Shop by Category"}
          </h1>
          <p className="text-sm sm:text-base text-m3-on-surface-variant max-w-2xl">
            {isAr
              ? "اكتشف جميع أقسام قطع الكمبيوتر والشاشات والكراسي والإكسسوارات وبطاقات الهدايا."
              : "Browse every hardware, display, workstation furniture, gaming gear, and digital voucher category."}
          </p>
        </div>
      </header>

      <div className="shell grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((cat) => {
          const count = catalogueItems.filter(
            (it) => it.category?.slug === cat.slug || it.category_id === cat.id,
          ).length;
          return (
            <Link
              key={cat.id}
              href={`/${locale}/category/${encodeURIComponent(cat.slug)}`}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 transition-all hover:border-m3-primary hover:bg-m3-surface-container group min-h-[176px]"
            >
              <div className="h-16 w-full rounded-xl bg-m3-secondary-container/70 flex items-center justify-center text-m3-primary group-hover:scale-105 transition-transform">
                <Tag className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-sm font-bold text-m3-on-surface line-clamp-2">
                  {pickText(cat.name_en, cat.name_ar, locale)}
                </h2>
                <div className="flex items-center justify-between text-[11px] font-mono text-m3-on-surface-variant">
                  <span>{count} {isAr ? "منتج" : "ITEMS"}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-m3-primary rtl:-scale-x-100" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
