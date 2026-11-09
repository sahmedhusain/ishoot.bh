"use client";

import * as React from "react";
import { formatMessage } from "@platform/locales";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  Terminal,
  Trash2,
  Plus,
  Loader2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Download,
  ShieldAlert,
  Info,
  AlertTriangle,
  XCircle,
  FileCode,
  X,
} from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import type { RuntimeConfig } from "@platform/api-client";
import {
  setDebugToggleAction,
  removeDebugToggleAction,
} from "../app/(desk)/logs/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { type LogEntry, type LogLevel } from "../lib/logger-queue";

type TimeRange = "15m" | "1h" | "24h" | "7d" | "all";
type SortField = "timestamp" | "severity" | "duration";
type SortDirection = "asc" | "desc";

export function LogsView({
  config,
  canEdit,
}: {
  config: RuntimeConfig | null;
  canEdit: boolean;
}) {
  const { copy, date } = useCopy();
  const l = copy.logs;
  const router = useRouter();

  // Observable External Search Queries
  const [traceId, setTraceId] = React.useState("");
  const [logQuery, setLogQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // In-App Log Telemetry State
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [bufferSize, setBufferSize] = React.useState(0);

  // Filters & Sorting
  const [timeRange, setTimeRange] = React.useState<TimeRange>("24h");
  const [selectedUser, setSelectedUser] = React.useState<string>("");
  const [selectedLevel, setSelectedLevel] = React.useState<string>("ALL");
  const [selectedService, setSelectedService] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [sortBy, setSortBy] = React.useState<SortField>("timestamp");
  const [sortDir, setSortDir] = React.useState<SortDirection>("desc");

  // Real-time Auto-refresh
  const [autoRefreshInterval, setAutoRefreshInterval] = React.useState<number>(0);
  const [inspectLog, setInspectLog] = React.useState<LogEntry | null>(null);

  // Debug Toggle form state
  const [toggleService, setToggleService] = React.useState("identity");
  const [toggleLevel, setToggleLevel] = React.useState("debug");
  const [toggleTTL, setToggleTTL] = React.useState(15);

  // Fetch logs from API
  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        timeRange,
        sortBy,
        sortDir,
      });
      if (selectedUser.trim()) params.set("user", selectedUser.trim());
      if (selectedLevel !== "ALL") params.set("level", selectedLevel);
      if (selectedService !== "all") params.set("service", selectedService);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      setLogs(data.items || []);
      setBufferSize(data.bufferSize || 0);
    } catch {
      toast.error(l.fetchFailed);
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedUser, selectedLevel, selectedService, searchQuery, sortBy, sortDir, l.fetchFailed]);

  // Initial load and dependency trigger
  React.useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh interval listener
  React.useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      void fetchLogs();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchLogs]);

  // Export handlers
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `it_system_logs_${timeRange}_${new Date().toISOString().substring(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(l.exportedJson);
  };

  const exportCsv = () => {
    const headers = ["Timestamp", "Level", "Service", "User", "Action", "DurationMs", "TraceId", "Message"];
    const rows = logs.map((item) => [
      item.timestamp,
      item.level,
      item.service,
      `"${item.user}"`,
      `"${item.action}"`,
      item.durationMs ?? 0,
      `"${item.traceId ?? ""}"`,
      `"${(item.message || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `it_system_logs_${timeRange}_${new Date().toISOString().substring(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(l.exportedCsv);
  };

  const handleAddToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    try {
      await setDebugToggleAction(toggleService, toggleLevel, toggleTTL);
      toast.success(l.toggleAdded);
      router.refresh();
    } catch {
      toast.error(l.toggleFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveToggle = async (service: string) => {
    setBusy(true);
    try {
      await removeDebugToggleAction(service);
      toast.success(l.toggleRemoved);
      router.refresh();
    } catch {
      toast.error(l.toggleFailed);
    } finally {
      setBusy(false);
    }
  };

  const openLoki = (e: React.FormEvent) => {
    e.preventDefault();
    const query = logQuery.trim() ? `{service=~".+"} |= "${logQuery.trim()}"` : `{service=~".+"}`;
    window.open(`/explore?left=${encodeURIComponent(JSON.stringify({ datasource: "loki", queries: [{ expr: query }] }))}`, "_blank");
  };

  const openTempo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceId.trim()) return;
    window.open(`/explore?left=${encodeURIComponent(JSON.stringify({ datasource: "tempo", queries: [{ query: traceId.trim() }] }))}`, "_blank");
  };

  // Metrics summary
  const errorCount = React.useMemo(() => logs.filter((x) => x.level === "ERROR" || x.level === "FATAL").length, [logs]);
  const warnCount = React.useMemo(() => logs.filter((x) => x.level === "WARN").length, [logs]);
  const uniqueUsers = React.useMemo(() => Array.from(new Set(logs.map((x) => x.user))).filter(Boolean), [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle
          title={l.title}
          description={l.description}
        />

        {/* Telemetry Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="it-btn-3d flex items-center gap-1.5 font-mono text-xs py-1 px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{l.fetchNow}</span>
          </button>

          <button
            type="button"
            onClick={exportJson}
            className="it-btn-3d flex items-center gap-1.5 font-mono text-xs py-1 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{l.exportJson}</span>
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="it-btn-3d flex items-center gap-1.5 font-mono text-xs py-1 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{l.exportCsv}</span>
          </button>
        </div>
      </div>

      {/* SAP / Oracle Status Telemetry Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
        <div className="it-card p-3 border-l-4 border-l-sky-500">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{l.totalInView}</div>
          <div className="text-lg font-bold text-ink">{logs.length}</div>
          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">{l.bufferSlots}: {bufferSize}</div>
        </div>

        <div className={`it-card p-3 border-l-4 ${errorCount > 0 ? "border-l-rose-500 bg-rose-500/5" : "border-l-emerald-500"}`}>
          <div className="text-[10px] text-ink-muted uppercase font-bold">{l.levelFatal} / {l.levelError}</div>
          <div className={`text-lg font-bold ${errorCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {errorCount}
          </div>
          <div className="text-[10px] text-ink-muted font-mono">ERRORS DETECTED</div>
        </div>

        <div className={`it-card p-3 border-l-4 ${warnCount > 0 ? "border-l-amber-500 bg-amber-500/5" : "border-l-slate-400"}`}>
          <div className="text-[10px] text-ink-muted uppercase font-bold">{l.levelWarn}</div>
          <div className={`text-lg font-bold ${warnCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-ink"}`}>
            {warnCount}
          </div>
          <div className="text-[10px] text-ink-muted font-mono">WARNINGS / LATENCY</div>
        </div>

        <div className="it-card p-3 border-l-4 border-l-indigo-500">
          <div className="text-[10px] text-ink-muted uppercase font-bold">{l.queueStatus}</div>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">ACTIVE</div>
          <div className="text-[10px] text-ink-muted">{l.batchFlushActive}</div>
        </div>
      </div>

      {/* Enterprise Filter Control Bar */}
      <div className="it-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-ink">
            <Filter className="h-3.5 w-3.5 text-amber-600" />
            <span>{l.filterCriteria}</span>
          </div>

          {/* Auto Refresh Setting */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-ink-muted font-bold">{l.autoFetch}:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value, 10))}
              className="it-field-sunken"
            >
              <option value={0}>{l.off}</option>
              <option value={5}>{l.every5s}</option>
              <option value={15}>{l.every15s}</option>
              <option value={30}>{l.every30s}</option>
              <option value={60}>{l.every60s}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs font-mono">
          {/* 1. Time Range Dropdown */}
          <div>
            <label className="block text-[10px] uppercase text-ink-muted mb-1 font-bold">{l.timeWindow}</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="it-field-sunken w-full"
            >
              <option value="15m">{l.time15m}</option>
              <option value="1h">{l.time1h}</option>
              <option value="24h">{l.time24h}</option>
              <option value="7d">{l.time7d}</option>
              <option value="all">{l.timeAll}</option>
            </select>
          </div>

          {/* 2. User Filter (Specific user logging inspection) */}
          <div>
            <label className="block text-[10px] uppercase text-ink-muted mb-1 font-bold">{l.userActor}</label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder={l.userPlaceholder}
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="it-field-sunken w-full"
              />
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => setSelectedUser("")}
                  className="it-btn-3d px-1.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 3. Severity Level */}
          <div>
            <label className="block text-[10px] uppercase text-ink-muted mb-1 font-bold">{l.logLevel}</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="ALL">{l.allLevels}</option>
              <option value="FATAL">{l.levelFatal}</option>
              <option value="ERROR">{l.levelError}</option>
              <option value="WARN">{l.levelWarn}</option>
              <option value="INFO">{l.levelInfo}</option>
              <option value="DEBUG">{l.levelDebug}</option>
            </select>
          </div>

          {/* 4. Service */}
          <div>
            <label className="block text-[10px] uppercase text-ink-muted mb-1 font-bold">{l.service}</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="all">{l.allServices}</option>
              <option value="identity">IDENTITY</option>
              <option value="system">SYSTEM</option>
              <option value="itsm">ITSM</option>
              <option value="files">FILES</option>
              <option value="notify">NOTIFY</option>
              <option value="realtime">REALTIME</option>
              <option value="audit">AUDIT</option>
              <option value="frontend/admin">FRONTEND/ADMIN</option>
              <option value="frontend/it">FRONTEND/IT</option>
            </select>
          </div>

          {/* 5. Sort By */}
          <div>
            <label className="block text-[10px] uppercase text-ink-muted mb-1 font-bold">{l.sortBy}</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="it-field-sunken flex-1"
              >
                <option value="timestamp">{l.sortTimestamp}</option>
                <option value="severity">{l.sortSeverity}</option>
                <option value="duration">{l.sortDuration}</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="it-btn-3d px-2 font-bold"
                title={sortDir === "asc" ? l.sortAsc : l.sortDesc}
              >
                {sortDir === "asc" ? "▲" : "▼"}
              </button>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative pt-1">
          <input
            type="text"
            placeholder={l.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="it-field-sunken w-full ps-8 pe-3 py-1.5"
          />
          <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-ink-muted" />
        </div>
      </div>

      {/* In-App Log Stream Table */}
      <Card className="it-card overflow-hidden">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="it-table w-full font-mono text-xs">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-44">TIMESTAMP (UTC)</th>
                <th className="w-20">LEVEL</th>
                <th className="w-28">SERVICE</th>
                <th className="w-48">USER / ACTOR</th>
                <th className="w-40">ACTION</th>
                <th className="w-20 text-end">TIME</th>
                <th>MESSAGE</th>
                <th className="w-16 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
                    <span>{copy.shared.ui.loading}</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-ink-muted">
                    {copy.sessions.empty}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const levelBadgeClass =
                    log.level === "FATAL" || log.level === "ERROR"
                      ? "it-badge-error"
                      : log.level === "WARN"
                        ? "it-badge-warn"
                        : log.level === "INFO"
                          ? "it-badge-active"
                          : "it-badge-neutral";

                  return (
                    <tr
                      key={log.id}
                      className="cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors"
                      onClick={() => setInspectLog(log)}
                    >
                      <td className="text-ink-muted text-[11px] whitespace-nowrap">
                        {log.timestamp.replace("T", " ").replace("Z", "")}
                      </td>

                      <td>
                        <span className={`it-badge ${levelBadgeClass}`}>
                          {log.level}
                        </span>
                      </td>

                      <td className="font-semibold text-slate-700 dark:text-slate-300">
                        [{log.service}]
                      </td>

                      <td className="text-slate-600 dark:text-slate-400 truncate max-w-[190px]" title={log.user}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(log.user);
                          }}
                          className="hover:underline hover:text-sky-600 text-start"
                        >
                          {log.user}
                        </button>
                      </td>

                      <td className="font-semibold text-ink text-[11px] truncate max-w-[160px]">
                        {log.action}
                      </td>

                      <td className="text-end font-mono text-[11px]">
                        {log.durationMs !== undefined ? (
                          <span className={log.durationMs > 250 ? "text-amber-600 font-bold" : "text-ink-muted"}>
                            {log.durationMs}ms
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="text-ink truncate max-w-[420px]" title={log.message}>
                        {log.message}
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectLog(log);
                          }}
                          className="px-2 py-0.5 border border-outline-variant text-[10px] bg-surface hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          VIEW
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Detail Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="it-card w-full max-w-3xl max-h-[85vh] flex flex-col bg-surface overflow-hidden border-2 border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant bg-slate-900 px-4 py-3 text-white font-mono">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileCode className="h-4 w-4 text-amber-400" />
                <span>DIAGNOSTIC ENTRY: {inspectLog.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-950/60 p-3 border border-outline-variant">
                <div>
                  <div className="text-[10px] text-ink-muted">TIMESTAMP</div>
                  <div className="font-bold text-ink">{inspectLog.timestamp}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ink-muted">LEVEL</div>
                  <div className="font-bold text-ink">{inspectLog.level}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ink-muted">SERVICE</div>
                  <div className="font-bold text-ink">{inspectLog.service}</div>
                </div>
                <div>
                  <div className="text-[10px] text-ink-muted">DURATION</div>
                  <div className="font-bold text-ink">{inspectLog.durationMs ? `${inspectLog.durationMs}ms` : "N/A"}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-ink-muted mb-1">USER / CALLER IDENTITY</div>
                <div className="p-2 border border-outline-variant bg-surface font-semibold text-ink">
                  {inspectLog.user}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-ink-muted mb-1">MESSAGE / PAYLOAD SUMMARY</div>
                <div className="p-2.5 border border-outline-variant bg-surface text-ink font-semibold">
                  {inspectLog.message}
                </div>
              </div>

              {inspectLog.traceId && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-ink-muted mb-1">DISTRIBUTED TRACE ID</div>
                  <div className="p-2 border border-outline-variant bg-surface text-sky-600 dark:text-sky-400 select-all">
                    {inspectLog.traceId}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold uppercase text-ink-muted mb-1">STRUCTURED METADATA & HEADERS (JSON)</div>
                <pre className="p-3 border border-outline-variant bg-slate-950 text-emerald-400 overflow-x-auto text-[11px] select-all">
                  {JSON.stringify(
                    {
                      id: inspectLog.id,
                      timestamp: inspectLog.timestamp,
                      level: inspectLog.level,
                      service: inspectLog.service,
                      user: inspectLog.user,
                      action: inspectLog.action,
                      ipAddress: inspectLog.ipAddress,
                      userAgent: inspectLog.userAgent,
                      metadata: inspectLog.metadata,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-outline-variant bg-surface p-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectLog, null, 2));
                  toast.success("Log copied to clipboard");
                }}
              >
                Copy JSON
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setInspectLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Observability External Integrations (Loki & Tempo) */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="it-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold uppercase font-mono">{l.lokiTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{l.lokiSubtitle}</p>
          <form onSubmit={openLoki} className="flex gap-2">
            <Input
              placeholder={l.lokiPlaceholder}
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              className="flex-1 text-xs font-mono"
            />
            <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1 font-mono text-xs">
              <span>{l.explore}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </form>
        </Card>

        <Card className="it-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold uppercase font-mono">{l.tempoTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{l.tempoSubtitle}</p>
          <form onSubmit={openTempo} className="flex gap-2">
            <Input
              placeholder={l.tempoPlaceholder}
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              className="flex-1 text-xs font-mono"
            />
            <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1 font-mono text-xs">
              <span>{l.trace}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </form>
        </Card>
      </div>

      {/* Dynamic Backend Debug Toggles */}
      <Card className="it-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant pb-2">
          <div>
            <h2 className="text-sm font-bold uppercase font-mono">{l.togglesTitle}</h2>
            <p className="text-xs text-ink-muted">{l.togglesSubtitle}</p>
          </div>
        </div>

        {canEdit && (
          <form
            onSubmit={handleAddToggle}
            className="flex flex-wrap items-end gap-3 bg-slate-100 dark:bg-slate-900/60 p-3 border border-outline-variant text-xs font-mono"
          >
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase text-ink-muted">{l.service}</span>
              <select
                value={toggleService}
                onChange={(e) => setToggleService(e.target.value)}
                className="block w-40 border border-outline-variant bg-surface px-2 py-1.5 text-xs font-mono"
              >
                {["identity", "system", "itsm", "files", "notify", "realtime", "audit"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase text-ink-muted">{l.logLevel}</span>
              <select
                value={toggleLevel}
                onChange={(e) => setToggleLevel(e.target.value)}
                className="block w-32 border border-outline-variant bg-surface px-2 py-1.5 text-xs font-mono"
              >
                <option value="debug">{l.levels.debug}</option>
                <option value="info">{l.levels.info}</option>
                <option value="warn">{l.levels.warn}</option>
                <option value="error">{l.levels.error}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase text-ink-muted">{l.duration}</span>
              <select
                value={toggleTTL}
                onChange={(e) => setToggleTTL(parseInt(e.target.value, 10))}
                className="block w-36 border border-outline-variant bg-surface px-2 py-1.5 text-xs font-mono"
              >
                <option value={15}>{formatMessage(l.ttl15m, { minutes: 15 })}</option>
                <option value={30}>{formatMessage(l.ttl30m, { minutes: 30 })}</option>
                <option value={60}>{formatMessage(l.ttl1h, { hours: 1 })}</option>
                <option value={1440}>{formatMessage(l.ttl24h, { hours: 24 })}</option>
              </select>
            </label>

            <Button
              type="submit"
              disabled={busy}
              size="sm"
              className="flex items-center gap-1.5 font-mono text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{l.addToggle}</span>
            </Button>
          </form>
        )}

        <div className="space-y-2 font-mono text-xs">
          {!config?.debugToggles?.length ? (
            <p className="text-xs text-ink-muted py-4 text-center">
              {l.noActiveToggles}
            </p>
          ) : (
            config.debugToggles.map((toggle) => (
              <div
                key={toggle.id}
                className="flex items-center justify-between border border-outline-variant bg-surface p-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-ink">
                      {toggle.service}
                    </span>
                    <span className="it-badge it-badge-warn">
                      {toggle.logLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    {l.expiresAt}: {date(toggle.expiresAt)} • {l.enabledBy}: {toggle.enabledBy}
                  </p>
                </div>

                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveToggle(toggle.service)}
                    disabled={busy}
                    className="text-xs text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{l.remove}</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
