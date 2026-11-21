"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  GitBranch,
  GitCommit,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { Card, Input } from "@platform/ui";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import type { ServiceHealth } from "@platform/api-client";
import {
  revalidateFrontendCacheAction,
  type RevalidationTargetResult,
} from "../app/(desk)/deployments/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export interface RuntimeOverview {
  environment: string;
  orchestrator: string;
  hostname: string;
  gitSha: string;
  gitBranch?: string;
  gitCommitDate?: string;
  memoryMb: number;
  uptimeMinutes: number;
  checkedAt: string;
}

export interface EnvAuditItem {
  key: string;
  isSecret: boolean;
  present: boolean;
  redacted: string;
}

export interface ParityCheckItem {
  key: string;
  status: "ok" | "warn" | "missing";
  detail: string;
}

export function DeploymentsView({
  services,
  runtime,
  envAudit,
  parityChecks = [],
  canRevalidate = false,
}: {
  services: ServiceHealth[];
  runtime: RuntimeOverview;
  envAudit: EnvAuditItem[];
  parityChecks?: ParityCheckItem[];
  canRevalidate?: boolean;
}) {
  const { copy, date } = useCopy();
  const dep = copy.deployments;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");

  const [revalPaths, setRevalPaths] = React.useState("/");
  const [revalTags, setRevalTags] = React.useState("website,company");
  const [revalidating, setRevalidating] = React.useState(false);
  const [revalResults, setRevalResults] = React.useState<RevalidationTargetResult[]>([]);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleRevalidate = async (target: "web" | "store" | "all") => {
    setRevalidating(true);
    try {
      const paths = revalPaths
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const tags = revalTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await revalidateFrontendCacheAction(target, paths, tags);
      setRevalResults(res.results);
      const ok = res.results.filter((r) => r.ok).length;
      if (ok === res.results.length) {
        toast.success(
          formatMessage(dep.revalidationSuccess, { ok, total: res.results.length }),
        );
      } else {
        toast.error(dep.revalidationFailed);
      }
    } catch {
      toast.error(dep.revalidationFailed);
    } finally {
      setRevalidating(false);
    }
  };

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const avgLatency =
    services.length > 0
      ? (
          services.reduce((sum, s) => sum + (Number(s.latencyMs) || 0), 0) /
          services.length
        ).toFixed(1)
      : "0.0";

  const filteredServices = React.useMemo(() => {
    return services.filter((srv) => {
      if (selectedStatus && srv.status !== selectedStatus) return false;
      if (
        searchQuery.trim() &&
        !srv.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [services, searchQuery, selectedStatus]);

  const filteredEnv = React.useMemo(() => {
    if (!searchQuery.trim()) return envAudit;
    const q = searchQuery.toLowerCase();
    return envAudit.filter((env) => env.key.toLowerCase().includes(q));
  }, [envAudit, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle title={dep.title} description={dep.description} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
        <div className="it-card p-3 border-l-4 border-l-emerald-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">ENVIRONMENT</div>
          <div className="text-lg font-bold text-ink">{runtime.environment}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {runtime.orchestrator} ({runtime.hostname})
          </div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-sky-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">
            RELEASE COMMIT
          </div>
          <div className="text-lg font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
            <GitCommit className="h-4 w-4 shrink-0" />
            <span className="truncate">{runtime.gitSha}</span>
          </div>
          <div className="text-[10px] text-ink-muted flex items-center gap-1 truncate">
            {runtime.gitBranch && (
              <>
                <GitBranch className="h-3 w-3 shrink-0" />
                <span>{runtime.gitBranch}</span>
                <span>·</span>
              </>
            )}
            <span>CHECKED: {date(runtime.checkedAt)}</span>
          </div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-indigo-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">
            IT PORTAL RSS MEMORY
          </div>
          <div className="text-lg font-bold text-ink">{runtime.memoryMb} MB</div>
          <div className="text-[10px] text-ink-muted">
            UPTIME: {runtime.uptimeMinutes} MIN · {services.length} SERVICES
          </div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-amber-500 bg-surface">
          <div className="text-[10px] text-ink-muted uppercase">
            AVERAGE MESH LATENCY
          </div>
          <div className="text-lg font-bold text-ink">{avgLatency} ms</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {healthyCount}/{services.length} SERVICES HEALTHY
          </div>
        </div>
      </div>

      {canRevalidate && (
        <Card className="it-card p-5 space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-2">
            <div>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-ink">
                <Zap className="h-4 w-4 text-amber-500" />
                <h2>{dep.revalidationTitle}</h2>
              </div>
              <p className="text-[11px] text-ink-muted font-sans mt-0.5">{dep.revalidationDesc}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={revalidating}
                onClick={() => void handleRevalidate("web")}
                className="it-btn-3d py-1.5 px-3 text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1"
              >
                {revalidating && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{dep.revalidateWeb}</span>
              </button>
              <button
                type="button"
                disabled={revalidating}
                onClick={() => void handleRevalidate("store")}
                className="it-btn-3d py-1.5 px-3 text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1"
              >
                {revalidating && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{dep.revalidateStore}</span>
              </button>
              <button
                type="button"
                disabled={revalidating}
                onClick={() => void handleRevalidate("all")}
                className="it-btn-3d py-1.5 px-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1"
              >
                {revalidating && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{dep.revalidateAll}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase text-ink-muted">
                {dep.revalidationPathsLabel}
              </span>
              <input
                type="text"
                value={revalPaths}
                onChange={(e) => setRevalPaths(e.target.value)}
                dir="ltr"
                className="it-field-sunken w-full px-2.5 py-1.5 text-xs font-mono"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase text-ink-muted">
                {dep.revalidationTagsLabel}
              </span>
              <input
                type="text"
                value={revalTags}
                onChange={(e) => setRevalTags(e.target.value)}
                dir="ltr"
                className="it-field-sunken w-full px-2.5 py-1.5 text-xs font-mono"
              />
            </label>
          </div>

          {revalResults.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {revalResults.map((r) => (
                <div
                  key={`${r.target}:${r.url}`}
                  className={`px-2.5 py-1 border text-[11px] flex items-center gap-2 ${
                    r.ok
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                      : "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <span className="font-bold uppercase">{r.target}</span>
                  <span>{r.ok ? `HTTP ${r.status}` : r.error || `HTTP ${r.status}`}</span>
                  <span className="text-ink-muted">{r.durationMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {parityChecks.length > 0 && (
        <Card className="it-card p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                {dep.parityTitle}
              </h2>
            </div>
            <span className="it-badge it-badge-neutral">
              {parityChecks.filter((p) => p.status === "ok").length}/{parityChecks.length} OK
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {parityChecks.map((check) => (
              <div key={check.key} className="p-2.5 border border-outline-variant bg-surface space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink text-[11px]">{check.key}</span>
                  <span
                    className={`it-badge text-[10px] ${
                      check.status === "ok"
                        ? "it-badge-active"
                        : check.status === "warn"
                          ? "it-badge-warn"
                          : "it-badge-error"
                    }`}
                  >
                    {check.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted truncate" title={check.detail}>
                  {check.detail}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2 bg-surface-sunken p-2 border border-slate-300 dark:border-slate-700">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-ink-muted absolute start-2.5 top-2.5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={dep.searchPlaceholder}
            className="it-field-sunken ps-8 text-xs font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-2 top-2 text-ink-muted hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="it-field-sunken text-xs font-mono py-1"
        >
          <option value="">
            {dep.filterStatus}: {dep.filterAll}
          </option>
          <option value="healthy">healthy</option>
          <option value="degraded">degraded</option>
          <option value="down">down</option>
        </select>
      </div>

      <Card className="it-card p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-sky-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
              {dep.clusterTitle}
            </h2>
          </div>
          <span
            className={`it-badge ${
              services.length > 0 && healthyCount === services.length
                ? "it-badge-active"
                : "it-badge-warn"
            }`}
          >
            {healthyCount}/{services.length} HEALTHY
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="it-table w-full">
            <thead>
              <tr>
                <th>SERVICE / SUBSYSTEM</th>
                <th>STATUS</th>
                <th className="text-end">LATENCY</th>
                <th className="text-end">LAST CHECK</th>
                <th>DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-ink-muted">
                    No matching service health probes returned.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.name}>
                    <td className="font-bold text-ink">[{srv.name}]</td>
                    <td>
                      <span
                        className={`it-badge ${
                          srv.status === "healthy"
                            ? "it-badge-active"
                            : "it-badge-warn"
                        }`}
                      >
                        {srv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-end font-mono text-emerald-600 dark:text-emerald-400">
                      {srv.latencyMs} ms
                    </td>
                    <td className="text-end font-mono text-ink-muted">
                      {date(srv.checkedAt)}
                    </td>
                    <td className="text-rose-600 dark:text-rose-400">
                      {srv.error || "OK"}
                    </td>
                  </tr>
                ))
              )}
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
          <span className="it-badge it-badge-neutral flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            REDACTED SECURE VIEW
          </span>
        </div>

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
                    <span
                      className={`it-badge ${
                        env.isSecret ? "it-badge-warn" : "it-badge-neutral"
                      }`}
                    >
                      {env.isSecret ? "SECRET" : "CONFIG"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`it-badge ${
                        env.present ? "it-badge-active" : "it-badge-neutral"
                      }`}
                    >
                      {env.present ? "CONFIGURED" : "UNSET"}
                    </span>
                  </td>
                  <td className="text-ink-muted select-all">{env.redacted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="it-card p-4 font-mono text-xs flex flex-wrap items-center justify-between gap-2 text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-500" />
          IaC manifests: <code className="text-ink">infra/terraform/*.tf</code> &{" "}
          <code className="text-ink">infra/k8s/*.yaml</code>
        </span>
        <span>ORCHESTRATOR: {runtime.orchestrator}</span>
      </Card>
    </div>
  );
}
