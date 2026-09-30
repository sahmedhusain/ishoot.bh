import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPortfolioItemBySlug, getPortfolioItems } from "@ishoot/database";
import { getTranslations, Locale } from "@ishoot/locales";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { Button } from "@ishoot/ui";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = getTranslations(locale as Locale);
  const isRTL = locale === "ar";

  const item = await getPortfolioItemBySlug(slug);

  if (!item) {
    notFound();
  }

  const title = isRTL ? item.title_ar : item.title_en;
  const description = isRTL ? item.description_ar : item.description_en;
  const videoUrl = item.full_video_url || item.preview_video_url;
  const ArrowBackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <article className="py-16 max-w-6xl mx-auto px-6 sm:px-8 space-y-12">
      <div>
        <Link
          href={`/${locale}/works`}
          className="inline-flex items-center gap-2 text-sm text-[#9EADA9] hover:text-[#09937F] transition-colors"
        >
          <ArrowBackIcon className="w-4 h-4" />
          <span>{t.portfolio.backToWorks}</span>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 text-xs  text-[#09937F] uppercase tracking-widest">
          <span>{item.client_name}</span>
          <span>•</span>
          <span>{item.year}</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">
          {title}
        </h1>
      </div>

      <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl">
        {videoUrl ? (
          <video
            src={videoUrl}
            poster={item.thumbnail_url}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${item.thumbnail_url})` }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8 border-t border-white/10">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">
            {t.portfolio.productionOverview}
          </h2>
          <p className="text-base text-[#9EADA9] leading-relaxed">
            {description}
          </p>
        </div>

        {item.credits && (
          <div className="bg-[#0B1210] border border-white/10 rounded-2xl p-6 space-y-4 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider border-b border-white/10 pb-3">
              {t.portfolio.credits}
            </h3>
            <div className="space-y-3 text-xs">
              {item.credits.director && (
                <div className="flex justify-between">
                  <span className="text-[#9EADA9]">
                    {t.portfolio.director}:
                  </span>
                  <span className="text-white font-medium">
                    {item.credits.director}
                  </span>
                </div>
              )}
              {item.credits.dop && (
                <div className="flex justify-between">
                  <span className="text-[#9EADA9]">{t.portfolio.dop}:</span>
                  <span className="text-white font-medium">
                    {item.credits.dop}
                  </span>
                </div>
              )}
              {item.credits.colorist && (
                <div className="flex justify-between">
                  <span className="text-[#9EADA9]">
                    {t.portfolio.colorist}:
                  </span>
                  <span className="text-white font-medium">
                    {item.credits.colorist}
                  </span>
                </div>
              )}
              {item.credits.editor && (
                <div className="flex justify-between">
                  <span className="text-[#9EADA9]">{t.portfolio.editor}:</span>
                  <span className="text-white font-medium">
                    {item.credits.editor}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
