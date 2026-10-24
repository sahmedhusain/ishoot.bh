import { requirePagePermission } from "../../../../lib/auth";
import { getFeatureToggles } from "@platform/database";
import { ModulesManagementView } from "../../../../components/settings/ModulesManagementView";

export default async function ModulesSettingsPage() {
  await requirePagePermission("settings", "read");

  const toggles = await getFeatureToggles();

  return <ModulesManagementView initialToggles={toggles} />;
}
