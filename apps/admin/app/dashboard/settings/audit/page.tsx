import { requirePagePermission } from "../../../../lib/auth";
import { getActivityLogs } from "@platform/database";
import { AuditSessionsView } from "../../../../components/settings/AuditSessionsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/audit");

export const dynamic = "force-dynamic";

export default async function AuditSettingsPage() {
  await requirePagePermission("audit_logs", "read");
  const logs = await getActivityLogs(100);

  return <AuditSessionsView initialLogs={logs} />;
}
