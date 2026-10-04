import { Reveal } from "../../../components/shared/Reveal";
import { getWebsite,isWebsitePreview } from "../../../lib/website";
import { notFound } from "next/navigation";
import { PortfolioGrid } from "../../../components/portfolio/PortfolioGrid";
import { SectionBadge } from "../../../components/shared/SectionBadge";
import { getTranslations,Locale } from "@ishoot/locales";

export default async function WorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);

  const [website, isPreview] = await Promise.all([
    getWebsite(),
    isWebsitePreview(),
  ]);

  const pageVisible =
    website?.config?.pages?.find((p) => p.id === "works")?.visible ?? true;
  if (!pageVisible && !isPreview) {
    notFound();
  }

  const items = website.portfolio;
  const categories = Array.from(
    new Map(
      items
        .filter((item) => item.category)
        .map((item) => [item.category!.id, item.category!]),
    ).values(),
  );

  return (
    <div className="relative min-h-screen bg-[#050807] text-[#F2F6F5] overflow-hidden">
      <div className="shell relative z-10 page-heading">
        <Reveal className="space-y-5 max-w-3xl mb-12 sm:mb-16">
          <SectionBadge>{t.portfolio.badge}</SectionBadge>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white font-display">
            {t.portfolio.title}
          </h1>
          <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
            {t.portfolio.subtitle}
          </p>
        </Reveal>

        <PortfolioGrid items={items} categories={categories} />
      </div>
    </div>
  );
}
