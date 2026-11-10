"use client";

import * as React from "react";
import { Server, Cpu, GitCommit, CheckCircle2, AlertTriangle, RefreshCw, Zap, ShieldAlert, Layers, Search, Filter, X } from "lucide-react";
import { Button, Card } from "@platform/ui";
import { toast } from "sonner";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";
import { useCopy } from "./CopyProvider";

interface ServiceRuntimeInfo {
  name: string;
  kind: "backend" | "frontend" | "worker";
  port: number;
  status: "ONLINE" | "STANDBY" | "FAULT";
  memoryMb: number;
  cpuPct: number;
  uptimeHours: number;
  latencyMs: number;
}

const SERVICES_RUNTIME: ServiceRuntimeInfo[] = [
  { name: "identity-service", kind: "backend", port: 4001, status: "ONLINE", memoryMb: 42, cpuPct: 1.2, uptimeHours: 168, latencyMs: 4 },
  { name: "system-service", kind: "backend", port: 4002, status: "ONLINE", memoryMb: 58, cpuPct: 1.8, uptimeHours: 168, latencyMs: 6 },
  { name: "itsm-service", kind: "backend", port: 4003, status: "ONLINE", memoryMb: 39, cpuPct: 0.9, uptimeHours: 168, latencyMs: 5 },
  { name: "files-service", kind: "backend", port: 4004, status: "ONLINE", memoryMb: 34, cpuPct: 0.6, uptimeHours: 168, latencyMs: 3 },
  { name: "notify-service", kind: "backend", port: 4005, status: "ONLINE", memoryMb: 36, cpuPct: 1.1, uptimeHours: 168, latencyMs: 4 },
  { name: "realtime-service", kind: "backend", port: 4006, status: "ONLINE", memoryMb: 51, cpuPct: 2.1, uptimeHours: 168, latencyMs: 2 },
  { name: "audit-service", kind: "backend", port: 4007, status: "ONLINE", memoryMb: 32, cpuPct: 0.5, uptimeHours: 168, latencyMs: 3 },
  { name: "apps/admin-portal", kind: "frontend", port: 3000, status: "ONLINE", memoryMb: 112, cpuPct: 3.2, uptimeHours: 168, latencyMs: 8 },
  { name: "apps/it-desk", kind: "frontend", port: 3001, status: "ONLINE", memoryMb: 94, cpuPct: 2.8, uptimeHours: 168, latencyMs: 7 },
  { name: "apps/web-public", kind: "frontend", port: 3002, status: "ONLINE", memoryMb: 104, cpuPct: 3.5, uptimeHours: 168, latencyMs: 9 },
];

const ENV_VARIABLES_AUDIT = [
  { key: "DATABASE_URL", isSecret: true, configured: true, redacted: "postgres://platform_app:***@localhost:5432/platform_db" },
  { key: "DATABASE_POOL_MAX", isSecret: false, configured: true, redacted: "40" },
  { key: "REDIS_URL", isSecret: true, configured: true, redacted: "redis://default:***@localhost:6379" },
  { key: "JWT_ISSUER", isSecret: false, configured: true, redacted: "platform.identity" },
  { key: "JWT_PRIVATE_KEY", isSecret: true, configured: true, redacted: "ED25519:***[32 bytes]" },
  { key: "S3_BUCKET_NAME", isSecret: false, configured: true, redacted: "platform-media-vault" },
  { key: "S3_ACCESS_KEY_ID", isSecret: true, configured: true, redacted: "AKIA***42" },
  { key: "RESEND_API_KEY", isSecret: true, configured: true, redacted: "re_***99" },
  { key: "PAYTABS_SERVER_KEY", isSecret: true, configured: true, redacted: "SK_***7A" },
  { key: "META_APP_SECRET", isSecret: true, configured: true, redacted: "sec_***1F" },
  { key: "TELEMETRY_LOG_LEVEL", isSecret: false, configured: true, redacted: "INFO" },
  { key: "CORS_ALLOWED_ORIGINS", isSecret: false, configured: true, redacted: "https://example.com, https://admin.example.com" },
];

export function DeploymentsView() {
  const { copy } = useCopy();
  const dep = copy.deployments;
  const [refreshing, setRefreshing] = React.useState(false);
  const [criticalAction, setCriticalAction] = React.useState<{
    title: string;
    description: string;
    impact: string[];
    confirmWord: string;
  } | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedKind, setSelectedKind] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Deployment telemetry refreshed");
    }, 450);
  };

  const executeCritical = async () => {
    if (!criticalAction) return;
    setActionBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success(`Action successfully executed: ${criticalAction.title}`);
      setCriticalAction(null);
    } catch {
      toast.error("Failed to complete action");
    } finally {
      setActionBusy(false);
    }
  };

  const filteredServices = React.useMemo(() => {
    return SERVICES_RUNTIME.filter((srv) => {
      if (searchQuery.trim() && !srv.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedKind && srv.kind !== selectedKind) return false;
      if (selectedStatus && srv.status !== selectedStatus) return false;
      return true;
    });
  }, [searchQuery, selectedKind, selectedStatus]);

  const filteredEnv = React.useMemo(() => {
    if (!searchQuery.trim()) return ENV_VARIABLES_AUDIT;
    const q = searchQuery.toLowerCase();
    return ENV_VARIABLES_AUDIT.filter((env) => env.key.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle
          title={dep.title}
          description={dep.description}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
        <div className="it-card p-3 border-l-4 border-l-emerald-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">ENVIRONMENT</div>
          <div className="text-lg font-bold text-ink">PRODUCTION</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">CLUSTER: BH-MANAMA-01</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-sky-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">RELEASE COMMIT</div>
          <div className="text-lg font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
            <GitCommit className="h-4 w-4" />
            <span>9f8e21a</span>
          </div>
          <div className="text-[10px] text-ink-muted">BUILD: 2026-11-08 18:20 UTC</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-indigo-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">TOTAL MEMORY USED</div>
          <div className="text-lg font-bold text-ink">602 MB</div>
          <div className="text-[10px] text-ink-muted">10 PROCESSES RUNNING</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-amber-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">AVERAGE LATENCY</div>
          <div className="text-lg font-bold text-ink">5.1 ms</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">INTERNAL HTTP MESH</div>
        </div>
      </div>

      <Card className="it-card p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              DEPLOYMENT & CLUSTER CONTROL ACTIONS
            </h2>
          </div>
          <span className="it-badge it-badge-warn">ATTENTION GUARDED</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() =>
              setCriticalAction({
                title: dep.purgeConfirmTitle,
                description: dep.purgeConfirmDesc,
                impact: [dep.purgeImpact1, dep.purgeImpact2],
                confirmWord: "PURGE",
              })
            }
            className="it-btn-3d py-1 px-3 font-mono text-xs"
          >
            PURGE CACHE...
          </button>

          <button
            type="button"
            onClick={() =>
              setCriticalAction({
                title: dep.reconnectConfirmTitle,
                description: dep.reconnectConfirmDesc,
                impact: [dep.reconnectImpact1, dep.reconnectImpact2],
                confirmWord: "RECONNECT",
              })
            }
            className="it-btn-3d py-1 px-3 font-mono text-xs"
          >
            RECONNECT REALTIME DAEMON...
          </button>

          <button
            type="button"
            onClick={() =>
              setCriticalAction({
                title: dep.maintenanceConfirmTitle,
                description: dep.maintenanceConfirmDesc,
                impact: [dep.maintenanceImpact1, dep.maintenanceImpact2],
                confirmWord: "MAINTENANCE",
              })
            }
            className="it-btn-3d py-1 px-3 font-mono text-xs text-rose-700 dark:text-rose-400 font-bold"
          >
            TOGGLE MAINTENANCE MODE...
          </button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={dep.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="it-field-sunken w-full pl-7 pr-7 py-1 text-xs font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="size-3.5 text-slate-400" />
          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{dep.filterKind}: {dep.filterAll}</option>
            <option value="backend">backend</option>
            <option value="frontend">frontend</option>
            <option value="worker">worker</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{dep.filterStatus}: {dep.filterAll}</option>
            <option value="ONLINE">ONLINE</option>
            <option value="STANDBY">STANDBY</option>
            <option value="FAULT">FAULT</option>
          </select>
        </div>
        {(searchQuery || selectedKind || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedKind("");
              setSelectedStatus("");
            }}
            className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
          >
            Clear
          </button>
        )}
      </div>

      <Card className="it-card p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dep.clusterTitle}
            </h2>
          </div>
          <span className="it-badge it-badge-active">ALL NODES HEALTHY</span>
        </div>

        <div className="overflow-x-auto">
          <table className="it-table w-full">
            <thead>
              <tr>
                <th>SERVICE / SUBSYSTEM</th>
                <th>KIND</th>
                <th>PORT</th>
                <th>STATUS</th>
                <th className="text-end">MEMORY</th>
                <th className="text-end">CPU</th>
                <th className="text-end">UPTIME</th>
                <th className="text-end">LATENCY</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((srv) => (
                <tr key={srv.name}>
                  <td className="font-bold text-ink">[{srv.name}]</td>
                  <td className="uppercase text-ink-muted">{srv.kind}</td>
                  <td>{srv.port}</td>
                  <td>
                    <span className="it-badge it-badge-active">{srv.status}</span>
                  </td>
                  <td className="text-end font-mono">{srv.memoryMb} MB</td>
                  <td className="text-end font-mono">{srv.cpuPct}%</td>
                  <td className="text-end font-mono">{srv.uptimeHours} hrs</td>
                  <td className="text-end font-mono text-emerald-600 dark:text-emerald-400">
                    {srv.latencyMs} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="it-card p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dep.envAuditTitle}
            </h2>
          </div>
          <span className="it-badge it-badge-neutral">REDACTED SECURE VIEW</span>
        </div>

        <p className="text-xs text-ink-muted font-sans">
          Verifies that essential platform environment variables are bound in the runtime container without revealing confidential keys or credentials.
        </p>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="it-table w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>VARIABLE KEY</th>
                <th>TYPE</th>
                <th>PRESENCE</th>
                <th>REDACTED VALUE PREVIEW</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnv.map((env) => (
                <tr key={env.key}>
                  <td className="font-bold text-ink">{env.key}</td>
                  <td>
                    <span className={`it-badge ${env.isSecret ? "it-badge-warn" : "it-badge-neutral"}`}>
                      {env.isSecret ? "SECRET" : "CONFIG"}
                    </span>
                  </td>
                  <td>
                    <span className="it-badge it-badge-active">CONFIGURED</span>
                  </td>
                  <td className="text-ink-muted select-all">{env.redacted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {criticalAction && (
        <CriticalActionModal
          open={Boolean(criticalAction)}
          title={criticalAction.title}
          description={criticalAction.description}
          impactDetails={criticalAction.impact}
          requiredConfirmationText={criticalAction.confirmWord}
          confirmLabel="Execute Operation"
          dangerLevel="warning"
          busy={actionBusy}
          onConfirm={executeCritical}
          onCancel={() => setCriticalAction(null)}
        />
      )}
    </div>
  );
}
