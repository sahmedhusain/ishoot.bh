export interface TelemetryEvent {
  timestamp?: string;
  level?: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  service?: string;
  user?: string;
  action: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const itBaseUrl = () =>
  (process.env.IT_INTERNAL_URL || "http://localhost:3002").replace(/\/$/, "");

export async function emitItTelemetry(events: TelemetryEvent | TelemetryEvent[]) {
  const list = Array.isArray(events) ? events : [events];
  if (list.length === 0) return;
  try {
    await fetch(`${itBaseUrl()}/api/logs/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logs: list.map((e) => ({
          timestamp: e.timestamp || new Date().toISOString(),
          level: e.level || "INFO",
          service: e.service || "frontend/admin",
          user: e.user || "anonymous",
          action: e.action,
          message: e.message,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          metadata: e.metadata,
        })),
      }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Non-blocking telemetry sink
  }
}
