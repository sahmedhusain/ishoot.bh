import * as React from "react";
import { getActivityLogs } from "@ishoot/database";
import { AuditSessionsView } from "../../../../components/settings/AuditSessionsView";

export const dynamic = "force-dynamic";

export default async function AuditSettingsPage() {
  const logs = await getActivityLogs(100);

  return <AuditSessionsView initialLogs={logs} />;
}
