import Link from "next/link";
import { ArrowLeft, ArrowRight, Rss } from "lucide-react";
import { formatMessage } from "@platform/locales";
import type { PublicArticle } from "@platform/database/queries/cms-articles";
import { siteTranslations } from "../../lib/site";
import { ContentImage } from "../shared/ContentImage";
import { Reveal } from "../shared/Reveal";
import { SectionBadge } from "../shared/SectionBadge";
import { ArticleCards, articleDate } from "./ArticleCards";
import { ShareLinks } from "./ShareLinks";

const text = (en: string, ar: string, locale: string) => (locale === "ar" ? ar || en : en || ar);

/** Articles that are public now: published, with their date reached. */
export function liveArticles(articles: PublicArticle[] | undefined) {
  const now = Date.now();
  return (articles ?? []).filter((article) => !article.publish_at || Date.parse(article.publish_at) <= now);
}

/** The articles list, filterable by category (press releases, updates…). */
export async function ArticlesIndex({ articles, locale, base, category }: { articles: PublicArticle[]; locale: string; base: string; category: string }) {
  const t = await siteTranslations(locale);
  const categories = Array.from(new Set(articles.map((article) => article.category)));
  const shown = category ? articles.filter((article) => article.category === category) : articles;
  const label = (key: string) => (t.articles.categories as Record<string, string>)[key] ?? key;
  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <header className="shell page-heading pb-0 space-y-5">
        <Reveal className="space-y-5 max-w-3xl">
          <SectionBadge>{t.articles.badge}</SectionBadge>
          <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight text-white">{t.articles.title}</h1>
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">{t.articles.subtitle}</p>
        </Reveal>
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 1 && (
            <>
              <Link href={base} className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${!category ? "border-accent bg-accent/15 text-paper" : "border-white/15 text-ink-muted hover:text-paper"}`}>{t.articles.allCategories}</Link>
              {categories.map((key) => (
                <Link key={key} href={`${base}?category=${encodeURIComponent(key)}`} className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${category === key ? "border-accent bg-accent/15 text-paper" : "border-white/15 text-ink-muted hover:text-paper"}`}>
                  {label(key)}
                </Link>
              ))}
            </>
          )}
          <a href={`${base}/rss.xml`} className="ms-auto inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-mint" title={t.articles.rss}>
            <Rss className="w-3.5 h-3.5" />
            {t.articles.rss}
          </a>
        </div>
      </header>
      {shown.length ? <ArticleCards articles={shown} locale={locale} base={base} /> : <p className="shell py-20 text-ink-muted">{t.articles.empty}</p>}
    </div>
  );
}

/** One article: cover, date and author, the body and share links. */
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
        <ShareLinks url={url} title={title} labels={{ share: t.articles.share, x: t.articles.shareX, linkedin: t.articles.shareLinkedIn, whatsapp: t.articles.shareWhatsApp, copy: t.articles.copyLink, copied: t.articles.copied }} />
      </div>
      {related.length > 0 && <ArticleCards articles={related} title={t.articles.latest} locale={locale} base={base} />}
    </article>
  );
}
