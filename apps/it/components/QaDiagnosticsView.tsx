"use client";

import * as React from "react";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import {
  CheckCircle2,
  Clipboard,
  FlaskConical,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Square,
  Terminal,
  Trash2,
  XCircle,
} from "lucide-react";
import type {
  LogAuditReportSummary,
  QaManifestSummary,
  QaRunRecord,
  QaSuiteDefinition,
  QaSuiteKey,
} from "../lib/qa-runner";
import { useCopy } from "./CopyProvider";
import { CriticalActionModal } from "./CriticalActionModal";
import { PageTitle } from "./ticket-ui";

type QaTab = "runner" | "manifest" | "audit" | "history";

export interface QaDiagnosticsViewProps {
  enabled: boolean;
  canExecute: boolean;
  initialActiveRunId: string | null;
  suites: readonly QaSuiteDefinition[];
  initialManifest: QaManifestSummary | null;
  initialLogAudit: LogAuditReportSummary | null;
  initialHistory: QaRunRecord[];
}

export function QaDiagnosticsView({
  enabled: initialEnabled,
  canExecute: initialCanExecute,
  initialActiveRunId,
  suites: initialSuites,
  initialManifest,
  initialLogAudit,
  initialHistory,
}: QaDiagnosticsViewProps) {
  const { copy, date } = useCopy();
  const q = copy.qa;

  const [tab, setTab] = React.useState<QaTab>("runner");
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [canExecute, setCanExecute] = React.useState(initialCanExecute);
  const [suites, setSuites] = React.useState<readonly QaSuiteDefinition[]>(initialSuites);
  const [manifest, setManifest] = React.useState<QaManifestSummary | null>(initialManifest);
  const [logAudit, setLogAudit] = React.useState<LogAuditReportSummary | null>(initialLogAudit);
  const [history, setHistory] = React.useState<QaRunRecord[]>(initialHistory);
  const [activeRunId, setActiveRunId] = React.useState<string | null>(initialActiveRunId);
  const [inspectedRun, setInspectedRun] = React.useState<QaRunRecord | null>(
    () =>
      initialHistory.find((r) => r.id === initialActiveRunId) ??
      initialHistory[0] ??
      null,
  );
  const [refreshing, setRefreshing] = React.useState(false);
  const [startingSuite, setStartingSuite] = React.useState<string | null>(null);
  const [rotateConfirmOpen, setRotateConfirmOpen] = React.useState(false);
  const [manifestAppFilter, setManifestAppFilter] = React.useState<string>("all");
  const [manifestQuery, setManifestQuery] = React.useState<string>("");

  const esRef = React.useRef<EventSource | null>(null);

  const fetchStatus = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/qa/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEnabled(Boolean(data.enabled));
      setCanExecute(Boolean(data.canExecute));
      if (Array.isArray(data.suites)) setSuites(data.suites);
      setManifest(data.manifest ?? null);
      setLogAudit(data.logAudit ?? null);
      if (Array.isArray(data.history)) {
        setHistory(data.history);
      }
      setActiveRunId(data.activeRunId ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh QA status");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const attachStream = React.useCallback(
    (runId: string) => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (typeof EventSource === "undefined") return;
      const es = new EventSource(`/api/qa/runs/${encodeURIComponent(runId)}/stream`);
      esRef.current = es;

      es.addEventListener("init", (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data) as { run: QaRunRecord };
          setInspectedRun(parsed.run);
        } catch {
          // ignore malformed payload
        }
      });

      es.addEventListener("line", (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data) as { line: string };
          setInspectedRun((prev) =>
            prev && prev.id === runId
              ? { ...prev, lines: [...prev.lines, parsed.line] }
              : prev,
          );
        } catch {
          // ignore malformed payload
        }
      });

      es.addEventListener("done", (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data) as { run: QaRunRecord };
          setInspectedRun(parsed.run);
          setActiveRunId(null);
          setHistory((prev) => [parsed.run, ...prev.filter((r) => r.id !== parsed.run.id)]);
        } catch {
          // ignore malformed payload
        }
        es.close();
        if (esRef.current === es) esRef.current = null;
        void fetchStatus();
      });

      es.onerror = () => {
        es.close();
        if (esRef.current === es) esRef.current = null;
      };
    },
    [fetchStatus],
  );

  React.useEffect(() => {
    if (initialActiveRunId) {
      attachStream(initialActiveRunId);
    }
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [initialActiveRunId, attachStream]);

  const startSuite = async (suiteKey: QaSuiteKey) => {
    if (!enabled || !canExecute || activeRunId) return;
    setStartingSuite(suiteKey);
    try {
      const res = await fetch("/api/qa/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiteKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Failed to start ${suiteKey}`);
        return;
      }
      const run = data.run as QaRunRecord;
      setInspectedRun(run);
      setHistory((prev) => [run, ...prev.filter((r) => r.id !== run.id)]);
      if (run.status === "running") {
        setActiveRunId(run.id);
        setTab("runner");
        attachStream(run.id);
      } else {
        setActiveRunId(null);
        await fetchStatus();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to launch suite");
    } finally {
      setStartingSuite(null);
    }
  };

  const handleCancelActive = async () => {
    if (!activeRunId) return;
    try {
      const res = await fetch(`/api/qa/runs/${encodeURIComponent(activeRunId)}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Cancel failed");
        return;
      }
      toast.info(q.cancel);
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  const handleCopyTerminal = async () => {
    if (!inspectedRun?.lines.length) return;
    try {
      await navigator.clipboard.writeText(inspectedRun.lines.join("\n"));
      toast.success(q.copyLog);
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const filteredManifestItems = React.useMemo(() => {
    if (!manifest) return [];
    const needle = manifestQuery.trim().toLowerCase();
    const out: Array<{ app: string; kind: string; label: string; detail: string; meta: string }> = [];
    for (const [appName, appData] of Object.entries(manifest.apps)) {
      if (manifestAppFilter !== "all" && manifestAppFilter !== appName) continue;
      for (const item of appData.items) {
        if (
          needle &&
          !item.label.toLowerCase().includes(needle) &&
          !item.detail.toLowerCase().includes(needle) &&
          !item.kind.toLowerCase().includes(needle)
        ) {
          continue;
        }
        out.push({ app: appName, ...item });
      }
    }
    return out.slice(0, 200);
  }, [manifest, manifestAppFilter, manifestQuery]);

  const statusBadge = (status: QaRunRecord["status"]) => {
    const label = q.status[status] ?? status;
    const style =
      status === "passed"
        ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
        : status === "failed"
          ? "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
          : status === "running"
            ? "border-sky-400 bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
            : "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    return (
      <span className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase font-mono ${style}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={q.title} description={q.description} />
        <button
          type="button"
          onClick={() => void fetchStatus()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{q.refresh}</span>
        </button>
      </div>

      {!enabled && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300"
        >
          <ShieldAlert className="size-4 shrink-0 text-amber-600" />
          <span>{q.disabledBanner}</span>
        </div>
      )}

      {enabled && !canExecute && (
        <div
          role="note"
          className="flex items-center gap-2.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3 text-xs text-sky-800 dark:text-sky-300"
        >
          <ShieldAlert className="size-4 shrink-0 text-sky-600" />
          <span>{q.readOnlyBanner}</span>
        </div>
      )}

      <div
        role="tablist"
        aria-label={q.title}
        className="flex flex-wrap gap-1 border-b border-slate-300 dark:border-slate-700 pb-2"
      >
        {(["runner", "manifest", "audit", "history"] as QaTab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-colors ${
                active
                  ? "bg-[#0070d2] text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {q.tabs[t]}
            </button>
          );
        })}
      </div>

      {tab === "runner" && (
        <div className="space-y-4">
          <div className="it-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-sky-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-ink">
                  {q.suitesTitle}
                </h2>
              </div>
              {activeRunId && canExecute && (
                <button
                  type="button"
                  onClick={() => void handleCancelActive()}
                  className="it-btn-3d px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 inline-flex items-center gap-1"
                >
                  <Square className="size-3" />
                  <span>{q.cancel}</span>
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suites.map((suite) => {
                const isRunningThis = activeRunId && inspectedRun?.suiteKey === suite.key && inspectedRun.status === "running";
                const disabled = !enabled || !canExecute || Boolean(activeRunId) || startingSuite === suite.key;
                return (
                  <div
                    key={suite.key}
                    className="p-3 border border-slate-300 dark:border-slate-700 bg-surface rounded flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">{suite.label}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {suite.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed">{suite.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (suite.key === "log:rotate") {
                          setRotateConfirmOpen(true);
                        } else {
                          void startSuite(suite.key);
                        }
                      }}
                      className="it-btn-3d w-full py-1.5 px-3 text-xs font-bold font-mono text-emerald-800 dark:text-emerald-300 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="size-3" />
                      <span>{isRunningThis || startingSuite === suite.key ? q.running : q.runSuite}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="it-card p-4 space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                  {q.terminalTitle}
                </h2>
                {inspectedRun && (
                  <>
                    <span className="text-ink-muted">· {inspectedRun.suiteLabel}</span>
                    {statusBadge(inspectedRun.status)}
                    {inspectedRun.durationMs != null && (
                      <span className="text-[11px] text-ink-muted">{inspectedRun.durationMs}ms</span>
                    )}
                    {inspectedRun.passedCount != null && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        {inspectedRun.passedCount} passed / {inspectedRun.failedCount ?? 0} failed
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyTerminal()}
                  disabled={!inspectedRun?.lines.length}
                  className="it-btn-3d px-2.5 py-1 text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Clipboard className="size-3" />
                  <span>{q.copyLog}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedRun((prev) => (prev ? { ...prev, lines: [] } : null))}
                  disabled={!inspectedRun?.lines.length}
                  className="it-btn-3d px-2.5 py-1 text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="size-3" />
                  <span>{q.clearLog}</span>
                </button>
              </div>
            </div>

            <pre
              aria-live="polite"
              className="bg-slate-950 text-emerald-300 p-3 rounded max-h-96 overflow-auto text-[11px] leading-relaxed whitespace-pre-wrap"
            >
              {inspectedRun?.lines.length ? inspectedRun.lines.join("\n") : q.noOutput}
            </pre>
          </div>
        </div>
      )}

      {tab === "manifest" && (
        <div className="it-card p-4 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-sky-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                {q.manifest.title}
              </h2>
              {manifest?.generatedAt && (
                <span className="text-[11px] text-ink-muted">
                  ({q.manifest.generatedAt}: {date(manifest.generatedAt)})
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!enabled || !canExecute || Boolean(activeRunId)}
              onClick={() => void startSuite("manifest")}
              className="it-btn-3d px-3 py-1 text-xs font-bold text-sky-800 dark:text-sky-300 disabled:opacity-50"
            >
              {q.manifest.refreshBtn}
            </button>
          </div>

          {!manifest ? (
            <p className="text-xs text-ink-muted font-sans py-4">{q.manifest.notFound}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="it-table w-full text-left rtl:text-right">
                  <thead>
                    <tr>
                      <th>App / Service</th>
                      <th>{q.manifest.pages}</th>
                      <th>{q.manifest.apiRoutes}</th>
                      <th>{q.manifest.serverActions}</th>
                      <th>{q.manifest.components}</th>
                      <th>{q.manifest.exports}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(manifest.apps).map(([appName, appData]) => (
                      <tr key={appName}>
                        <td className="font-bold uppercase text-ink">{appName}</td>
                        <td>{appData.counts.pages}</td>
                        <td>
                          {appData.counts.apiRoutes} ({appData.counts.apiHandlers})
                        </td>
                        <td>
                          {appData.counts.serverActionFiles} ({appData.counts.serverActions})
                        </td>
                        <td>
                          {appData.counts.componentFiles} ({appData.counts.clientComponents} client)
                        </td>
                        <td>{appData.counts.componentExports}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="font-bold uppercase text-indigo-700 dark:text-indigo-300">
                        Go Backend ({manifest.backend.servicesCount} services)
                      </td>
                      <td>—</td>
                      <td>
                        {manifest.backend.routesCount} ({q.manifest.backendRoutes})
                      </td>
                      <td>—</td>
                      <td>
                        {manifest.backend.tablesCount} ({q.manifest.backendTables})
                      </td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={manifestQuery}
                    onChange={(e) => setManifestQuery(e.target.value)}
                    placeholder={q.manifest.searchPlaceholder}
                    className="it-field-sunken w-full pl-7 pr-3 py-1 text-xs font-mono"
                  />
                </div>
                <select
                  value={manifestAppFilter}
                  onChange={(e) => setManifestAppFilter(e.target.value)}
                  className="it-field-sunken py-1 text-xs font-mono"
                >
                  <option value="all">{q.manifest.allApps}</option>
                  {Object.keys(manifest.apps).map((appName) => (
                    <option key={appName} value={appName}>
                      {appName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="it-table w-full text-left rtl:text-right">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th>App</th>
                      <th>Kind</th>
                      <th>Target / Route</th>
                      <th>Detail</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredManifestItems.map((item, idx) => (
                      <tr key={`${item.app}-${item.kind}-${item.label}-${idx}`}>
                        <td className="font-bold uppercase">{item.app}</td>
                        <td>{item.kind}</td>
                        <td className="font-mono">{item.label}</td>
                        <td className="text-ink-muted">{item.detail}</td>
                        <td>{item.meta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="it-card p-4 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              {logAudit?.summary.passed ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <XCircle className="size-4 text-amber-600" />
              )}
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{q.audit.title}</h2>
              {logAudit && (
                <span
                  className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    logAudit.summary.passed
                      ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  {logAudit.summary.passed
                    ? q.audit.passedBadge
                    : formatMessage(q.audit.failedBadge, { count: logAudit.summary.totalErrors })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!enabled || !canExecute || Boolean(activeRunId)}
                onClick={() => void startSuite("log:audit")}
                className="it-btn-3d px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 disabled:opacity-50"
              >
                {q.audit.runAudit}
              </button>
              <button
                type="button"
                disabled={!enabled || !canExecute || Boolean(activeRunId)}
                onClick={() => setRotateConfirmOpen(true)}
                className="it-btn-3d px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw className="size-3" />
                <span>{q.audit.rotateLogs}</span>
              </button>
            </div>
          </div>

          {!logAudit ? (
            <p className="text-xs text-ink-muted font-sans py-4">{q.audit.noReport}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface rounded space-y-1">
                  <div className="text-[10px] text-ink-muted uppercase font-bold">{q.audit.browser}</div>
                  <div className="text-base font-bold text-ink">{logAudit.browser.requests} reqs</div>
                  <div className="text-[11px] text-ink-muted">
                    {logAudit.browser.files} files ·{" "}
                    {logAudit.browser.errors.length + logAudit.browser.unexpectedHttpErrors.length} errors
                  </div>
                </div>
                <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface rounded space-y-1">
                  <div className="text-[10px] text-ink-muted uppercase font-bold">{q.audit.nextjs}</div>
                  <div className="text-base font-bold text-ink">{logAudit.nextjs.files} logs</div>
                  <div className="text-[11px] text-ink-muted">{logAudit.nextjs.errors.length} errors</div>
                </div>
                <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface rounded space-y-1">
                  <div className="text-[10px] text-ink-muted uppercase font-bold">{q.audit.docker}</div>
                  <div className="text-base font-bold text-ink">{logAudit.docker.servicesChecked} services</div>
                  <div className="text-[11px] text-ink-muted">
                    {logAudit.docker.errors.length} errors · {logAudit.docker.warnings.length} 4xx
                  </div>
                </div>
                <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface rounded space-y-1">
                  <div className="text-[10px] text-ink-muted uppercase font-bold">{q.audit.sandboxes}</div>
                  <div className="text-base font-bold text-ink">
                    Mailpit {logAudit.sandboxes.mailpitReachable ? "OK" : "DOWN"} ({logAudit.sandboxes.mailpitMessages})
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    WhatsApp {logAudit.sandboxes.whatsappReachable ? "OK" : "DOWN"} (
                    {logAudit.sandboxes.whatsappMessages})
                  </div>
                </div>
              </div>

              {logAudit.summary.totalErrors === 0 ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-sans">
                  {q.audit.noErrors}
                </p>
              ) : (
                <pre className="bg-slate-950 text-rose-300 p-3 rounded max-h-72 overflow-auto text-[11px]">
                  {JSON.stringify(
                    {
                      browserErrors: logAudit.browser.errors,
                      browserHttpErrors: logAudit.browser.unexpectedHttpErrors,
                      nextjsErrors: logAudit.nextjs.errors,
                      dockerErrors: logAudit.docker.errors,
                    },
                    null,
                    2,
                  )}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="it-card p-4 space-y-3 font-mono text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{q.history.title}</h2>
          {history.length === 0 ? (
            <p className="text-xs text-ink-muted font-sans py-4">{q.history.empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="it-table w-full text-left rtl:text-right">
                <thead>
                  <tr>
                    <th>{q.history.suite}</th>
                    <th>{q.history.triggeredBy}</th>
                    <th>{q.history.result}</th>
                    <th>{q.history.duration}</th>
                    <th>Started</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.id}>
                      <td className="font-bold text-ink">{run.suiteLabel}</td>
                      <td className="text-ink-muted">{run.triggeredBy}</td>
                      <td>{statusBadge(run.status)}</td>
                      <td>{run.durationMs != null ? `${run.durationMs}ms` : "—"}</td>
                      <td className="text-ink-muted">{date(run.startedAt)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setInspectedRun(run);
                            setTab("runner");
                          }}
                          className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                        >
                          {q.history.viewOutput}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CriticalActionModal
        open={rotateConfirmOpen}
        title={q.audit.rotateTitle}
        description={q.audit.rotateDesc}
        impactDetails={[
          ".local/qa-logs/app-{web,admin,it,store}.log will be truncated to 0 bytes",
          "Stale browser-*.jsonl and log-audit-report.json will be deleted",
          ".local/qa-logs/run-started-at.txt will be updated to now UTC",
        ]}
        requiredConfirmationText={q.audit.rotateConfirm}
        confirmLabel={q.audit.rotateLogs}
        dangerLevel="warning"
        onConfirm={() => {
          setRotateConfirmOpen(false);
          void startSuite("log:rotate");
        }}
        onCancel={() => setRotateConfirmOpen(false)}
      />
    </div>
  );
}
