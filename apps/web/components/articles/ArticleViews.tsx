import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock, Rss, Search } from "lucide-react";
import { pickText } from "@platform/database/constants/languages";
import { formatMessage } from "@platform/locales";
import type { PublicArticle } from "@platform/database/queries/cms-articles";
import { getSite, siteTranslations } from "../../lib/site";
import { fallbackBannerMediaUrl, formatResultCount } from "../../lib/format-site";
import { ContentImage } from "../shared/ContentImage";
import { SectionBadge } from "../shared/SectionBadge";
import { ShareLinks } from "./ShareLinks";
import { articleDate, estimateReadMinutes } from "./ArticleCards";

export function liveArticles(articles: PublicArticle[]) {
  const now = Date.now();
  return articles
    .filter((a) => !a.publish_at || new Date(a.publish_at).getTime() <= now)
    .sort((a, b) => new Date(b.publish_at ?? 0).getTime() - new Date(a.publish_at ?? 0).getTime());
}

export async function ArticlesIndex({
  articles,
  locale,
  base,
  query,
}: {
  articles: PublicArticle[];
  locale: string;
  base: string;
  query: { q?: string; category?: string; page?: string };
}) {
  const [t] = await Promise.all([siteTranslations(locale), getSite()]);
  const ar = locale === "ar";
  const q = query.q?.trim() ?? "";
  const category = query.category?.trim() ?? "";
  const pageSize = 9;
  const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean))) as string[];

  const filtered = articles.filter((a) => {
    if (category && a.category !== category) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return `${a.title_en} ${a.title_ar} ${a.excerpt_en} ${a.excerpt_ar} ${a.author_name} ${a.category}`.toLowerCase().includes(needle);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(pages, Math.max(1, Number(query.page) || 1));
  const showFeatured = !q && !category && current === 1 && filtered.length > 0;
  const featuredArticle = showFeatured ? filtered[0] : null;
  const gridArticles = showFeatured
    ? filtered.slice(1, pageSize)
    : filtered.slice((current - 1) * pageSize, current * pageSize);

  const href = (next: { q?: string; category?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    if (next.category) p.set("category", next.category);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="shell page-heading space-y-10 pb-24 text-m3-on-surface">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionBadge>{t.articles.badge}</SectionBadge>
          <a
            href={`${base}/feed.xml`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-m3-outline-variant bg-m3-surface-container-low px-4 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary hover:border-m3-primary transition-colors"
          >
            <Rss aria-hidden="true" className="w-3.5 h-3.5 text-m3-primary" />
            <span>{t.articles.rss}</span>
          </a>
        </div>

        <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.08] tracking-tight text-m3-on-surface">
          {t.articles.title}
        </h1>
        <p className="max-w-2xl text-base sm:text-lg text-m3-on-surface-variant leading-relaxed">
          {t.articles.subtitle}
        </p>
      </header>

      <div className="rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container-low border border-m3-outline-variant p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form action={base} method="get" className="flex flex-1 items-center gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <label className="relative flex-1">
              <Search aria-hidden="true" className="w-4 h-4 text-m3-on-surface-variant pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t.articles.searchPlaceholder}
                aria-label={t.articles.searchArticles}
                className="w-full h-11 rounded-full bg-m3-surface-container-high border border-m3-outline-variant ps-11 pe-4 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary focus:ring-1 focus:ring-m3-primary"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 px-5 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold hover:brightness-95 transition-colors cursor-pointer shrink-0"
            >
              {t.articles.search}
            </button>
          </form>

          <p className="text-xs font-semibold text-m3-on-surface-variant shrink-0">
            {formatResultCount(filtered.length, locale, t.articles.resultsCount)}
          </p>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-m3-outline-variant">
            <Link
              href={href({ q })}
              className={`min-h-11 px-4 rounded-[var(--md-sys-shape-corner-small,8px)] text-xs font-semibold inline-flex items-center border transition-colors ${
                !category
                  ? "bg-m3-secondary-container text-m3-on-secondary-container border-transparent"
                  : "bg-transparent border-m3-outline text-m3-on-surface-variant hover:bg-m3-on-surface/[0.08] hover:text-m3-on-surface"
              }`}
            >
              {t.articles.allCategories}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={href({ q, category: cat })}
                className={`min-h-11 px-4 rounded-[var(--md-sys-shape-corner-small,8px)] text-xs font-semibold inline-flex items-center border transition-colors ${
                  category === cat
                    ? "bg-m3-secondary-container text-m3-on-secondary-container border-transparent"
                    : "bg-transparent border-m3-outline text-m3-on-surface-variant hover:bg-m3-on-surface/[0.08] hover:text-m3-on-surface"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}
      </div>

      {featuredArticle && (
        <Link
          href={`${base}/${encodeURIComponent(featuredArticle.slug)}`}
          className="group grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] rounded-[var(--md-sys-shape-corner-extra-large,28px)] overflow-hidden bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary/55 hover:shadow-m3-2 transition-all"
        >
          <div className="relative aspect-[16/10] lg:aspect-auto min-h-[260px] bg-m3-surface-container overflow-hidden">
            <ContentImage
              src={featuredArticle.cover_url || fallbackBannerMediaUrl(0)}
              alt={pickText(featuredArticle.title_en, featuredArticle.title_ar, locale)}
              width={960}
              height={600}
              className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
            />
          </div>
          <div className="p-6 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-3 py-1 font-semibold">
                  {t.articles.featuredStory}
                </span>
                {featuredArticle.category && (
                  <span className="rounded-full bg-m3-surface-container border border-m3-outline-variant px-3 py-1 font-medium text-m3-on-surface-variant">
                    {featuredArticle.category}
                  </span>
                )}
                <span className="text-m3-on-surface-variant">{articleDate(featuredArticle, locale)}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors leading-tight">
                {pickText(featuredArticle.title_en, featuredArticle.title_ar, locale)}
              </h2>
              <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed line-clamp-3">
                {pickText(featuredArticle.excerpt_en, featuredArticle.excerpt_ar, locale)}
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-m3-outline-variant/60 text-xs font-semibold text-m3-primary">
              <span className="inline-flex items-center gap-1.5 text-m3-on-surface-variant">
                <Clock aria-hidden="true" className="w-3.5 h-3.5 text-m3-primary" />
                {formatMessage(t.articles.minRead, { minutes: estimateReadMinutes(featuredArticle, locale) })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {t.portfolio.viewProject}
                <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {gridArticles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {gridArticles.map((article, idx) => {
            const artTitle = pickText(article.title_en, article.title_ar, locale);
            const excerpt = pickText(article.excerpt_en, article.excerpt_ar, locale);
            const mins = estimateReadMinutes(article, locale);
            return (
              <Link
                key={article.id}
                href={`${base}/${encodeURIComponent(article.slug)}`}
                className="group flex flex-col rounded-[var(--md-sys-shape-corner-extra-large,28px)] overflow-hidden bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary/55 hover:shadow-m3-2 transition-all"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-m3-surface-container">
                  <ContentImage
                    src={article.cover_url || fallbackBannerMediaUrl(idx + 1)}
                    alt={artTitle}
                    width={640}
                    height={400}
                    className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
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
                        <Clock aria-hidden="true" className="w-3 h-3 text-m3-primary" />
                        <span>{ar ? `${mins} د قراءة` : `${mins} min read`}</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors line-clamp-2">
                      {artTitle}
                    </h3>
                    {excerpt && (
                      <p className="text-sm text-m3-on-surface-variant line-clamp-3 leading-relaxed">
                        {excerpt}
                      </p>
                    )}
                  </div>
                  {article.author_name && (
                    <div className="pt-3 border-t border-m3-outline-variant/60 flex items-center justify-between text-xs text-m3-on-surface-variant">
                      <span>{article.author_name}</span>
                      <ArrowUpRight aria-hidden="true" className="w-4 h-4 text-m3-primary rtl:-scale-x-100" />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : !featuredArticle ? (
        <div className="rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-surface-container-low p-10 text-center space-y-4">
          <p className="text-sm sm:text-base text-m3-on-surface-variant">
            {q || category ? t.portfolio.noResults : t.articles.empty}
          </p>
          {(q || category) && (
            <Link
              href={base}
              className="min-h-11 px-5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-semibold inline-flex items-center"
            >
              {t.articles.clearFilters}
            </Link>
          )}
        </div>
      ) : null}

      {pages > 1 && (
        <nav aria-label={t.articles.articlePages} className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {current > 1 && (
            <Link
              href={href({ q, category, page: current - 1 })}
              className="min-h-11 px-4 rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-xs font-semibold text-m3-on-surface inline-flex items-center gap-1.5 hover:border-m3-primary"
            >
              {ar ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{t.articles.previous}</span>
            </Link>
          )}
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={href({ q, category, page: p })}
              aria-current={p === current ? "page" : undefined}
              className={`min-h-11 min-w-11 px-3 rounded-full text-xs font-semibold inline-flex items-center justify-center border transition-colors ${
                p === current
                  ? "bg-m3-primary text-m3-on-primary border-m3-primary"
                  : "border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface hover:border-m3-primary"
              }`}
            >
              {p}
            </Link>
          ))}
          {current < pages && (
            <Link
              href={href({ q, category, page: current + 1 })}
              className="min-h-11 px-4 rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-xs font-semibold text-m3-on-surface inline-flex items-center gap-1.5 hover:border-m3-primary"
            >
              <span>{t.articles.next}</span>
              {ar ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export async function ArticleView({
  article,
  related,
  locale,
  base,
  url,
}: {
  article: PublicArticle;
  related: PublicArticle[];
  locale: string;
  base: string;
  url: string;
}) {
  const t = await siteTranslations(locale);
  const title = pickText(article.title_en, article.title_ar, locale);
  const excerpt = pickText(article.excerpt_en, article.excerpt_ar, locale);
  const html = pickText(article.body_html_en, article.body_html_ar, locale);
  const date = articleDate(article, locale);
  const cover = article.cover_url || fallbackBannerMediaUrl(0);

  return (
    <article className="shell page-heading space-y-12 pb-24 text-m3-on-surface">
      <div className="space-y-5 max-w-4xl">
        <Link
          href={base}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-m3-primary hover:underline"
        >
          {locale === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{t.articles.back}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3 text-xs text-m3-on-surface-variant">
          {article.category && (
            <span className="rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-3 py-1 font-semibold">
              {article.category}
            </span>
          )}
          {date && <span>{date}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" className="w-3.5 h-3.5 text-m3-primary" />
            {formatMessage(t.articles.minRead, { minutes: estimateReadMinutes(article, locale) })}
          </span>
          {article.author_name && <span>· {formatMessage(t.articles.by, { author: article.author_name })}</span>}
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.08] tracking-tight text-m3-on-surface">
          {title}
        </h1>
        {excerpt && <p className="text-base sm:text-xl text-m3-on-surface-variant leading-relaxed">{excerpt}</p>}

        <ShareLinks
          url={url}
          title={title}
          labels={{
            share: t.articles.share,
            x: t.articles.shareX,
            linkedin: t.articles.shareLinkedIn,
            copy: t.articles.copyLink,
            copied: t.articles.copied,
          }}
        />
      </div>

      <div className="overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-surface-container-low aspect-[16/9] max-h-[540px]">
        <ContentImage src={cover} alt={title} width={1200} height={675} className="w-full h-full object-cover" />
      </div>

      <div
        className="rich-text max-w-4xl text-base sm:text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html || `<p>${excerpt || title}</p>` }}
      />

      {related.length > 0 && (
        <section className="space-y-6 border-t border-m3-outline-variant pt-10">
          <h2 className="text-2xl font-display font-bold text-m3-on-surface">{t.articles.latest}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((entry, idx) => (
              <Link
                key={entry.id}
                href={`${base}/${encodeURIComponent(entry.slug)}`}
                className="group rounded-[var(--md-sys-shape-corner-extra-large,28px)] overflow-hidden border border-m3-outline-variant bg-m3-surface-container-low hover:border-m3-primary/50 transition-colors"
              >
                <div className="aspect-[16/10] bg-m3-surface-container overflow-hidden">
                  <ContentImage
                    src={entry.cover_url || fallbackBannerMediaUrl(idx + 1)}
                    alt={pickText(entry.title_en, entry.title_ar, locale)}
                    width={640}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="p-5 space-y-2">
                  <p className="text-xs text-m3-on-surface-variant">{articleDate(entry, locale)}</p>
                  <h3 className="text-base font-display font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors line-clamp-2">
                    {pickText(entry.title_en, entry.title_ar, locale)}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
