import { requirePermission } from "../../../../lib/auth";
import { IntegrationsView } from "../../../../components/settings/IntegrationsView";
import { listIntegrationsForAdmin } from "@ishoot/database";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  await requirePermission("settings", "write");
  // Secrets are reduced to "set" flags and a short hint before reaching the browser.
  const integrations = await listIntegrationsForAdmin();
  return <IntegrationsView integrations={integrations} />;
}
