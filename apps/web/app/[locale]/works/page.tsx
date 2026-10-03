import { getWebsite, isWebsitePreview } from "../../../lib/website";
import * as React from "react";
import { notFound } from "next/navigation";
import { getPortfolioItems, getPortfolioCategories } from "@ishoot/database";
import { PortfolioGrid } from "../../../components/portfolio/PortfolioGrid";
import { SectionBadge } from "../../../components/shared/SectionBadge";
import { getTranslations, Locale } from "@ishoot/locales";

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
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-20 start-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-radial from-[#09937F]/15 via-[#014842]/5 to-transparent blur-3xl pointer-events-none"
      />

      <div className="relative z-10 pt-36 pb-24 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#5EEAD4] px-3.5 py-1 rounded-full bg-black/60 border border-[#09937F]/40 shadow-lg mb-2">
            <span className="text-[#09937F] opacity-80">&lt;&lt;</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>ARCHIVE // SELECTED WORKS</span>
            <span className="text-[#09937F] opacity-80">&gt;&gt;</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">
            {t.portfolio.title}
          </h1>
          <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
            {t.portfolio.subtitle}
          </p>
        </div>

        <PortfolioGrid items={items} categories={categories} />
      </div>
    </div>
  );
}
