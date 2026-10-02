import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getActivityLogs } from "@ishoot/database";
import { AuditSessionsView } from "../../../../components/settings/AuditSessionsView";

export const dynamic = "force-dynamic";

export default async function AuditSettingsPage() {
  await requirePermission("audit_logs", "read");
  const logs = await getActivityLogs(100);

  return <AuditSessionsView initialLogs={logs} />;
}
