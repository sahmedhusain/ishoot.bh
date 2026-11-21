import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { pushLogs } from "./logger-queue";

export type QaSuiteCategory = "manifest" | "unit" | "typecheck" | "backend" | "e2e" | "logs";

export type QaSuiteKey =
  | "manifest"
  | "vitest:web"
  | "vitest:store"
  | "vitest:it"
  | "vitest:admin"
  | "typecheck"
  | "go:system"
  | "go:backend"
  | "e2e:smoke"
  | "log:audit"
  | "log:rotate";

export interface QaSuiteDefinition {
  key: QaSuiteKey;
  label: string;
  description: string;
  category: QaSuiteCategory;
}

export const QA_SUITES: readonly QaSuiteDefinition[] = [
  {
    key: "manifest",
    label: "Refresh Coverage Manifest",
    description: "Re-index all 4 Next.js apps and 16 Go services into .local/qa-manifest.json.",
    category: "manifest",
  },
  {
    key: "vitest:web",
    label: "Web Vitest Suite",
    description: "Run all apps/web unit, component, and manifest completeness gate tests.",
    category: "unit",
  },
  {
    key: "vitest:store",
    label: "Store Vitest Suite",
    description: "Run all apps/store unit, component, and manifest completeness gate tests.",
    category: "unit",
  },
  {
    key: "vitest:it",
    label: "IT Console Vitest Suite",
    description: "Run all apps/it unit, component, and manifest completeness gate tests.",
    category: "unit",
  },
  {
    key: "vitest:admin",
    label: "Admin Vitest Suite",
    description: "Run all apps/admin unit, component, and manifest completeness gate tests.",
    category: "unit",
  },
  {
    key: "typecheck",
    label: "Monorepo TypeScript Check",
    description: "Run tsc --noEmit across admin, it, web, and store apps.",
    category: "typecheck",
  },
  {
    key: "go:system",
    label: "Go System Service Tests",
    description: "Run serialized Go tests for backend/services/system/...",
    category: "backend",
  },
  {
    key: "go:backend",
    label: "Go Full Backend Suite",
    description: "Run serialized go test -p 1 ./... across all 16 Go microservices and tools.",
    category: "backend",
  },
  {
    key: "e2e:smoke",
    label: "Live Stack Playwright Smoke",
    description: "Run non-destructive Playwright API & web flow checks across all 4 live apps.",
    category: "e2e",
  },
  {
    key: "log:audit",
    label: "4-Tier Strict Log Audit",
    description: "Run analyze-stack-logs.cjs --strict across browser, Next.js, Docker, and sandboxes.",
    category: "logs",
  },
  {
    key: "log:rotate",
    label: "Rotate Logs & Baseline",
    description: "Truncate app logs, clear stale browser JSONL traces, and reset run-started-at.txt.",
    category: "logs",
  },
] as const;

export type QaRunStatus = "running" | "passed" | "failed" | "cancelled";

export interface QaRunRecord {
  id: string;
  suiteKey: QaSuiteKey;
  suiteLabel: string;
  category: QaSuiteCategory;
  status: QaRunStatus;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  exitCode: number | null;
  passedCount: number | null;
  failedCount: number | null;
  lines: string[];
}

export interface QaManifestAppItem {
  kind: "page" | "apiRoute" | "component";
  label: string;
  detail: string;
  meta: string;
}

export interface QaManifestSummary {
  generatedAt: string;
  apps: Record<
    string,
    {
      counts: {
        pages: number;
        apiRoutes: number;
        apiHandlers: number;
        serverActionFiles: number;
        serverActions: number;
        componentFiles: number;
        clientComponents: number;
        componentExports: number;
      };
      items: QaManifestAppItem[];
    }
  >;
  backend: {
    servicesCount: number;
    routesCount: number;
    tablesCount: number;
    services: Array<{ name: string; routes: number; tables: number }>;
  };
}

export interface LogAuditReportSummary {
  auditedAt: string;
  since: string;
  browser: {
    files: number;
    requests: number;
    errors: Array<Record<string, unknown>>;
    unexpectedHttpErrors: Array<Record<string, unknown>>;
  };
  nextjs: {
    files: number;
    errors: Array<Record<string, unknown>>;
  };
  docker: {
    servicesChecked: number;
    errors: Array<Record<string, unknown>>;
    warnings: Array<Record<string, unknown>>;
  };
  sandboxes: {
    mailpitReachable: boolean;
    mailpitMessages: number;
    whatsappReachable: boolean;
    whatsappMessages: number;
  };
  summary: {
    totalErrors: number;
    passed: boolean;
  };
}

export type QaStreamEvent =
  | { type: "line"; line: string }
  | { type: "done"; run: QaRunRecord };

type QaListener = (event: QaStreamEvent) => void;

interface RunnerState {
  activeRunId: string | null;
  activeChild: ChildProcess | null;
  runs: QaRunRecord[];
  listeners: Map<string, Set<QaListener>>;
  loadedHistory: boolean;
}

const MAX_HISTORY = 25;
const MAX_LINES = 2000;

export class QaRunnerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export function getRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (
      fs.existsSync(path.join(dir, "scripts", "generate-coverage-manifest.cjs")) &&
      fs.existsSync(path.join(dir, "apps"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "../..");
}

export function isQaRunnerEnabled(): boolean {
  if (process.env.IT_QA_RUNNER_ENABLED === "false") return false;
  if (process.env.NODE_ENV === "production") {
    return process.env.IT_QA_RUNNER_ENABLED === "true";
  }
  return true;
}

function getState(): RunnerState {
  const g = globalThis as unknown as { __itQaRunnerState?: RunnerState };
  if (!g.__itQaRunnerState) {
    g.__itQaRunnerState = {
      activeRunId: null,
      activeChild: null,
      runs: [],
      listeners: new Map(),
      loadedHistory: false,
    };
  }
  const state = g.__itQaRunnerState;
  if (!state.loadedHistory) {
    state.loadedHistory = true;
    try {
      const historyPath = path.join(getRepoRoot(), ".local", "qa-logs", "qa-runs-history.json");
      if (fs.existsSync(historyPath)) {
        const parsed = JSON.parse(fs.readFileSync(historyPath, "utf8"));
        if (Array.isArray(parsed)) {
          state.runs = parsed
            .slice(0, MAX_HISTORY)
            .map((r: QaRunRecord) => (r.status === "running" ? { ...r, status: "cancelled" as const } : r));
        }
      }
    } catch {
      // ignore corrupted history on startup
    }
  }
  return state;
}

function saveHistory(runs: QaRunRecord[]) {
  try {
    const dir = path.join(getRepoRoot(), ".local", "qa-logs");
    fs.mkdirSync(dir, { recursive: true });
    const historyPath = path.join(dir, "qa-runs-history.json");
    const tmpPath = `${historyPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(runs.slice(0, MAX_HISTORY), null, 2));
    fs.renameSync(tmpPath, historyPath);
  } catch {
    // non-fatal if filesystem is read-only
  }
}

export function readQaManifestSummary(): QaManifestSummary | null {
  try {
    const manifestPath = path.join(getRepoRoot(), ".local", "qa-manifest.json");
    if (!fs.existsSync(manifestPath)) return null;
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const apps: QaManifestSummary["apps"] = {};
    for (const [appName, appData] of Object.entries(raw.apps ?? {})) {
      const data = appData as {
        counts: QaManifestSummary["apps"][string]["counts"];
        pages?: Array<{ route: string; file: string; calls?: unknown[] }>;
        apiRoutes?: Array<{ route: string; methods?: string[]; file: string }>;
        components?: Array<{ relativePath: string; isClient?: boolean; exports?: string[]; calls?: unknown[] }>;
      };
      const items: QaManifestAppItem[] = [
        ...(data.pages ?? []).map((p) => ({
          kind: "page" as const,
          label: p.route,
          detail: p.file,
          meta: `${p.calls?.length ?? 0} calls`,
        })),
        ...(data.apiRoutes ?? []).map((r) => ({
          kind: "apiRoute" as const,
          label: r.route,
          detail: r.file,
          meta: (r.methods ?? []).join(", ") || "HANDLER",
        })),
        ...(data.components ?? []).map((c) => ({
          kind: "component" as const,
          label: c.relativePath,
          detail: `${c.isClient ? "client" : "server"} component`,
          meta: `${c.exports?.length ?? 0} exports · ${c.calls?.length ?? 0} calls`,
        })),
      ];
      apps[appName] = { counts: data.counts, items };
    }

    const routes = Array.isArray(raw.backend?.routes) ? raw.backend.routes : [];
    const tables = Array.isArray(raw.backend?.tables) ? raw.backend.tables : [];
    const svcMap = new Map<string, { name: string; routes: number; tables: number }>();
    for (const r of routes as Array<{ service?: string }>) {
      const name = r.service || "unknown";
      const cur = svcMap.get(name) ?? { name, routes: 0, tables: 0 };
      cur.routes++;
      svcMap.set(name, cur);
    }
    for (const t of tables as Array<{ service?: string }>) {
      const name = t.service || "unknown";
      const cur = svcMap.get(name) ?? { name, routes: 0, tables: 0 };
      cur.tables++;
      svcMap.set(name, cur);
    }

    return {
      generatedAt: String(raw.generatedAt || ""),
      apps,
      backend: {
        servicesCount: svcMap.size,
        routesCount: routes.length,
        tablesCount: tables.length,
        services: [...svcMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      },
    };
  } catch {
    return null;
  }
}

export function readLogAuditReport(): LogAuditReportSummary | null {
  try {
    const reportPath = path.join(getRepoRoot(), ".local", "qa-logs", "log-audit-report.json");
    if (!fs.existsSync(reportPath)) return null;
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as LogAuditReportSummary;
  } catch {
    return null;
  }
}

export function listQaRuns(): { activeRunId: string | null; runs: QaRunRecord[] } {
  const state = getState();
  return {
    activeRunId: state.activeRunId,
    runs: state.runs.map((r) => ({ ...r, lines: [...r.lines] })),
  };
}

export function getQaRun(id: string): QaRunRecord | null {
  const run = getState().runs.find((r) => r.id === id);
  return run ? { ...run, lines: [...run.lines] } : null;
}

export function subscribeQaRun(id: string, listener: QaListener): () => void {
  const state = getState();
  let set = state.listeners.get(id);
  if (!set) {
    set = new Set();
    state.listeners.set(id, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) state.listeners.delete(id);
  };
}

function emitEvent(id: string, event: QaStreamEvent) {
  const set = getState().listeners.get(id);
  if (!set) return;
  for (const listener of set) {
    listener(event);
  }
}

function parseSummaryCounts(lines: string[]): { passed: number | null; failed: number | null } {
  const joined = lines.join("\n");
  // Vitest: "Tests  38 passed (38)" or "Tests  2 failed | 36 passed (38)"
  const vitestMatch = joined.match(/Tests\s+(?:(\d+)\s+failed\s+\|\s+)?(\d+)\s+passed\s+\(/);
  if (vitestMatch) {
    return {
      failed: vitestMatch[1] ? Number(vitestMatch[1]) : 0,
      passed: Number(vitestMatch[2]),
    };
  }
  // Playwright: "3 passed (15.2s)" or "1 failed ... 2 passed"
  const pwFailed = joined.match(/(\d+)\s+failed/);
  const pwPassed = joined.match(/(\d+)\s+passed/);
  if (pwPassed || pwFailed) {
    return {
      passed: pwPassed ? Number(pwPassed[1]) : 0,
      failed: pwFailed ? Number(pwFailed[1]) : 0,
    };
  }
  // Go test packages: count "^ok " and "^FAIL "
  let goOk = 0;
  let goFail = 0;
  for (const line of lines) {
    if (/^ok\s+/.test(line)) goOk++;
    else if (/^FAIL\s+/.test(line)) goFail++;
  }
  if (goOk > 0 || goFail > 0) {
    return { passed: goOk, failed: goFail };
  }
  return { passed: null, failed: null };
}

function commandSpecForSuite(suiteKey: QaSuiteKey): { cmd: string; args: string[]; cwd: string } {
  const root = getRepoRoot();
  switch (suiteKey) {
    case "manifest":
      return { cmd: "node", args: ["scripts/generate-coverage-manifest.cjs"], cwd: root };
    case "vitest:web":
      return { cmd: "npm", args: ["--prefix", "apps/web", "run", "test"], cwd: root };
    case "vitest:store":
      return { cmd: "npm", args: ["--prefix", "apps/store", "run", "test"], cwd: root };
    case "vitest:it":
      return { cmd: "npm", args: ["--prefix", "apps/it", "run", "test"], cwd: root };
    case "vitest:admin":
      return { cmd: "npm", args: ["--prefix", "apps/admin", "run", "test"], cwd: root };
    case "typecheck":
      return { cmd: "npm", args: ["run", "type-check"], cwd: root };
    case "go:system":
      return { cmd: "go", args: ["test", "-p", "1", "./services/system/..."], cwd: path.join(root, "backend") };
    case "go:backend":
      return { cmd: "go", args: ["test", "-p", "1", "./..."], cwd: path.join(root, "backend") };
    case "e2e:smoke":
      return {
        cmd: "bash",
        args: [
          "-c",
          "(cd apps/web && npx playwright test tests/e2e/api-web-routes.spec.ts tests/e2e/exhaustive-web-flows.spec.ts) && (cd apps/store && npx playwright test tests/e2e/api-store-routes.spec.ts) && (cd apps/it && npx playwright test tests/e2e/api-it-routes.spec.ts) && (cd apps/admin && npx playwright test tests/e2e/api-nextjs-routes.spec.ts)",
        ],
        cwd: root,
      };
    case "log:audit":
      return { cmd: "node", args: ["scripts/analyze-stack-logs.cjs", "--strict"], cwd: root };
    case "log:rotate":
      return { cmd: "", args: [], cwd: root };
  }
}

function appendLine(run: QaRunRecord, line: string) {
  const clean = line.replace(/\r$/, "");
  if (!clean) return;
  if (run.lines.length >= MAX_LINES) run.lines.shift();
  run.lines.push(clean);
  emitEvent(run.id, { type: "line", line: clean });
}

export function startQaRun(suiteKey: string, triggeredBy: string): QaRunRecord {
  if (!isQaRunnerEnabled()) {
    throw new QaRunnerError("QA runner is disabled in this environment.", 403);
  }
  const suite = QA_SUITES.find((s) => s.key === suiteKey);
  if (!suite) {
    throw new QaRunnerError(`Unknown QA suite: ${suiteKey}`, 400);
  }

  const state = getState();
  if (state.activeRunId) {
    throw new QaRunnerError(`Another QA run (${state.activeRunId}) is already in progress.`, 409);
  }

  const run: QaRunRecord = {
    id: randomUUID(),
    suiteKey: suite.key,
    suiteLabel: suite.label,
    category: suite.category,
    status: "running",
    triggeredBy,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    exitCode: null,
    passedCount: null,
    failedCount: null,
    lines: [],
  };

  state.activeRunId = run.id;
  state.runs.unshift(run);
  if (state.runs.length > MAX_HISTORY) state.runs.length = MAX_HISTORY;

  pushLogs([
    {
      timestamp: run.startedAt,
      level: "INFO",
      service: "frontend/it",
      user: triggeredBy,
      action: "QA_RUN_STARTED",
      message: `Started QA suite ${suite.key} (${run.id})`,
    },
  ]);

  if (suite.key === "log:rotate") {
    const startMs = Date.now();
    try {
      const logsDir = path.join(getRepoRoot(), ".local", "qa-logs");
      fs.mkdirSync(logsDir, { recursive: true });
      for (const appLog of ["app-web.log", "app-admin.log", "app-it.log", "app-store.log"]) {
        const p = path.join(logsDir, appLog);
        if (fs.existsSync(p)) fs.truncateSync(p, 0);
        appendLine(run, `Truncated ${appLog}`);
      }
      for (const entry of fs.readdirSync(logsDir)) {
        if (
          (entry.startsWith("browser-") && entry.endsWith(".jsonl")) ||
          entry === "playwright-admin-pages.jsonl" ||
          entry === "log-audit-report.json"
        ) {
          fs.rmSync(path.join(logsDir, entry), { force: true });
          appendLine(run, `Removed stale ${entry}`);
        }
      }
      const baseline = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      fs.writeFileSync(path.join(logsDir, "run-started-at.txt"), `${baseline}\n`);
      appendLine(run, `Baseline timestamp updated: ${baseline}`);
      run.status = "passed";
      run.exitCode = 0;
      run.passedCount = 1;
      run.failedCount = 0;
    } catch (err) {
      appendLine(run, `Log rotation error: ${err instanceof Error ? err.message : String(err)}`);
      run.status = "failed";
      run.exitCode = 1;
      run.passedCount = 0;
      run.failedCount = 1;
    } finally {
      run.finishedAt = new Date().toISOString();
      run.durationMs = Date.now() - startMs;
      state.activeRunId = null;
      saveHistory(state.runs);
      pushLogs([
        {
          timestamp: run.finishedAt,
          level: run.status === "passed" ? "INFO" : "ERROR",
          service: "frontend/it",
          user: triggeredBy,
          action: "QA_RUN_FINISHED",
          message: `Completed QA suite ${suite.key} (${run.status})`,
          durationMs: run.durationMs,
        },
      ]);
      emitEvent(run.id, { type: "done", run: { ...run, lines: [...run.lines] } });
    }
    return { ...run, lines: [...run.lines] };
  }

  const { cmd, args, cwd } = commandSpecForSuite(suite.key);
  const startMs = Date.now();
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, CI: "1", NO_COLOR: "1", FORCE_COLOR: "0" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  state.activeChild = child;

  let carryOut = "";
  let carryErr = "";
  const consumeChunk = (chunk: Buffer, isErr: boolean) => {
    const text = (isErr ? carryErr : carryOut) + chunk.toString("utf8");
    const parts = text.split("\n");
    const tail = parts.pop() ?? "";
    if (isErr) carryErr = tail;
    else carryOut = tail;
    for (const p of parts) appendLine(run, p);
  };

  child.stdout?.on("data", (c: Buffer) => consumeChunk(c, false));
  child.stderr?.on("data", (c: Buffer) => consumeChunk(c, true));

  const finalize = (code: number | null) => {
    if (carryOut) appendLine(run, carryOut);
    if (carryErr) appendLine(run, carryErr);
    carryOut = "";
    carryErr = "";
    if (run.status === "running") {
      run.status = code === 0 ? "passed" : "failed";
    }
    run.exitCode = code ?? (run.status === "cancelled" ? 130 : 1);
    run.finishedAt = new Date().toISOString();
    run.durationMs = Date.now() - startMs;
    const counts = parseSummaryCounts(run.lines);
    run.passedCount = counts.passed;
    run.failedCount = counts.failed;
    if (state.activeRunId === run.id) {
      state.activeRunId = null;
      state.activeChild = null;
    }
    saveHistory(state.runs);
    pushLogs([
      {
        timestamp: run.finishedAt,
        level: run.status === "passed" ? "INFO" : "WARN",
        service: "frontend/it",
        user: triggeredBy,
        action: "QA_RUN_FINISHED",
        message: `Finished QA suite ${suite.key}: ${run.status} (exit=${run.exitCode})`,
        durationMs: run.durationMs,
      },
    ]);
    emitEvent(run.id, { type: "done", run: { ...run, lines: [...run.lines] } });
  };

  child.on("error", (err) => {
    appendLine(run, `Process spawn error: ${err.message}`);
    finalize(1);
  });
  child.on("close", (code) => {
    finalize(code);
  });

  return { ...run, lines: [...run.lines] };
}

export function cancelQaRun(id: string, triggeredBy: string): QaRunRecord | null {
  const state = getState();
  const run = state.runs.find((r) => r.id === id);
  if (!run) return null;

  if (run.status === "running" && state.activeRunId === id) {
    run.status = "cancelled";
    appendLine(run, `Cancellation requested by ${triggeredBy}...`);
    const child = state.activeChild;
    if (child?.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {
          // already exited
        }
      }
    }
  }
  return { ...run, lines: [...run.lines] };
}
