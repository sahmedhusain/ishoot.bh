/**
 * IT Enterprise Log Queue & Diagnostic Store (SAP/Oracle Telemetry Buffer)
 * Prevents concurrent DB/backend load via client & server queue batching.
 */

export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601
  level: LogLevel;
  service: string;
  user: string;
  action: string;
  message: string;
  durationMs?: number;
  traceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// In-memory ring buffer (up to 3000 entries) to avoid thrashing PostgreSQL
const MAX_BUFFER_SIZE = 3000;
const logStore: LogEntry[] = [];

// Realistic seed logs spanning multiple users, services, and time ranges
function initLogStore() {
  if (logStore.length > 0) return;

  const now = Date.now();
  const sampleUsers = [
    "admin@example.com",
    "lead.engineer@example.com",
    "worker.ops@example.com",
    "support.desk@example.com",
    "auditor.compliance@example.com",
    "finance.manager@example.com",
    "system:cron",
    "system:queue-worker",
  ];

  const sampleServices = [
    "identity",
    "system",
    "itsm",
    "files",
    "notify",
    "realtime",
    "audit",
    "frontend/admin",
    "frontend/it",
  ];

  const sampleActions = [
    { action: "AUTH_LOGIN_SUCCESS", level: "INFO" as LogLevel, msg: "User authenticated via password + TOTP 2FA" },
    { action: "AUTH_SESSION_REVOKED", level: "WARN" as LogLevel, msg: "Session family terminated due to privilege change" },
    { action: "DB_OUTBOX_FLUSH", level: "INFO" as LogLevel, msg: "Processed 14 pending events from outbox" },
    { action: "DB_QUERY_SLOW", level: "WARN" as LogLevel, msg: "Query execution exceeded 250ms on index scan", dur: 342 },
    { action: "DNS_HEALTH_CHECK", level: "INFO" as LogLevel, msg: "DNS records verified against Cloudflare / Route53" },
    { action: "DOMAIN_CONFIG_SAVED", level: "INFO" as LogLevel, msg: "Website and Admin domain routes updated in ingress" },
    { action: "TICKET_CREATED", level: "INFO" as LogLevel, msg: "ITSM incident ticket #1042 triaged with priority: High" },
    { action: "API_KEY_GENERATED", level: "WARN" as LogLevel, msg: "New service bearer token issued for automation worker" },
    { action: "BACKUP_SNAPSHOT_OK", level: "INFO" as LogLevel, msg: "PostgreSQL WAL archive sync completed (1.2GB)" },
    { action: "EMAIL_WEBHOOK_VERIFIED", level: "INFO" as LogLevel, msg: "Resend Svix signature validated; delivery recorded" },
    { action: "PAYMENT_IPN_RECEIVED", level: "INFO" as LogLevel, msg: "PayTabs HMAC-SHA256 signature verified; order settled" },
    { action: "CACHE_PURGE_TRIGGERED", level: "WARN" as LogLevel, msg: "Runtime cache tags invalidated for company settings" },
    { action: "RATE_LIMIT_EXCEEDED", level: "ERROR" as LogLevel, msg: "Client exceeded 120 req/min threshold on /v1/identity/login" },
    { action: "DB_CONNECTION_SPIKE", level: "WARN" as LogLevel, msg: "Pool saturation at 82% (33/40 connections active)" },
    { action: "SERVICE_HEARTBEAT", level: "DEBUG" as LogLevel, msg: "Liveness probe OK on /healthz" },
  ];

  // Generate 120 historical entries over the last 7 days
  for (let i = 120; i >= 0; i--) {
    const timeOffsetMinutes = i * 45; // Spread over ~90 hours
    const entryDate = new Date(now - timeOffsetMinutes * 60 * 1000);
    const act = sampleActions[i % sampleActions.length];
    const user = sampleUsers[i % sampleUsers.length];
    const service = sampleServices[i % sampleServices.length];
    const traceId = `trc_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;

    logStore.push({
      id: `log_${entryDate.getTime()}_${i}`,
      timestamp: entryDate.toISOString(),
      level: act.level,
      service,
      user,
      action: act.action,
      message: act.msg,
      durationMs: act.dur ?? Math.floor(Math.random() * 65) + 5,
      traceId,
      ipAddress: "192.168.1.10" + (i % 10),
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ERP-Agent/9.4",
      metadata: {
        env: "production",
        node: "node-bh-01",
        revision: 42,
        caller: user,
      },
    });
  }
}

// Initialise upon module load
initLogStore();

export function getLogs(params?: {
  timeRange?: "15m" | "1h" | "24h" | "7d" | "all";
  user?: string;
  level?: string;
  service?: string;
  search?: string;
  sortBy?: "timestamp" | "severity" | "duration";
  sortDir?: "asc" | "desc";
  limit?: number;
}): { items: LogEntry[]; totalCount: number; bufferSize: number } {
  let items = [...logStore];

  // 1. Time range filter
  if (params?.timeRange && params.timeRange !== "all") {
    const now = Date.now();
    const rangeMsMap: Record<string, number> = {
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };
    const maxAge = rangeMsMap[params.timeRange] ?? (24 * 60 * 60 * 1000);
    const cutoff = now - maxAge;
    items = items.filter((log) => new Date(log.timestamp).getTime() >= cutoff);
  }

  // 2. User filter
  if (params?.user && params.user.trim() !== "" && params.user !== "all") {
    const u = params.user.trim().toLowerCase();
    items = items.filter((log) => log.user.toLowerCase().includes(u));
  }

  // 3. Level filter
  if (params?.level && params.level !== "ALL") {
    items = items.filter((log) => log.level === params.level);
  }

  // 4. Service filter
  if (params?.service && params.service !== "all") {
    items = items.filter((log) => log.service === params.service);
  }

  // 5. Search query
  if (params?.search && params.search.trim() !== "") {
    const q = params.search.trim().toLowerCase();
    items = items.filter(
      (log) =>
        log.message.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.service.toLowerCase().includes(q) ||
        (log.traceId && log.traceId.toLowerCase().includes(q))
    );
  }

  // 6. Sorting
  const sortBy = params?.sortBy ?? "timestamp";
  const sortDir = params?.sortDir ?? "desc";
  const severityWeight: Record<LogLevel, number> = {
    FATAL: 5,
    ERROR: 4,
    WARN: 3,
    INFO: 2,
    DEBUG: 1,
    TRACE: 0,
  };

  items.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "timestamp") {
      cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortBy === "severity") {
      cmp = severityWeight[a.level] - severityWeight[b.level];
    } else if (sortBy === "duration") {
      cmp = (a.durationMs ?? 0) - (b.durationMs ?? 0);
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const totalCount = items.length;
  const limit = params?.limit ?? 250;
  return {
    items: items.slice(0, limit),
    totalCount,
    bufferSize: logStore.length,
  };
}

export function pushLogs(entries: Omit<LogEntry, "id">[]) {
  const now = Date.now();
  for (const entry of entries) {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${now}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    logStore.unshift(newEntry);
    if (logStore.length > MAX_BUFFER_SIZE) {
      logStore.pop();
    }
  }
}

/**
 * Client-side Log Queue for batching frontend logs
 */
export class ClientLogQueue {
  private static queue: Omit<LogEntry, "id">[] = [];
  private static timer: ReturnType<typeof setTimeout> | null = null;
  private static flushIntervalMs = 5000; // 5-second interval
  private static maxBatchSize = 25;

  public static enqueue(entry: Omit<LogEntry, "id" | "timestamp">) {
    const fullEntry: Omit<LogEntry, "id"> = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(fullEntry);

    // If critical error or buffer full, flush immediately
    if (entry.level === "FATAL" || entry.level === "ERROR" || this.queue.length >= this.maxBatchSize) {
      void this.flush();
      return;
    }

    if (!this.timer) {
      this.timer = setTimeout(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  public static async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      if (typeof window !== "undefined") {
        await fetch("/api/logs/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: batch }),
          keepalive: true,
        });
      }
    } catch {
      // Re-queue in case of network issue, capped to avoid explosion
      if (this.queue.length < 100) {
        this.queue.unshift(...batch);
      }
    }
  }

  public static getQueuedCount(): number {
    return this.queue.length;
  }
}
