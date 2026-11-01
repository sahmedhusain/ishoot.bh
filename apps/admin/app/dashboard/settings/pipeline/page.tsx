import { getCompanySettings, getDealPipeline, requireFeatureEnabled } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { PipelineSettingsView } from "../../../../components/settings/PipelineSettingsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/pipeline");

export const dynamic = "force-dynamic";

export default async function PipelineSettingsPage() {
  await requirePagePermission("settings", "read");
  await requireFeatureEnabled("crm_deals");
  const [stages, company, canEdit] = await Promise.all([getDealPipeline(), getCompanySettings(), hasPermission("settings", "edit")]);
  return <PipelineSettingsView initialStages={stages} languages={company.content_languages} canEdit={canEdit} />;
}
