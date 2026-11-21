import { NextResponse } from "next/server";
import { itAllowed } from "@platform/contracts";
import { currentUser } from "../../../../lib/session";
import {
  QA_SUITES,
  isQaRunnerEnabled,
  listQaRuns,
  readLogAuditReport,
  readQaManifestSummary,
} from "../../../../lib/qa-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!itAllowed(user.roles, "system_health", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { activeRunId, runs } = listQaRuns();
  return NextResponse.json(
    {
      enabled: isQaRunnerEnabled(),
      canExecute: itAllowed(user.roles, "backups", "execute"),
      activeRunId,
      suites: QA_SUITES,
      manifest: readQaManifestSummary(),
      logAudit: readLogAuditReport(),
      history: runs,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
