import { serverMessages } from "@platform/locales";
import { safeWebsiteUrl } from "../website-config";
import {
  listArticles,
  getArticleByID,
  createArticle,
  updateArticle,
  deleteArticle,
  type CMSArticle,
} from "@platform/api-client";

export const ARTICLE_CATEGORIES = [
  "news",
  "update",
  "post",
  "press_release",
] as const;

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
  publish_at: string | null;
  featured: boolean;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
}

export interface CmsArticleRecord extends PublicArticle {
  status: "draft" | "published";
  body_en: unknown;
  body_ar: unknown;
  author_id: string | null;
  updated_at: string;
}

const mapPublic = (row: CMSArticle): PublicArticle => ({
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
  tags: row.tags ?? [],
  author_name: row.authorName ?? "",
  publish_at: row.publishAt ? new Date(row.publishAt).toISOString() : null,
  featured: row.featured,
  seo_title_en: row.seoTitleEn ?? "",
  seo_title_ar: row.seoTitleAr ?? "",
  seo_description_en: row.seoDescriptionEn ?? "",
  seo_description_ar: row.seoDescriptionAr ?? "",
});

const mapArticle = (row: CMSArticle): CmsArticleRecord => ({
  ...mapPublic(row),
  status: row.status === "published" ? "published" : "draft",
  body_en: row.bodyEn,
  body_ar: row.bodyAr,
  author_id: null,
  updated_at: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
});

export async function getPublishedArticles(): Promise<PublicArticle[]> {
  try {
    const rows = await listArticles(false);
    const sorted = [...(rows || [])].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const aDate = a.publishAt ? new Date(a.publishAt).getTime() : 0;
      const bDate = b.publishAt ? new Date(b.publishAt).getTime() : 0;
      return bDate - aDate;
    });
    return sorted.slice(0, 500).map(mapPublic);
  } catch (e) {
    console.error("Error fetching published articles:", e);
    return [];
  }
}

export interface ArticleListFilters {
  q?: string;
  status?: string;
  category?: string;
  page?: number;
}

export async function getArticlesPage(filters: ArticleListFilters) {
  const q = (filters.q ?? "").trim().toLowerCase().slice(0, 120);
  let rows: CMSArticle[] = [];
  try {
    rows = await listArticles(true);
  } catch (e) {
    console.error("Error fetching articles list:", e);
  }

  let filtered = rows;
  if (filters.status === "draft" || filters.status === "published") {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters.category && filters.category !== "all") {
    filtered = filtered.filter((r) => r.category === filters.category);
  }
  if (q) {
    filtered = filtered.filter(
      (r) =>
        r.titleEn?.toLowerCase().includes(q) ||
        r.titleAr?.includes(q) ||
        r.slug?.toLowerCase().includes(q),
    );
  }

  filtered.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const total = filtered.length;
  const pageSize = 30;
  const page = Math.min(
    Math.max(1, filters.page || 1),
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { items: items.map(mapArticle), total, page, pageSize };
}

export async function getCmsArticle(id: string) {
  try {
    const row = await getArticleByID("", id);
    return row ? mapArticle(row) : null;
  } catch {
    return null;
  }
}

export interface CmsArticleInput {
  id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  excerpt_en: string;
  excerpt_ar: string;
  body_en: unknown;
  body_ar: unknown;
  cover_url: string;
  category: string;
  tags: string[];
  author_name: string;
  status: "draft" | "published";
  publish_at: string;
  featured: boolean;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY = /^[a-z][a-z0-9_]{1,39}$/;

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
  _authorId: string,
) {
  if (!input.title_en.trim() || !input.title_ar.trim())
    throw new Error(serverMessages.cmsArticleTitleRequired);
  const slug = (
    input.slug.trim().toLowerCase() || articleSlug(input.title_en)
  ).slice(0, 80);
  if (!SLUG.test(slug)) throw new Error(serverMessages.cmsArticleSlugInvalid);
  if (!CATEGORY.test(input.category))
    throw new Error(serverMessages.cmsArticleCategoryInvalid);
  const publishAt = input.publish_at ? new Date(input.publish_at) : null;
  if (publishAt && !Number.isFinite(publishAt.getTime()))
    throw new Error(serverMessages.cmsArticleDateInvalid);
  const text = (value: string, max: number) =>
    value.trim().slice(0, max) || null;

  const data: Partial<CMSArticle> = {
    slug,
    titleEn: input.title_en.trim().slice(0, 200),
    titleAr: input.title_ar.trim().slice(0, 200),
    excerptEn: text(input.excerpt_en, 600),
    excerptAr: text(input.excerpt_ar, 600),
    bodyEn: input.body_en,
    bodyAr: input.body_ar,
    bodyHtmlEn: html.en.slice(0, 500_000),
    bodyHtmlAr: html.ar.slice(0, 500_000),
    coverUrl: safeWebsiteUrl(input.cover_url.trim()) || null,
    category: input.category,
    tags: Array.from(
      new Set(input.tags.map((tag) => tag.trim().slice(0, 40)).filter(Boolean)),
    ).slice(0, 20),
    authorName: text(input.author_name, 120),
    status: input.status === "published" ? "published" : "draft",
    publishAt:
      input.status === "published" && !publishAt
        ? new Date().toISOString()
        : publishAt
          ? publishAt.toISOString()
          : null,
    featured: input.featured,
    seoTitleEn: text(input.seo_title_en, 200),
    seoTitleAr: text(input.seo_title_ar, 200),
    seoDescriptionEn: text(input.seo_description_en, 400),
    seoDescriptionAr: text(input.seo_description_ar, 400),
  };

  const row = input.id
    ? await updateArticle("", input.id, data)
    : await createArticle("", data);
  return mapArticle(row);
}

export async function deleteCmsArticle(id: string) {
  try {
    await deleteArticle("", id);
  } catch (e) {
    console.error("Error deleting cms article:", e);
  }
}
