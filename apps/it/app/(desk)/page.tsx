import {
  getCompanySetupStatusForIT,
  getDatabaseStatsForIT,
  getSystemHealthForIT,
  listBackupsForIT,
  listQueue,
  queueStats,
} from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { redirect } from "next/navigation";
import { isQaRunnerEnabled, readLogAuditReport } from "../../lib/qa-runner";
import { asUser, requireAllowed } from "../../lib/session";
import { OverviewView, type OverviewNocSummary } from "../../components/OverviewView";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ skip?: string }>;
}) {
  const user = await requireAllowed("tickets", "read");
  const params = await searchParams;
  if (params?.skip !== "1") {
    const status = await asUser(() =>
      getCompanySetupStatusForIT(user.token),
    ).catch(() => null);
    if (status && !status.finished) {
      redirect("/setup");
    }
  }

  const canHealth = itAllowed(user.roles, "system_health", "read");
  const canDb = itAllowed(user.roles, "database", "read");
  const canBackups = itAllowed(user.roles, "backups", "read");

  const [stats, latest, services, dbStats, backups] = await Promise.all([
    asUser(() => queueStats(user.token)).catch(() => null),
    asUser(() => listQueue(user.token, { open: true, limit: 5 })).catch(
      () => null,
    ),
    canHealth
      ? asUser(() => getSystemHealthForIT(user.token)).catch(() => null)
      : Promise.resolve(null),
    canDb
      ? asUser(() => getDatabaseStatsForIT(user.token)).catch(() => null)
      : Promise.resolve(null),
    canBackups
      ? asUser(() => listBackupsForIT(user.token)).catch(() => null)
      : Promise.resolve(null),
  ]);

  const auditReport = readLogAuditReport();
  const noc: OverviewNocSummary = {
    healthyServices: Array.isArray(services)
      ? services.filter((s) => s.status === "healthy").length
      : 0,
    totalServices: Array.isArray(services) ? services.length : 0,
    pendingOutbox: dbStats?.outboxLag?.reduce((acc, row) => acc + row.pending, 0) ?? 0,
    latestBackupStatus: backups?.[0]?.status ?? null,
    latestBackupAt: backups?.[0]?.createdAt ?? null,
    auditPassed: auditReport ? auditReport.summary.passed : null,
    auditErrors: auditReport ? auditReport.summary.totalErrors : null,
    qaEnabled: isQaRunnerEnabled(),
  };

  return (
    <OverviewView
      stats={stats}
      latest={latest?.items ?? null}
      noc={noc}
    />
  );
}
