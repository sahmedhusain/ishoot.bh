"use client";

import * as React from "react";
import { formatMessage } from "@platform/locales";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Database,
  Download,
  Layers,
  Play,
  RefreshCw,
  Send,
  Wrench,
} from "lucide-react";
import type { DatabaseQueryResult, DatabaseStats } from "@platform/api-client";
import {
  runDatabaseMaintenanceAction,
  runDatabaseQueryAction,
} from "../app/(desk)/database/actions";
import { useCopy } from "./CopyProvider";
import { CriticalActionModal } from "./CriticalActionModal";
import { PageTitle } from "./ticket-ui";

function escapeCsvCell(val: string | number | boolean | null): string {
  const raw = val == null ? "" : String(val);
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }
  return formulaSafe;
}

export function DatabaseView({
  stats,
  canExecute = true,
}: {
  stats: DatabaseStats | null;
  canExecute?: boolean;
}) {
  const { copy, date } = useCopy();
  const dbCopy = copy.database;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const [maintenanceAction, setMaintenanceAction] = React.useState<{
    type: "analyze" | "purge_outbox";
    title: string;
    description: string;
    impact: string[];
  } | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = React.useState(false);

  const [queryInput, setQueryInput] = React.useState(
    "SELECT schemaname, relname AS table_name, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;",
  );
  const [queryRunning, setQueryRunning] = React.useState(false);
  const [queryResult, setQueryResult] = React.useState<DatabaseQueryResult | null>(null);

  const presets: Array<{ label: string; sql: string }> = [
    {
      label: dbCopy.presetTableSizes,
      sql: "SELECT schemaname, relname AS table_name, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;",
    },
    {
      label: dbCopy.presetConnections,
      sql: "SELECT pid, usename, state, wait_event_type, left(query, 80) AS query FROM pg_stat_activity WHERE datname = current_database() ORDER BY backend_start DESC LIMIT 20;",
    },
    {
      label: dbCopy.presetMigrations,
      sql: "SELECT version_id, is_applied, tstamp FROM system.goose_db_version ORDER BY id DESC LIMIT 10;",
    },
    {
      label: dbCopy.presetPendingOutbox,
      sql: "SELECT id, subject, attempts, created_at, published_at FROM system.outbox ORDER BY created_at DESC LIMIT 20;",
    },
  ];

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      toast.success(dbCopy.refreshed);
    }, 400);
  };

  const handleExecuteMaintenance = async () => {
    if (!maintenanceAction || !canExecute) return;
    setMaintenanceBusy(true);
    try {
      const res = await runDatabaseMaintenanceAction(maintenanceAction.type);
      const label =
        maintenanceAction.type === "purge_outbox"
          ? `${maintenanceAction.title} (${res.value.affectedRows} rows)`
          : maintenanceAction.title;
      toast.success(formatMessage(dbCopy.maintenanceSuccess, { title: label }));
      setMaintenanceAction(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dbCopy.maintenanceFailed);
    } finally {
      setMaintenanceBusy(false);
    }
  };

  const executeSql = async (sqlText: string) => {
    const q = sqlText.trim();
    if (!q) return;

    const destructive = /\b(drop|delete|truncate|alter|update|insert|grant|revoke)\b/i;
    if (destructive.test(q) && !/^(select|with|explain)\b/i.test(q.replace(/'.*?'/g, ""))) {
      toast.error(dbCopy.safetyViolation);
      return;
    }
    if (/^\s*(delete|drop|truncate|alter|update|insert|grant|revoke)\b/i.test(q)) {
      toast.error(dbCopy.safetyViolation);
      return;
    }

    setQueryRunning(true);
    try {
      const res = await runDatabaseQueryAction(q);
      setQueryResult(res.result);
      toast.success(dbCopy.refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dbCopy.queryFailed);
    } finally {
      setQueryRunning(false);
    }
  };

  const handleRunQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSql(queryInput);
  };

  const handleExportCsv = () => {
    if (!queryResult) return;
    const header = queryResult.columns.map(escapeCsvCell).join(",");
    const lines = queryResult.rows.map((r) => r.map(escapeCsvCell).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `db-diagnostic-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalPendingOutbox = stats?.outboxLag?.reduce((acc, curr) => acc + curr.pending, 0) ?? 0;
  const totalRiverQueued = stats?.riverStats?.reduce((acc, curr) => acc + curr.count, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={dbCopy.title} description={dbCopy.description} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{dbCopy.refresh}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
        <div className="it-card p-3 border-l-4 border-l-emerald-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.migrationsTitle}</div>
          <div className="text-base font-bold text-ink">{stats?.schemas?.length ?? 0}</div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400">SERVICE SCHEMAS</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-sky-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.riverTitle}</div>
          <div className="text-base font-bold text-sky-700 dark:text-sky-400">{totalRiverQueued}</div>
          <div className="text-[10px] text-ink-muted">RIVER JOB COUNTERS</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-amber-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.outboxLagLabel}</div>
          <div className="text-base font-bold text-ink">{totalPendingOutbox}</div>
          <div className="text-[10px] text-ink-muted">PENDING CDC EVENTS</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-indigo-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.postgresEngine}</div>
          <div className="text-base font-bold text-ink">READ-ONLY TX</div>
          <div className="text-[10px] text-indigo-700 dark:text-indigo-400">TIMEOUT: 5000MS · MAX 200 ROWS</div>
        </div>
      </div>

      <div className="it-card p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dbCopy.maintenanceTitle}
            </h2>
          </div>
          <span className="border border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
            {dbCopy.requiresConfirmation}
          </span>
        </div>

        <p className="text-[11px] text-ink-muted font-sans leading-relaxed">
          {dbCopy.maintenanceDesc}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 font-mono text-xs">
          <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-2">
            <div className="font-bold text-ink uppercase">{dbCopy.analyzeTitle}</div>
            <p className="text-[11px] text-ink-muted font-sans">{dbCopy.analyzeDesc}</p>
            <button
              type="button"
              disabled={!canExecute}
              onClick={() =>
                setMaintenanceAction({
                  type: "analyze",
                  title: "ANALYZE System Tables",
                  description:
                    "Runs PostgreSQL ANALYZE across system.outbox, system.company, system.backup_record, system.module_setting, and system.integration_setting.",
                  impact: [
                    "Updates PostgreSQL planner statistics immediately.",
                    "Non-blocking read/write operation (SHARE UPDATE EXCLUSIVE).",
                  ],
                })
              }
              className="it-btn-3d w-full py-1 text-xs font-bold text-sky-800 dark:text-sky-300 disabled:opacity-50"
            >
              {dbCopy.runAnalyze}
            </button>
          </div>

          <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-2">
            <div className="font-bold text-ink uppercase">{dbCopy.purgeOutboxTitle}</div>
            <p className="text-[11px] text-ink-muted font-sans">{dbCopy.purgeOutboxDesc}</p>
            <button
              type="button"
              disabled={!canExecute}
              onClick={() =>
                setMaintenanceAction({
                  type: "purge_outbox",
                  title: "Purge Delivered Outbox Events (>7 Days)",
                  description:
                    "Deletes delivered events from system.outbox where published_at is older than 7 days.",
                  impact: [
                    "Permanently drops acknowledged historical CDC outbox rows older than 7 days.",
                    "Reclaims table heap storage without affecting pending events.",
                    "Cannot be undone once purged.",
                  ],
                })
              }
              className="it-btn-3d w-full py-1 text-xs font-bold text-rose-700 dark:text-rose-400 disabled:opacity-50"
            >
              {dbCopy.runPurge}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="it-card p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-1.5">
            <Database className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dbCopy.migrationsTitle}
            </h2>
          </div>
          <p className="text-[11px] text-ink-muted font-sans">{dbCopy.migrationsSubtitle}</p>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="it-table w-full text-left rtl:text-right font-mono text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>{dbCopy.schema}</th>
                  <th>{dbCopy.version}</th>
                  <th>{dbCopy.appliedAt}</th>
                </tr>
              </thead>
              <tbody>
                {stats?.schemas?.map((s) => (
                  <tr key={s.schema}>
                    <td className="font-bold uppercase text-ink">[{s.schema}]</td>
                    <td className="text-sky-700 dark:text-sky-400 font-bold">{s.version}</td>
                    <td className="text-ink-muted text-[11px]">{date(s.appliedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="it-card p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-1.5">
            <Send className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dbCopy.outboxTitle}
            </h2>
          </div>
          <p className="text-[11px] text-ink-muted font-sans">{dbCopy.outboxSubtitle}</p>

          <div className="overflow-x-auto">
            <table className="it-table w-full text-left rtl:text-right font-mono text-xs">
              <thead>
                <tr>
                  <th>{dbCopy.schema}</th>
                  <th>{dbCopy.pendingEvents}</th>
                  <th>{dbCopy.status}</th>
                </tr>
              </thead>
              <tbody>
                {stats?.outboxLag?.map((lag) => {
                  const isClean = lag.pending === 0;
                  return (
                    <tr key={lag.schema}>
                      <td className="font-bold uppercase text-ink">[{lag.schema}]</td>
                      <td className="font-bold">{lag.pending}</td>
                      <td>
                        <span
                          className={`inline-block border px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                            isClean
                              ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {isClean ? "SYNCHRONIZED" : "PENDING QUEUE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="it-card p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dbCopy.diagnosticTitle}
            </h2>
          </div>
          <span className="border border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
            READ-ONLY SANDBOX
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-ink-muted">{dbCopy.presetsTitle}</div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={queryRunning}
                onClick={() => {
                  setQueryInput(preset.sql);
                  void executeSql(preset.sql);
                }}
                className="it-btn-3d px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:text-sky-300"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleRunQuery} className="space-y-3 font-mono text-xs">
          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={3}
            className="w-full it-field-sunken bg-slate-950 text-emerald-400 p-2 font-mono text-xs outline-none"
            placeholder="SELECT ... or EXPLAIN ANALYZE ..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-ink-muted">{dbCopy.diagnosticDesc}</span>

            <button
              type="submit"
              disabled={queryRunning}
              className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{queryRunning ? dbCopy.executing : dbCopy.executeSql}</span>
            </button>
          </div>
        </form>

        {queryResult && (
          <div className="space-y-2 pt-2 border-t border-slate-300 dark:border-slate-700 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
              <span>
                RESULT: {queryResult.rows.length} ROWS{queryResult.truncated ? " (TRUNCATED AT 200)" : ""}
              </span>
              <div className="flex items-center gap-3">
                <span>EXECUTION TIME: {queryResult.durationMs}ms</span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="it-btn-3d px-2.5 py-0.5 text-[11px] inline-flex items-center gap-1 text-sky-700 dark:text-sky-300"
                >
                  <Download className="size-3" />
                  <span>{dbCopy.exportCsv}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="it-table w-full">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {queryResult.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{cell == null ? "NULL" : String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {maintenanceAction && (
        <CriticalActionModal
          open={Boolean(maintenanceAction)}
          title={maintenanceAction.title}
          description={maintenanceAction.description}
          impactDetails={maintenanceAction.impact}
          requiredConfirmationText={maintenanceAction.type === "purge_outbox" ? "PURGE" : "CONFIRM"}
          confirmLabel={dbCopy.executeSql}
          dangerLevel={maintenanceAction.type === "purge_outbox" ? "critical" : "warning"}
          busy={maintenanceBusy}
          onConfirm={handleExecuteMaintenance}
          onCancel={() => setMaintenanceAction(null)}
        />
      )}
    </div>
  );
}
