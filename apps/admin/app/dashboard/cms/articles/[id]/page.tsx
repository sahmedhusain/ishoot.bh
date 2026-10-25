import { notFound } from "next/navigation";
import { getCmsArticle, getCompanySettings, getWebsiteEditor, requireFeatureEnabled, type CmsArticleRecord } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { ArticleEditorView } from "../../../../../components/cms/ArticleEditorView";

export const dynamic = "force-dynamic";

/** An article's editor; "new" starts an empty draft. */
export default async function CmsArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePagePermission("articles", id === "new" ? "create" : "read");
  await requireFeatureEnabled("cms");
  const [article, company, content, canPublish, canDelete] = await Promise.all([
    id === "new" ? Promise.resolve(null) : getCmsArticle(id),
    getCompanySettings(),
    getWebsiteEditor(),
    hasPermission("articles", "approve"),
    hasPermission("articles", "delete"),
  ]);
  if (id !== "new" && !article) notFound();
  const empty: CmsArticleRecord = {
    id: "", slug: "", title_en: "", title_ar: "", excerpt_en: "", excerpt_ar: "", body_html_en: "", body_html_ar: "", cover_url: "", category: "news", tags: [], author_name: user.full_name,
    publish_at: null, featured: false, seo_title_en: "", seo_title_ar: "", seo_description_en: "", seo_description_ar: "", status: "draft", body_en: null, body_ar: null, author_id: user.id, updated_at: "",
  };
  const articlesSlug = resolveWebsiteConfig(validateWebsiteConfig(content.draft)).articles.slug;
  return <ArticleEditorView key={article?.id ?? "new"} article={article ?? empty} languages={company.content_languages} canPublish={canPublish} canDelete={canDelete} articlesSlug={articlesSlug} />;
}
