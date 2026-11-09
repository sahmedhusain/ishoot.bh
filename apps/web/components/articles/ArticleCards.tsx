import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicArticle } from "@platform/database/queries/cms-articles";
import { ContentImage } from "../shared/ContentImage";
import { Reveal } from "../shared/Reveal";

const text = (en: string, ar: string, locale: string) => (locale === "ar" ? ar || en : en || ar);

export function articleDate(article: Pick<PublicArticle, "publish_at">, locale: string) {
  return article.publish_at ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { dateStyle: "medium" }).format(new Date(article.publish_at)) : "";
}

export function ArticleCards({ articles, title, locale, base }: { articles: PublicArticle[]; title?: string; locale: string; base?: string }) {
  if (!articles.length) return null;
  const href = (slug: string) => `${base ?? `/${locale}/news`}/${encodeURIComponent(slug)}`;
  return (
    <section className="relative py-16 sm:py-20 border-t border-white/10">
      <div className="shell space-y-8">
        {title && <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">{title}</h2>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <Reveal key={article.id} delay={Math.min(index, 6) * 0.05}>
              <Link href={href(article.slug)} className="group block h-full rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 motion-reduce:transform-none">
                {article.cover_url ? (
                  <ContentImage src={article.cover_url} alt="" className="w-full aspect-[16/9] object-cover" width={720} height={405} />
                ) : (
                  <div className="w-full aspect-[16/9] bg-gradient-to-br from-primary/40 to-brand-surface" />
                )}
                <div className="p-5 space-y-2">
                  <p className="text-xs text-mint">{articleDate(article, locale)}</p>
                  <h3 className="font-display text-lg font-bold text-white leading-snug">{text(article.title_en, article.title_ar, locale)}</h3>
                  <p className="text-sm text-ink-muted line-clamp-3">{text(article.excerpt_en, article.excerpt_ar, locale)}</p>
                  <ArrowUpRight className="w-4 h-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
