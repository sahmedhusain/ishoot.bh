import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { pickText } from "@platform/database/constants/languages";
import type { PublicArticle } from "@platform/database/queries/cms-articles";
import { fallbackBannerMediaUrl } from "../../lib/format-site";
import { ContentImage } from "../shared/ContentImage";
import { SectionBadge } from "../shared/SectionBadge";
import { Reveal } from "../shared/Reveal";

export function articleDate(article: PublicArticle, locale: string) {
  const raw = article.publish_at;
  if (!raw) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-BH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(raw));
  } catch {
    return "";
  }
}

export function estimateReadMinutes(article: PublicArticle, locale: string): number {
  const html = locale === "ar" ? article.body_html_ar : article.body_html_en;
  const plain = `${html ?? ""} ${article.excerpt_en ?? ""} ${article.excerpt_ar ?? ""}`
    .replace(/<[^>]+>/g, " ")
    .trim();
  const words = plain ? plain.split(/\s+/).length : 0;
  return Math.max(2, Math.min(12, Math.ceil(words / 140) || 3));
}

export function ArticleCards({
  articles,
  title,
  subtitle,
  badge,
  locale,
  base = `/${locale}/news`,
  viewAllLabel,
}: {
  articles: PublicArticle[];
  title: string;
  subtitle?: string;
  badge?: string;
  locale: string;
  base?: string;
  viewAllLabel?: string;
}) {
  if (!articles.length) return null;
  const ar = locale === "ar";

  return (
    <section className="relative bg-m3-surface text-ink py-20 sm:py-24 border-t border-m3-outline-variant">
      <div className="shell space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-m3-outline-variant">
          <div className="space-y-3">
            {badge && <SectionBadge>{badge}</SectionBadge>}
            <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-ink leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm sm:text-base text-ink-muted max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {viewAllLabel && (
            <Link
              href={base}
              className="min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              <span>{viewAllLabel}</span>
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, idx) => {
            const artTitle = pickText(article.title_en, article.title_ar, locale);
            const excerpt = pickText(article.excerpt_en, article.excerpt_ar, locale);
            const cover = article.cover_url || fallbackBannerMediaUrl(idx);
            const mins = estimateReadMinutes(article, locale);

            return (
              <Reveal key={article.id}>
                <Link
                  href={`${base}/${encodeURIComponent(article.slug)}`}
                  className="group flex flex-col h-full rounded-3xl overflow-hidden bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary/55 hover:shadow-m3-3 transition-all duration-200"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-m3-surface-container">
                    <ContentImage
                      src={cover}
                      alt={artTitle}
                      width={720}
                      height={450}
                      className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none"
                    />
                    {article.category && (
                      <span className="absolute top-4 start-4 rounded-full bg-black/65 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-semibold text-white">
                        {article.category}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 gap-4">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-m3-on-surface-variant">
                        <span>{articleDate(article, locale)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-m3-primary" />
                          <span>{ar ? `${mins} د قراءة` : `${mins} min read`}</span>
                        </span>
                      </div>

                      <h3 className="text-lg font-display font-bold text-ink group-hover:text-m3-primary transition-colors line-clamp-2 leading-snug">
                        {artTitle}
                      </h3>

                      {excerpt && (
                        <p className="text-sm text-ink-muted line-clamp-3 leading-relaxed">
                          {excerpt}
                        </p>
                      )}
                    </div>

                    {article.author_name && (
                      <div className="pt-3 border-t border-m3-outline-variant/60 flex items-center justify-between text-xs text-ink-muted">
                        <span className="font-medium">{article.author_name}</span>
                        <ArrowUpRight className="w-4 h-4 text-m3-primary rtl:-scale-x-100" />
                      </div>
                    )}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
