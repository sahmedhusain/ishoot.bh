import { requireAuth } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import { SecuritySettingsView } from "../../../../components/settings/SecuritySettingsView";
export default async function SecuritySettingsPage() {
  const user = await requireAuth();
  const settings = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { mfaEnabled: true } });
  return <SecuritySettingsView enabled={settings.mfaEnabled} />;
}
