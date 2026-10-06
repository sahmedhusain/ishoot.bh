import { requirePagePermission } from "../../../../lib/auth";
import { getActivityLogs } from "@ishoot/database";
import { AuditSessionsView } from "../../../../components/settings/AuditSessionsView";

export const dynamic = "force-dynamic";

export default async function AuditSettingsPage() {
  await requirePagePermission("audit_logs", "read");
  const logs = await getActivityLogs(100);

  return <AuditSessionsView initialLogs={logs} />;
}
