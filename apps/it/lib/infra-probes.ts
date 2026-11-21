import net from "node:net";

export interface PlatformProbeItem {
  name: string;
  category: "app" | "infra" | "sandbox";
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  target: string;
  detail?: string;
  checkedAt: string;
}

async function probeHttp(
  name: string,
  category: PlatformProbeItem["category"],
  url: string,
  timeoutMs = 1500,
): Promise<PlatformProbeItem> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const healthy = res.status >= 200 && res.status < 400;
    return {
      name,
      category,
      status: healthy ? "healthy" : "degraded",
      latencyMs,
      target: url,
      detail: `HTTP ${res.status}`,
      checkedAt,
    };
  } catch (err) {
    return {
      name,
      category,
      status: "down",
      latencyMs: Date.now() - started,
      target: url,
      detail: err instanceof Error ? err.message : "unreachable",
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

function probeTcp(
  name: string,
  category: PlatformProbeItem["category"],
  host: string,
  port: number,
  timeoutMs = 1200,
): Promise<PlatformProbeItem> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const target = `${host}:${port}`;

  return new Promise((resolve) => {
    let settled = false;
    const socket = net.createConnection({ host, port });

    const done = (status: PlatformProbeItem["status"], detail?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        name,
        category,
        status,
        latencyMs: Date.now() - started,
        target,
        detail,
        checkedAt,
      });
    };

    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done("healthy", "TCP OK"));
    socket.on("timeout", () => done("down", "TCP timeout"));
    socket.on("error", (err) => done("down", err.message));
  });
}

function parseHostPort(raw: string | undefined, fallbackHost: string, fallbackPort: number): { host: string; port: number } {
  if (!raw) return { host: fallbackHost, port: fallbackPort };
  try {
    const normalized = raw.includes("://") ? raw : `http://${raw}`;
    const u = new URL(normalized);
    return {
      host: u.hostname || fallbackHost,
      port: u.port ? Number(u.port) : fallbackPort,
    };
  } catch {
    return { host: fallbackHost, port: fallbackPort };
  }
}

export async function probePlatformTopology(): Promise<PlatformProbeItem[]> {
  const webUrl = (process.env.WEB_INTERNAL_URL || process.env.WEB_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  const adminUrl = (process.env.ADMIN_INTERNAL_URL || process.env.ADMIN_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
  const itUrl = (process.env.IT_INTERNAL_URL || process.env.IT_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
  const storeUrl = (process.env.STORE_INTERNAL_URL || process.env.STORE_URL || "http://127.0.0.1:3003").replace(/\/$/, "");

  const pgTarget = parseHostPort(process.env.DATABASE_URL, "127.0.0.1", 5432);
  const redisTarget = parseHostPort(process.env.REDIS_URL, "127.0.0.1", 6379);
  const natsTarget = parseHostPort(process.env.NATS_URL, "127.0.0.1", 4222);
  const seaweedTarget = parseHostPort(process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT, "127.0.0.1", 8333);
  const mailpitUrl = (process.env.MAILPIT_URL || "http://127.0.0.1:8025").replace(/\/$/, "");
  const waUrl = (process.env.WHATSAPP_SANDBOX_URL || "http://127.0.0.1:8095").replace(/\/$/, "");

  return Promise.all([
    probeHttp("web-app", "app", `${webUrl}/`),
    probeHttp("admin-app", "app", `${adminUrl}/login`),
    probeHttp("it-app", "app", `${itUrl}/login`),
    probeHttp("store-app", "app", `${storeUrl}/`),
    probeTcp("postgres", "infra", pgTarget.host, pgTarget.port),
    probeTcp("valkey-redis", "infra", redisTarget.host, redisTarget.port),
    probeTcp("nats-jetstream", "infra", natsTarget.host, natsTarget.port),
    probeTcp("seaweedfs-s3", "infra", seaweedTarget.host, seaweedTarget.port),
    probeHttp("mailpit-sandbox", "sandbox", `${mailpitUrl}/api/v1/messages?limit=1`),
    probeHttp("whatsapp-sandbox", "sandbox", `${waUrl}/healthz`),
  ]);
}
