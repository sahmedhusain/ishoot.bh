"use client";

import * as React from "react";
import { formatMessage } from "@platform/locales";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Database,
  RefreshCw,
  Send,
  Wrench,
  Play,
  Layers,
} from "lucide-react";
import type { DatabaseStats } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";

export function DatabaseView({ stats }: { stats: DatabaseStats | null }) {
  const { copy, date } = useCopy();
  const dbCopy = copy.database;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  // Maintenance Dialog State
  const [maintenanceAction, setMaintenanceAction] = React.useState<{
    type: "vacuum" | "reindex" | "purge_outbox";
    title: string;
    description: string;
    impact: string[];
  } | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = React.useState(false);

  // Query Runner State
  const [queryInput, setQueryInput] = React.useState(
    "SELECT schemaname, tablename, n_live_tup, n_dead_tup, last_vacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 5;"
  );
  const [queryRunning, setQueryRunning] = React.useState(false);
  const [queryResult, setQueryResult] = React.useState<{
    columns: string[];
    rows: (string | number | null)[][];
    durationMs: number;
  } | null>({
    columns: ["schemaname", "tablename", "n_live_tup", "n_dead_tup", "last_vacuum"],
    rows: [
      ["system", "company", 1, 0, "2026-11-08 18:00:00"],
      ["identity", "account", 14, 2, "2026-11-08 19:15:00"],
      ["itsm", "ticket", 48, 5, "2026-11-08 19:30:00"],
      ["notify", "message", 120, 12, "2026-11-08 20:00:00"],
      ["audit", "event", 412, 18, "2026-11-08 20:45:00"],
    ],
    durationMs: 14,
  });

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      toast.success(dbCopy.refreshed);
    }, 400);
  };

  const handleExecuteMaintenance = async () => {
    if (!maintenanceAction) return;
    setMaintenanceBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(formatMessage(dbCopy.maintenanceSuccess, { title: maintenanceAction.title }));
      setMaintenanceAction(null);
      router.refresh();
    } catch {
      toast.error(dbCopy.maintenanceFailed);
    } finally {
      setMaintenanceBusy(false);
    }
  };

  const handleRunQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = queryInput.trim();
    if (!q) return;

    // Safety check: block write/destructive queries
    const destructive = /\b(drop|delete|truncate|alter|update|insert|grant|revoke)\b/i;
    if (destructive.test(q)) {
      toast.error(dbCopy.safetyViolation);
      return;
    }

    setQueryRunning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setQueryResult({
        columns: ["schema", "relation", "heap_blks_read", "heap_blks_hit", "cache_hit_pct"],
        rows: [
          ["system", "company", 12, 1420, "99.16%"],
          ["identity", "account", 44, 3810, "98.86%"],
          ["itsm", "ticket", 82, 5912, "98.63%"],
        ],
        durationMs: 18,
      });
      toast.success(dbCopy.refreshed);
    } catch {
      toast.error(dbCopy.queryFailed);
    } finally {
      setQueryRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle
          title={dbCopy.title}
          description={dbCopy.description}
        />
        <div className="flex items-center gap-2">
          <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
            T-CODE: DB02 [DATABASE OPERATIONS]
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="it-btn-3d py-1.5 px-3 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{dbCopy.refresh}</span>
          </button>
        </div>
      </div>

      {/* Connection Pool & Health Gauges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
        <div className="it-card p-3 border-l-4 border-l-emerald-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.activeConnections}</div>
          <div className="text-base font-bold text-ink">14 / 40</div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400">POOL UTILIZATION: 35%</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-sky-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.cacheHitRatio}</div>
          <div className="text-base font-bold text-sky-700 dark:text-sky-400">99.4%</div>
          <div className="text-[10px] text-ink-muted">BUFFER CACHE HEALTHY</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-amber-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.outboxLagLabel}</div>
          <div className="text-base font-bold text-ink">
            {stats?.outboxLag?.reduce((acc, curr) => acc + curr.pending, 0) ?? 0}
          </div>
          <div className="text-[10px] text-ink-muted">PENDING CDC EVENTS</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-indigo-600 space-y-1">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{dbCopy.postgresEngine}</div>
          <div className="text-base font-bold text-ink">v16.3 (REL)</div>
          <div className="text-[10px] text-indigo-700 dark:text-indigo-400">WAL ARCHIVING: ON</div>
        </div>
      </div>

      {/* Maintenance Danger Zone (Protected with Confirmation Modals) */}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono text-xs">
          <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-2">
            <div className="font-bold text-ink uppercase">{dbCopy.vacuumTitle}</div>
            <p className="text-[11px] text-ink-muted font-sans">
              {dbCopy.vacuumDesc}
            </p>
            <button
              type="button"
              onClick={() =>
                setMaintenanceAction({
                  type: "vacuum",
                  title: "Trigger VACUUM ANALYZE (All Schemas)",
                  description:
                    "This operation will scan table pages across system, identity, itsm, and audit schemas to reclaim dead rows and update optimizer cost stats.",
                  impact: [
                    "Temporary I/O spike while reading heap pages.",
                    "No locks taken on normal reads or writes (online operation).",
                    "Recommended run time: off-peak or maintenance windows.",
                  ],
                })
              }
              className="it-btn-3d w-full py-1 text-xs font-bold text-sky-800 dark:text-sky-300"
            >
              {dbCopy.runVacuum}
            </button>
          </div>

          <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-2">
            <div className="font-bold text-ink uppercase">{dbCopy.reindexTitle}</div>
            <p className="text-[11px] text-ink-muted font-sans">
              {dbCopy.reindexDesc}
            </p>
            <button
              type="button"
              onClick={() =>
                setMaintenanceAction({
                  type: "reindex",
                  title: "Reindex System & Identity Indices",
                  description:
                    "This operation invokes REINDEX CONCURRENTLY across all primary and foreign key indices.",
                  impact: [
                    "Increases CPU usage during index construction.",
                    "Runs concurrently without blocking client transactions.",
                    "Cleans up B-Tree fragmentation.",
                  ],
                })
              }
              className="it-btn-3d w-full py-1 text-xs font-bold text-amber-800 dark:text-amber-300"
            >
              {dbCopy.runReindex}
            </button>
          </div>

          <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface space-y-2">
            <div className="font-bold text-ink uppercase">{dbCopy.purgeOutboxTitle}</div>
            <p className="text-[11px] text-ink-muted font-sans">
              {dbCopy.purgeOutboxDesc}
            </p>
            <button
              type="button"
              onClick={() =>
                setMaintenanceAction({
                  type: "purge_outbox",
                  title: "Purge Delivered Outbox Events (>30 Days)",
                  description:
                    "Deletes historical events from system.outbox, identity.outbox, and itsm.outbox that have already been acknowledged by worker subscribers.",
                  impact: [
                    "Permanently drops expired CDC outbox events.",
                    "Frees disk space in pg_wal and heap storage.",
                    "Cannot be undone once purged.",
                  ],
                })
              }
              className="it-btn-3d w-full py-1 text-xs font-bold text-rose-700 dark:text-rose-400"
            >
              {dbCopy.runPurge}
            </button>
          </div>
        </div>
      </div>

      {/* Goose Migrations and Outbox Table */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Goose Schema Migrations */}
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
                    <td className="font-bold uppercase text-ink">
                      [{s.schema}]
                    </td>
                    <td className="text-sky-700 dark:text-sky-400 font-bold">{s.version}</td>
                    <td className="text-ink-muted text-[11px]">
                      {date(s.appliedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outbox Lag */}
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
                      <td className="font-bold uppercase text-ink">
                        [{lag.schema}]
                      </td>
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

      {/* Read-Only Diagnostic SQL Console */}
      <div className="it-card p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
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

        <form onSubmit={handleRunQuery} className="space-y-3 font-mono text-xs">
          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={3}
            className="w-full it-field-sunken bg-slate-950 text-emerald-400 p-2 font-mono text-xs outline-none"
            placeholder="SELECT ... or EXPLAIN ANALYZE ..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-ink-muted">
              {dbCopy.diagnosticDesc}
            </span>

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
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>RESULT: {queryResult.rows.length} ROWS</span>
              <span>EXECUTION TIME: {queryResult.durationMs}ms</span>
            </div>

            <div className="overflow-x-auto">
              <table className="it-table w-full">
                <thead>
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
                        <td key={cIdx}>{cell ?? "NULL"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Critical Action Modal for Database Maintenance */}
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
