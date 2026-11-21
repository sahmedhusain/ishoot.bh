#!/usr/bin/env node
/**
 * Full-stack log analyzer across:
 * 1. Browser Playwright JSONL logs (.local/qa-logs/browser-*.jsonl)
 * 2. Next.js dev/start app logs (.local/qa-logs/app-*.log)
 * 3. Docker backend microservices, workers, Postgres, PgBouncer, NATS, Valkey logs
 * 4. Mailpit (:8025) & WhatsApp Sandbox (:8095) verification
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const logsDir = path.join(root, ".local", "qa-logs");
const reportPath = path.join(logsDir, "log-audit-report.json");

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const sinceIdx = args.indexOf("--since");
const sinceArg = sinceIdx !== -1 ? args[sinceIdx + 1] : null;
const sinceIso =
  sinceArg ||
  (fs.existsSync(path.join(logsDir, "run-started-at.txt"))
    ? fs.readFileSync(path.join(logsDir, "run-started-at.txt"), "utf8").trim()
    : new Date(Date.now() - 2 * 3600 * 1000).toISOString());

const report = {
  auditedAt: new Date().toISOString(),
  since: sinceIso,
  browser: { files: 0, requests: 0, errors: [], unexpectedHttpErrors: [] },
  nextjs: { files: 0, errors: [] },
  docker: { servicesChecked: 0, errors: [], warnings: [] },
  sandboxes: { mailpitReachable: false, mailpitMessages: 0, whatsappReachable: false, whatsappMessages: 0 },
  summary: { totalErrors: 0, passed: false },
};

// 1. Browser JSONL logs
if (fs.existsSync(logsDir)) {
  const browserFiles = fs
    .readdirSync(logsDir)
    .filter((f) => f.startsWith("browser-") && f.endsWith(".jsonl"))
    .sort();
  report.browser.files = browserFiles.length;
  for (const file of browserFiles) {
    const lines = fs.readFileSync(path.join(logsDir, file), "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (ev.type === "response") {
        report.browser.requests++;
        if (ev.status >= 400 && !ev.allowed) {
          report.browser.unexpectedHttpErrors.push({ file, ...ev });
        }
      } else if (ev.type === "pageerror" || ev.type === "console_error" || ev.type === "hydration_error" || ev.type === "broken_image") {
        report.browser.errors.push({ file, ...ev });
      }
    }
  }

  // 2. Next.js app logs
  const appLogs = fs
    .readdirSync(logsDir)
    .filter((f) => f.startsWith("app-") && f.endsWith(".log"))
    .sort();
  report.nextjs.files = appLogs.length;
  const nextErrRegex = /(Unhandled|uncaughtException|TypeError:|ReferenceError:|Hydration failed|Text content does not match|Internal Server Error|500\s+in\s+\d+ms|NEXT_NOT_FOUND.*Error)/i;
  for (const file of appLogs) {
    const lines = fs.readFileSync(path.join(logsDir, file), "utf8").split("\n");
    lines.forEach((line, idx) => {
      if (!line) return;
      if (nextErrRegex.test(line) && !/expected-negative-test/i.test(line)) {
        report.nextjs.errors.push({ file, line: idx + 1, text: line.slice(0, 400) });
      }
    });
  }
}

// 3. Docker microservice & infra logs
const DOCKER_SERVICES = [
  "gateway",
  "identity",
  "identity-worker",
  "system",
  "files",
  "files-worker",
  "notify",
  "notify-worker",
  "realtime",
  "audit",
  "audit-worker",
  "itsm",
  "itsm-worker",
  "cms",
  "sales",
  "finance",
  "workflow",
  "hr",
  "inventory",
  "commerce",
  "delivery",
  "postgres",
  "pgbouncer",
  "nats",
  "valkey",
];

// Exclude benign expected error messages when running intentional negative tests (e.g. invalid table allowlist or wrong password)
const BENIGN_DOCKER_PATTERNS = [
  /password authentication failed/i,
  /invalid_credentials/i,
  /connection reset by peer/i,
];

for (const svc of DOCKER_SERVICES) {
  let raw = "";
  try {
    raw = execFileSync("docker", ["compose", "logs", "--no-color", "--since", sinceIso, svc], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    report.docker.servicesChecked++;
  } catch {
    continue;
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart !== -1) {
      try {
        const parsed = JSON.parse(trimmed.slice(jsonStart));
        const lvl = String(parsed.level || "").toUpperCase();
        const msg = String(parsed.msg || parsed.message || parsed.error || "");
        const status = Number(parsed.status || 0);
        // 5xx or internal server error / fatal / panic is always an error
        if (lvl === "FATAL" || /panic:/i.test(trimmed)) {
          report.docker.errors.push({ service: svc, level: lvl, msg, raw: trimmed.slice(0, 400) });
        } else if (lvl === "ERROR") {
          // 4xx validation rejections logged at ERROR are tracked unless status >= 500 or DB/SQLSTATE/unhandled
          if (status >= 400 && status < 500 && !/SQLSTATE|panic|database/i.test(trimmed)) {
            report.docker.warnings.push({ service: svc, level: lvl, status, msg: msg.slice(0, 200) });
          } else if (!BENIGN_DOCKER_PATTERNS.some((re) => re.test(trimmed))) {
            report.docker.errors.push({ service: svc, level: lvl, status, msg, raw: trimmed.slice(0, 400) });
          }
        }
        continue;
      } catch {
        // fall through to plain text parsing
      }
    }
    if (/\b(FATAL|PANIC:|panic:|SQLSTATE|ERROR:\s+(?!canceling statement))/i.test(trimmed)) {
      if (!BENIGN_DOCKER_PATTERNS.some((re) => re.test(trimmed))) {
        report.docker.errors.push({ service: svc, level: "TEXT_ERROR", raw: trimmed.slice(0, 400) });
      }
    }
  }
}

// 4. Sandbox probes (Mailpit & WhatsApp Sandbox)
async function probeSandboxes() {
  try {
    const mp = await fetch("http://127.0.0.1:8025/api/v1/messages", { signal: AbortSignal.timeout(4000) });
    if (mp.ok) {
      const data = await mp.json();
      report.sandboxes.mailpitReachable = true;
      report.sandboxes.mailpitMessages = Array.isArray(data.messages) ? data.messages.length : Number(data.total || 0);
    }
  } catch {}
  try {
    const wa = await fetch("http://127.0.0.1:8095/sandbox/messages", { signal: AbortSignal.timeout(4000) });
    if (wa.ok) {
      const data = await wa.json();
      report.sandboxes.whatsappReachable = true;
      report.sandboxes.whatsappMessages = Array.isArray(data.items)
        ? data.items.length
        : Array.isArray(data)
          ? data.length
          : 0;
    }
  } catch {}
}

probeSandboxes().then(() => {
  report.summary.totalErrors =
    report.browser.errors.length +
    report.browser.unexpectedHttpErrors.length +
    report.nextjs.errors.length +
    report.docker.errors.length;
  report.summary.passed = report.summary.totalErrors === 0;

  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("=== FULL-STACK LOG AUDIT REPORT ===");
  console.log(`Since: ${report.since}`);
  console.log(`Browser logs: ${report.browser.files} files, ${report.browser.requests} HTTP calls tracked, ${report.browser.errors.length} runtime/DOM errors, ${report.browser.unexpectedHttpErrors.length} unexpected HTTP >=400`);
  console.log(`Next.js logs: ${report.nextjs.files} files, ${report.nextjs.errors.length} server errors`);
  console.log(`Docker logs:  ${report.docker.servicesChecked} services checked, ${report.docker.errors.length} ERROR/FATAL/SQL errors, ${report.docker.warnings.length} 4xx notices`);
  console.log(`Sandboxes:    Mailpit=${report.sandboxes.mailpitReachable ? `OK (${report.sandboxes.mailpitMessages} msgs)` : "unreachable"}, WhatsApp=${report.sandboxes.whatsappReachable ? `OK (${report.sandboxes.whatsappMessages} msgs)` : "unreachable"}`);
  console.log(`Report saved: ${path.relative(root, reportPath)}`);

  if (!report.summary.passed) {
    console.error("\nDetected Errors:");
    for (const e of [
      ...report.browser.errors.slice(0, 10),
      ...report.browser.unexpectedHttpErrors.slice(0, 10),
      ...report.nextjs.errors.slice(0, 10),
      ...report.docker.errors.slice(0, 10),
    ]) {
      console.error(" ", JSON.stringify(e));
    }
    if (strict) process.exit(1);
  }
});
