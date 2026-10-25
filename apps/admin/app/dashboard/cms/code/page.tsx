import { getWebsiteEditor, requireFeatureEnabled } from "@platform/database";
import { resolveWebsiteConfig, validateWebsiteConfig } from "@platform/database/website-config";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { SiteCodeView } from "../../../../components/cms/SiteCodeView";

export const dynamic = "force-dynamic";

export default async function CmsCodePage() {
  await requirePagePermission("cms_code", "read");
  await requireFeatureEnabled("cms");
  const [content, canEdit] = await Promise.all([getWebsiteEditor(), hasPermission("cms_code", "edit")]);
  return <SiteCodeView initialCode={resolveWebsiteConfig(validateWebsiteConfig(content.draft)).code} canEdit={canEdit} />;
}
