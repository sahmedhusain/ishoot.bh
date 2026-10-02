import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { MetaIntegrationsView } from "../../../../components/settings/MetaIntegrationsView";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  await requirePermission("settings", "write");
  return <MetaIntegrationsView />;
}
