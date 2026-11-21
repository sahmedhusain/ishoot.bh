import { execFileSync } from "node:child_process";
import { getSystemHealthForIT } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { asUser, requireAllowed } from "../../../lib/session";
import {
  DeploymentsView,
  type EnvAuditItem,
  type ParityCheckItem,
  type RuntimeOverview,
} from "../../../components/DeploymentsView";

export const dynamic = "force-dynamic";

const AUDIT_KEYS: Array<{ key: string; isSecret: boolean }> = [
  { key: "NODE_ENV", isSecret: false },
  { key: "HOSTNAME", isSecret: false },
  { key: "KUBERNETES_SERVICE_HOST", isSecret: false },
  { key: "GATEWAY_BASE_URL", isSecret: false },
  { key: "SYSTEM_API_URL", isSecret: false },
  { key: "IDENTITY_API_URL", isSecret: false },
  { key: "AUDIT_API_URL", isSecret: false },
  { key: "ITSM_API_URL", isSecret: false },
  { key: "CMS_API_URL", isSecret: false },
  { key: "IT_INTERNAL_URL", isSecret: false },
  { key: "WEB_INTERNAL_URL", isSecret: false },
  { key: "STORE_INTERNAL_URL", isSecret: false },
  { key: "SMTP_HOST", isSecret: false },
  { key: "MINIO_ENDPOINT", isSecret: false },
  { key: "REVALIDATION_SECRET", isSecret: true },
  { key: "DATABASE_URL", isSecret: true },
  { key: "REDIS_URL", isSecret: true },
  { key: "SERVICE_AUTH_SECRET", isSecret: true },
  { key: "IT_BOOTSTRAP_PASSWORD_HASH", isSecret: true },
  { key: "ADMIN_BOOTSTRAP_PASSWORD_HASH", isSecret: true },
];

function redactValue(raw: string | undefined, isSecret: boolean): string {
  if (!raw) return "NOT SET";
  if (isSecret) return "••••••••••••••••";
  return raw.replace(/:\/\/[^:@]+:[^@]+@/, "://***:***@");
}

function readGitInfo(): { sha: string; branch: string; commitDate?: string } {
  const envSha =
    process.env.GIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_SHA;
  try {
    const sha =
      envSha ||
      execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        encoding: "utf8",
        timeout: 1500,
      }).trim();
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      timeout: 1500,
    }).trim();
    const commitDate = execFileSync("git", ["log", "-1", "--format=%cI"], {
      encoding: "utf8",
      timeout: 1500,
    }).trim();
    return { sha: sha || "workspace", branch: branch || "unknown", commitDate: commitDate || undefined };
  } catch {
    return {
      sha: envSha || "workspace",
      branch: process.env.GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "local",
    };
  }
}

function buildParityChecks(): ParityCheckItem[] {
  const checks: ParityCheckItem[] = [
    {
      key: "GATEWAY_BASE_URL / API_URL",
      status: process.env.GATEWAY_BASE_URL || process.env.API_URL ? "ok" : "warn",
      detail: process.env.GATEWAY_BASE_URL || process.env.API_URL || "Using default http://localhost:8080",
    },
    {
      key: "REVALIDATION_SECRET",
      status: process.env.REVALIDATION_SECRET ? "ok" : "missing",
      detail: process.env.REVALIDATION_SECRET
        ? "Configured for Web & Store cache invalidation"
        : "Unset — one-click cache revalidation will return 401",
    },
    {
      key: "SERVICE_AUTH_SECRET",
      status: process.env.SERVICE_AUTH_SECRET ? "ok" : "missing",
      detail: process.env.SERVICE_AUTH_SECRET
        ? "Configured for internal service-to-service JWTs"
        : "Missing service auth secret",
    },
    {
      key: "DATABASE_URL",
      status: process.env.DATABASE_URL ? "ok" : "warn",
      detail: process.env.DATABASE_URL
        ? "Configured"
        : "Not exposed to IT Next.js runtime (delegated to Go services)",
    },
    {
      key: "WEB & STORE INTERNAL URLS",
      status: process.env.WEB_INTERNAL_URL || process.env.WEB_URL ? "ok" : "warn",
      detail: `${process.env.WEB_INTERNAL_URL || process.env.WEB_URL || "http://127.0.0.1:3000"} · ${process.env.STORE_INTERNAL_URL || process.env.STORE_URL || "http://127.0.0.1:3003"}`,
    },
  ];
  return checks;
}

export default async function DeploymentsPage() {
  const user = await requireAllowed("system_health", "read");
  const services = await asUser(() => getSystemHealthForIT(user.token)).catch(
    () => [],
  );

  const orchestrator = process.env.KUBERNETES_SERVICE_HOST
    ? "KUBERNETES"
    : process.env.HOSTNAME && process.env.HOSTNAME !== "localhost"
      ? "DOCKER CONTAINER"
      : "LOCAL NODE";

  const git = readGitInfo();

  const runtime: RuntimeOverview = {
    environment: (process.env.NODE_ENV || "development").toUpperCase(),
    orchestrator,
    hostname: process.env.HOSTNAME || "localhost",
    gitSha: git.sha,
    gitBranch: git.branch,
    gitCommitDate: git.commitDate,
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    uptimeMinutes: Math.round(process.uptime() / 60),
    checkedAt: new Date().toISOString(),
  };

  const envAudit: EnvAuditItem[] = AUDIT_KEYS.map(({ key, isSecret }) => {
    const val = process.env[key];
    return {
      key,
      isSecret,
      present: Boolean(val && val.trim().length > 0),
      redacted: redactValue(val, isSecret),
    };
  });

  return (
    <DeploymentsView
      services={services}
      runtime={runtime}
      envAudit={envAudit}
      parityChecks={buildParityChecks()}
      canRevalidate={itAllowed(user.roles, "runtime_config", "edit")}
    />
  );
}
