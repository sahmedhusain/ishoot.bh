import Link from "next/link";
import { ArrowLeft, ArrowRight, Rss } from "lucide-react";
import { formatMessage } from "@platform/locales";
import type { PublicArticle } from "@platform/database/queries/cms-articles";
import { getSite, siteTranslations } from "../../lib/site";
import { ContentImage } from "../shared/ContentImage";
import { Reveal } from "../shared/Reveal";
import { SectionBadge } from "../shared/SectionBadge";
import { ArticleCards, articleDate } from "./ArticleCards";
import { ShareLinks } from "./ShareLinks";

const text = (en: string, ar: string, locale: string) => (locale === "ar" ? ar || en : en || ar);

export function liveArticles(articles: PublicArticle[] | undefined) {
  const now = Date.now();
  return (articles ?? []).filter((article) => !article.publish_at || Date.parse(article.publish_at) <= now);
}

export async function ArticlesIndex({ articles, locale, base, query }: { articles: PublicArticle[]; locale: string; base: string; query: { category?: string; q?: string; page?: string } }) {
  const [t, { config }] = await Promise.all([siteTranslations(locale), getSite()]);
  const options = config.commerce;
  const category = options.categories && typeof query.category === "string" ? query.category.slice(0, 80) : "";
  const q = options.search && typeof query.q === "string" ? query.q.trim().slice(0, 160) : "";
  const needle = q.normalize("NFKC").toLocaleLowerCase(locale);
  const categories = Array.from(new Set(articles.map(article => article.category)));
  const filtered = articles.filter(article => (!category || article.category === category) && (!needle || [article.title_en, article.title_ar, article.excerpt_en, article.excerpt_ar, ...article.tags].join(" ").normalize("NFKC").toLocaleLowerCase(locale).includes(needle)));
  const pages = Math.max(1, Math.ceil(filtered.length / options.pageSize));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(Number(query.page)) ? Number(query.page) : 1));
  const shown = filtered.slice((page - 1) * options.pageSize, page * options.pageSize);
  const href = (nextCategory = category, nextPage = 1) => {
    const params = new URLSearchParams();
    if (nextCategory) params.set("category", nextCategory);
    if (q) params.set("q", q);
    if (nextPage > 1) params.set("page", String(nextPage));
    return `${base}${params.size ? `?${params}` : ""}`;
  };
  const label = (key: string) => (t.articles.categories as Record<string, string>)[key] ?? key;
  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <header className="shell page-heading pb-0 space-y-6">
        <Reveal className="space-y-5 max-w-3xl">
          <SectionBadge>{t.articles.badge}</SectionBadge>
          <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight">{t.articles.title}</h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">{t.articles.subtitle}</p>
        </Reveal>
        {options.search && <form action={base} role="search" className="flex gap-3 max-w-2xl">
          {category && <input type="hidden" name="category" value={category} />}
          <input aria-label={t.articles.searchArticles} type="search" name="q" defaultValue={q} maxLength={160} placeholder={t.articles.searchPlaceholder} className="w-full rounded-brand border border-m3-outline bg-m3-surface-container-low px-4 py-3" />
          <button type="submit" className="rounded-brand bg-m3-primary text-m3-on-primary px-5 py-3 font-semibold">{t.articles.search}</button>
        </form>}
        <div className="flex flex-wrap items-center gap-2">
          {options.categories && categories.length > 1 && <>
            <Link href={href("")} aria-current={!category ? "page" : undefined} className={`min-h-11 px-4 py-3 rounded-brand text-sm border ${!category ? "border-m3-primary bg-m3-secondary-container text-m3-on-secondary-container" : "border-m3-outline-variant text-ink-muted hover:bg-m3-surface-container"}`}>{t.articles.allCategories}</Link>
            {categories.map(key => <Link key={key} href={href(key)} aria-current={category === key ? "page" : undefined} className={`min-h-11 px-4 py-3 rounded-brand text-sm border ${category === key ? "border-m3-primary bg-m3-secondary-container text-m3-on-secondary-container" : "border-m3-outline-variant text-ink-muted hover:bg-m3-surface-container"}`}>{label(key)}</Link>)}
          </>}
          <a href={`${base}/rss.xml`} className="ms-auto inline-flex min-h-11 items-center gap-2 text-sm text-m3-primary" title={t.articles.rss}><Rss aria-hidden="true" className="w-4 h-4" />{t.articles.rss}</a>
        </div>
        {(q || category) && <p className="text-sm text-ink-muted">{formatMessage(t.articles.resultsCount, { count: filtered.length })}</p>}
      </header>
      {shown.length ? <ArticleCards articles={shown} locale={locale} base={base} /> : <div className="shell py-20 space-y-4"><p className="text-ink-muted">{t.articles.empty}</p>{(q || category) && <Link href={base} className="inline-flex min-h-11 items-center text-m3-primary underline">{t.articles.clearFilters}</Link>}</div>}
      {pages > 1 && <nav className="shell flex justify-between items-center gap-4 pb-16" aria-label={t.articles.articlePages}>
        {page > 1 ? <Link href={href(category, page - 1)} className="min-h-11 py-3 text-m3-primary">{t.articles.previous}</Link> : <span />}
        <span className="text-ink-muted text-sm">{page} / {pages}</span>
        {page < pages ? <Link href={href(category, page + 1)} className="min-h-11 py-3 text-m3-primary">{t.articles.next}</Link> : <span />}
      </nav>}
    </div>
  );
}

export async function ArticleView({ article, related, locale, base, url }: { article: PublicArticle; related: PublicArticle[]; locale: string; base: string; url: string }) {
  const t = await siteTranslations(locale);
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  const title = text(article.title_en, article.title_ar, locale);
  const body = text(article.body_html_en, article.body_html_ar, locale);
  return (
    <article className="bg-brand-base text-ink">
      <div className="shell page-heading max-w-3xl space-y-8">
        <Link href={base} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors">
          <Back className="w-4 h-4" />
          {t.articles.back}
        </Link>
        <Reveal className="space-y-4">
          <p className="text-xs text-mint uppercase tracking-widest">
            {(t.articles.categories as Record<string, string>)[article.category] ?? article.category} · {articleDate(article, locale)}
          </p>
          <h1 className="text-4xl sm:text-5xl font-display font-bold leading-tight text-white">{title}</h1>
          {article.author_name && <p className="text-sm text-ink-muted">{formatMessage(t.articles.by, { author: article.author_name })}</p>}
        </Reveal>
        {article.cover_url && <ContentImage src={article.cover_url} alt="" className="w-full rounded-3xl aspect-[16/9] object-cover" width={1200} height={675} />}
        <div className="rich-text" dangerouslySetInnerHTML={{ __html: body }} />
        {article.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {article.tags.map((tag) => <li key={tag} className="px-3 py-1 rounded-full bg-white/5 text-xs text-ink-muted">#{tag}</li>)}
          </ul>
        )}
        <ShareLinks url={url} title={title} labels={{ share: t.articles.share, x: t.articles.shareX, linkedin: t.articles.shareLinkedIn, copy: t.articles.copyLink, copied: t.articles.copied }} />
      </div>
      {related.length > 0 && <ArticleCards articles={related} title={t.articles.latest} locale={locale} base={base} />}
    </article>
  );
}
