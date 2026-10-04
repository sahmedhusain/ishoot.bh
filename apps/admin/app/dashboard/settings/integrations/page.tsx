import { requirePermission } from "../../../../lib/auth";
import { MetaIntegrationsView } from "../../../../components/settings/MetaIntegrationsView";
import { db } from "@ishoot/database";
import { decryptIntegrationCredentials } from "../../../../lib/integration-credentials";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  await requirePermission("settings", "write");

  const records = await db.integrationSetting.findMany();

  const whatsapp = records.find(r => r.provider === "whatsapp");
  const meta = records.find(r => r.provider === "meta");

  const waCreds = whatsapp?.credentials ? decryptIntegrationCredentials(whatsapp.credentials) : null;
  const metaCreds = meta?.credentials ? decryptIntegrationCredentials(meta.credentials) : null;

  return <MetaIntegrationsView
    initialWhatsApp={{
      isActive: whatsapp?.isActive || false,
      healthStatus: whatsapp?.healthStatus || "unknown",
      phoneId: waCreds?.phoneId || "",
      businessId: waCreds?.businessId || "",
      token: waCreds?.token || "",
      config: whatsapp?.config as any || {}
    }}
    initialMeta={{
      isActive: meta?.isActive || false,
      healthStatus: meta?.healthStatus || "unknown",
      accountId: metaCreds?.accountId || "",
      pageId: metaCreds?.pageId || "",
      config: meta?.config as any || {}
    }}
  />;
}
