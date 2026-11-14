import { getSystemHealthForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import {
  DeploymentsView,
  type EnvAuditItem,
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
  { key: "SMTP_HOST", isSecret: false },
  { key: "MINIO_ENDPOINT", isSecret: false },
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

  const runtime: RuntimeOverview = {
    environment: (process.env.NODE_ENV || "development").toUpperCase(),
    orchestrator,
    hostname: process.env.HOSTNAME || "localhost",
    gitSha:
      process.env.GIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_BUILD_SHA ||
      "workspace",
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
    />
  );
}
