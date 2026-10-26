import { NextResponse } from "next/server";
import { measureOperation } from "@platform/database";
import { getSite } from "../../../../lib/site";
import { publicSiteUrl } from "../../../../lib/site-url";
import { liveArticles } from "../../../../components/articles/ArticleViews";

const escape = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[char]!,
  );

/** RSS 2.0 feed of the published articles, at /{locale}/{articles}/rss.xml. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; collection: string }> },
) {
  return measureOperation("web:rss:GET", async () => {
    const { locale, collection } = await params;
    const { website, info, company } = await getSite();
    if (
      !website ||
      !["en", "ar"].includes(locale) ||
      collection !== info.articles.slug ||
      !(info.languages as string[]).includes(locale)
    )
      return new NextResponse(null, { status: 404 });
    const ar = locale === "ar";
    const base = `${(await publicSiteUrl()).href.replace(/\/$/, "")}/${locale}/${info.articles.slug}`;
    const items = liveArticles(website.articles)
      .slice(0, 50)
      .map((article) => {
        const title = ar
          ? article.title_ar || article.title_en
          : article.title_en || article.title_ar;
        const excerpt = ar
          ? article.excerpt_ar || article.excerpt_en
          : article.excerpt_en || article.excerpt_ar;
        const link = `${base}/${encodeURIComponent(article.slug)}`;
        return `<item><title>${escape(title)}</title><link>${escape(link)}</link><guid isPermaLink="true">${escape(link)}</guid>${article.publish_at ? `<pubDate>${new Date(article.publish_at).toUTCString()}</pubDate>` : ""}<category>${escape(article.category)}</category><description>${escape(excerpt)}</description></item>`;
      })
      .join("");
    const name = ar ? company.company_name_ar : company.company_name_en;
    const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(name)}</title><link>${escape(base)}</link><description>${escape(ar ? info.articles.navAr : info.articles.navEn)}</description><language>${locale}</language>${items}</channel></rss>`;
    return new NextResponse(feed, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  });
}
