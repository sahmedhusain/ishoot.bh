import { requirePagePermission } from "../../../../lib/auth";
import { ensureDefaultFeatureModules } from "@platform/database";
import { ModulesManagementView } from "../../../../components/settings/ModulesManagementView";

export default async function ModulesSettingsPage() {
  await requirePagePermission("settings", "read");

  // Modules added in later versions appear here (with their default) on companies set up before them.
  const toggles = await ensureDefaultFeatureModules();

  return <ModulesManagementView initialToggles={toggles} />;
}
