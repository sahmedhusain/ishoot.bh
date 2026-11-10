

export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogEntry {
  id: string;
  timestamp: string; 
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

const MAX_BUFFER_SIZE = 3000;
const logStore: LogEntry[] = [];

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

  if (params?.user && params.user.trim() !== "" && params.user !== "all") {
    const u = params.user.trim().toLowerCase();
    items = items.filter((log) => log.user.toLowerCase().includes(u));
  }

  if (params?.level && params.level !== "ALL") {
    items = items.filter((log) => log.level === params.level);
  }

  if (params?.service && params.service !== "all") {
    items = items.filter((log) => log.service === params.service);
  }

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

export class ClientLogQueue {
  private static queue: Omit<LogEntry, "id">[] = [];
  private static timer: ReturnType<typeof setTimeout> | null = null;
  private static flushIntervalMs = 5000; 
  private static maxBatchSize = 25;

  public static enqueue(entry: Omit<LogEntry, "id" | "timestamp">) {
    const fullEntry: Omit<LogEntry, "id"> = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(fullEntry);

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

      if (this.queue.length < 100) {
        this.queue.unshift(...batch);
      }
    }
  }

  public static getQueuedCount(): number {
    return this.queue.length;
  }
}
