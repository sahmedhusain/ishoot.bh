import { notFound } from "next/navigation";
import { getCmsPage, getCompanySettings, getWebsiteEditor, requireFeatureEnabled, type CmsPageRecord } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { PageEditorView } from "../../../../../components/cms/PageEditorView";

export const dynamic = "force-dynamic";

const EMPTY: CmsPageRecord = {
  id: "",
  slug: "",
  page_type: "custom",
  title_en: "",
  title_ar: "",
  seo_title_en: "",
  seo_title_ar: "",
  seo_description_en: "",
  seo_description_ar: "",
  blocks: [],
  is_visible: true,
  in_header: true,
  in_footer: false,
  sort_order: 0,
  updated_at: "",
};

/** A page's editor; "new" starts an empty page. */
export default async function CmsPageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("pages", id === "new" ? "create" : "read");
  await requireFeatureEnabled("cms");
  const [page, company, content, canCode] = await Promise.all([id === "new" ? Promise.resolve(EMPTY) : getCmsPage(id), getCompanySettings(), getWebsiteEditor(), hasPermission("cms_code", "edit")]);
  if (!page) notFound();
  const config = resolveWebsiteConfig(validateWebsiteConfig(content.draft));
  const catalogue = config.collection.slug;
  return <PageEditorView key={page.id || "new"} page={page} activity={config.purpose} languages={company.content_languages} canCode={canCode} catalogueSlug={catalogue} />;
}
