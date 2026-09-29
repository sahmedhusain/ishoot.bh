import * as React from "react";
import { requirePermission } from "../../../../lib/auth";
import { getFeatureToggles } from "@ishoot/database";
import { ModulesManagementView } from "../../../../components/settings/ModulesManagementView";

export default async function ModulesSettingsPage() {
  await requirePermission("settings", "read");

  const toggles = await getFeatureToggles();

  return <ModulesManagementView initialToggles={toggles} />;
}
