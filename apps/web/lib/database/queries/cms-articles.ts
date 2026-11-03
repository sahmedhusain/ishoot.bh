import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { safeWebsiteUrl } from "../website-config";

/** Built-in article categories; a company may also use its own keys. PR uses press_release. */
export const ARTICLE_CATEGORIES = [
  "news",
  "update",
  "post",
  "press_release",
] as const;

/** An article as the website shows it (part of the published snapshot). */
export interface PublicArticle {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  body_html_en: string;
  body_html_ar: string;
  cover_url: string;
  category: string;
  tags: string[];
  author_name: string;
  /** ISO time it goes public; later than now means scheduled. */
  publish_at: string | null;
  featured: boolean;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
}

/** An article in the admin: the public fields plus the editor documents and status. */
export interface CmsArticleRecord extends PublicArticle {
  status: "draft" | "published";
  body_en: unknown;
  body_ar: unknown;
  author_id: string | null;
  updated_at: string;
}

type ArticleRow = Awaited<ReturnType<typeof db.cmsArticle.findMany>>[number];

const mapPublic = (row: ArticleRow): PublicArticle => ({
  id: row.id,
  slug: row.slug,
  title_en: row.titleEn,
  title_ar: row.titleAr,
  excerpt_en: row.excerptEn ?? "",
  excerpt_ar: row.excerptAr ?? "",
  body_html_en: row.bodyHtmlEn ?? "",
  body_html_ar: row.bodyHtmlAr ?? "",
  cover_url: row.coverUrl ?? "",
  category: row.category,
  tags: row.tags,
  author_name: row.authorName ?? "",
  publish_at: row.publishAt?.toISOString() ?? null,
  featured: row.featured,
  seo_title_en: row.seoTitleEn ?? "",
  seo_title_ar: row.seoTitleAr ?? "",
  seo_description_en: row.seoDescriptionEn ?? "",
  seo_description_ar: row.seoDescriptionAr ?? "",
});

const mapArticle = (row: ArticleRow): CmsArticleRecord => ({
  ...mapPublic(row),
  status: row.status === "published" ? "published" : "draft",
  body_en: row.bodyEn,
  body_ar: row.bodyAr,
  author_id: row.authorId,
  updated_at: row.updatedAt.toISOString(),
});

/** Published articles (including scheduled ones) for the website snapshot, newest first. */
export async function getPublishedArticles(): Promise<PublicArticle[]> {
  const rows = await db.cmsArticle.findMany({
    where: { status: "published" },
    orderBy: [
      { featured: "desc" },
      { publishAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 500,
  });
  return rows.map(mapPublic);
}

export interface ArticleListFilters {
  q?: string;
  status?: string;
  category?: string;
  page?: number;
}

export async function getArticlesPage(filters: ArticleListFilters) {
  const q = (filters.q ?? "").trim().slice(0, 120);
  const where = {
    ...(filters.status === "draft" || filters.status === "published"
      ? { status: filters.status }
      : {}),
    ...(filters.category && filters.category !== "all"
      ? { category: filters.category }
      : {}),
    ...(q
      ? {
          OR: [
            { titleEn: { contains: q, mode: "insensitive" as const } },
            { titleAr: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };
  const total = await db.cmsArticle.count({ where });
  const pageSize = 30;
  const page = Math.min(
    Math.max(1, filters.page || 1),
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const rows = await db.cmsArticle.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { items: rows.map(mapArticle), total, page, pageSize };
}

export async function getCmsArticle(id: string) {
  const row = await db.cmsArticle.findUnique({ where: { id } });
  return row ? mapArticle(row) : null;
}

export interface CmsArticleInput {
  id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  /** TipTap documents; the HTML is rendered and cleaned on the server. */
  body_en: unknown;
  body_ar: unknown;
  cover_url: string;
  category: string;
  tags: string[];
  author_name: string;
  status: "draft" | "published";
  /** ISO date-time; empty publishes straight away when the website is published. */
  publish_at: string;
  featured: boolean;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY = /^[a-z][a-z0-9_]{1,39}$/;

/** A web-safe address from a title: Latin letters and digits only, else a dated fallback. */
export function articleSlug(title: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || `article-${new Date().toISOString().slice(0, 10)}`;
}

export async function saveCmsArticle(
  input: CmsArticleInput,
  html: { en: string; ar: string },
  authorId: string,
) {
  const existing = input.id
    ? await db.cmsArticle.findUnique({
        where: { id: input.id },
        select: { id: true, authorId: true },
      })
    : null;
  if (input.id && !existing) throw new Error(serverMessages.cmsArticleNotFound);
  if (!input.title_en.trim() || !input.title_ar.trim())
    throw new Error(serverMessages.cmsArticleTitleRequired);
  const slug = (
    input.slug.trim().toLowerCase() || articleSlug(input.title_en)
  ).slice(0, 80);
  if (!SLUG.test(slug)) throw new Error(serverMessages.cmsArticleSlugInvalid);
  const clash = await db.cmsArticle.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash && clash.id !== input.id)
    throw new Error(serverMessages.cmsArticleSlugTaken);
  if (!CATEGORY.test(input.category))
    throw new Error(serverMessages.cmsArticleCategoryInvalid);
  const publishAt = input.publish_at ? new Date(input.publish_at) : null;
  if (publishAt && !Number.isFinite(publishAt.getTime()))
    throw new Error(serverMessages.cmsArticleDateInvalid);
  const text = (value: string, max: number) =>
    value.trim().slice(0, max) || null;
  const data = {
    slug,
    titleEn: input.title_en.trim().slice(0, 200),
    titleAr: input.title_ar.trim().slice(0, 200),
    excerptEn: text(input.excerpt_en, 600),
    excerptAr: text(input.excerpt_ar, 600),
    bodyEn: (input.body_en ?? undefined) as never,
    bodyAr: (input.body_ar ?? undefined) as never,
    bodyHtmlEn: html.en.slice(0, 500_000),
    bodyHtmlAr: html.ar.slice(0, 500_000),
    coverUrl: safeWebsiteUrl(input.cover_url.trim()) || null,
    category: input.category,
    tags: Array.from(
      new Set(input.tags.map((tag) => tag.trim().slice(0, 40)).filter(Boolean)),
    ).slice(0, 20),
    authorName: text(input.author_name, 120),
    status: input.status === "published" ? "published" : "draft",
    // A published article without a date goes out now; drafts keep whatever date was chosen.
    publishAt:
      input.status === "published" && !publishAt ? new Date() : publishAt,
    featured: input.featured,
    seoTitleEn: text(input.seo_title_en, 200),
    seoTitleAr: text(input.seo_title_ar, 200),
    seoDescriptionEn: text(input.seo_description_en, 400),
    seoDescriptionAr: text(input.seo_description_ar, 400),
  };
  const row = existing
    ? await db.cmsArticle.update({ where: { id: existing.id }, data })
    : await db.cmsArticle.create({ data: { ...data, authorId } });
  return mapArticle(row);
}

export async function deleteCmsArticle(id: string) {
  await db.cmsArticle.deleteMany({ where: { id } });
}
