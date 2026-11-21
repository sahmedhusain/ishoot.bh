import { itAllowed } from "@platform/contracts";
import { requireAllowed } from "../../../lib/session";
import {
  QA_SUITES,
  isQaRunnerEnabled,
  listQaRuns,
  readLogAuditReport,
  readQaManifestSummary,
} from "../../../lib/qa-runner";
import { QaDiagnosticsView } from "../../../components/QaDiagnosticsView";

export const dynamic = "force-dynamic";

export default async function QaPage() {
  const user = await requireAllowed("system_health", "read");
  const { activeRunId, runs } = listQaRuns();

  return (
    <QaDiagnosticsView
      enabled={isQaRunnerEnabled()}
      canExecute={itAllowed(user.roles, "backups", "execute")}
      initialActiveRunId={activeRunId}
      suites={QA_SUITES}
      initialManifest={readQaManifestSummary()}
      initialLogAudit={readLogAuditReport()}
      initialHistory={runs}
    />
  );
}
