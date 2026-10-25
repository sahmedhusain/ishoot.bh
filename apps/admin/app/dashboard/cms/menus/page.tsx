import { getCompanySettings, getWebsiteEditor, listCmsPages, requireFeatureEnabled } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { requirePagePermission } from "../../../../lib/auth";
import { MenusEditorView } from "../../../../components/cms/MenusEditorView";

export const dynamic = "force-dynamic";

export default async function CmsMenusPage() {
  await requirePagePermission("pages", "edit");
  await requireFeatureEnabled("cms");
  const [content, pages, company] = await Promise.all([getWebsiteEditor(), listCmsPages(), getCompanySettings()]);
  const config = resolveWebsiteConfig(validateWebsiteConfig(content.draft));
  return (
    <MenusEditorView
      initialMenus={config.menus ?? null}
      articles={config.articles}
      pages={pages.map(({ id, title_en, title_ar, in_header, in_footer, is_visible, page_type }) => ({ id, title_en, title_ar, in_header, in_footer, is_visible, page_type }))}
      languages={company.content_languages}
    />
  );
}
