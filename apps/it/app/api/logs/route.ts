import { NextResponse } from "next/server";
import { listAuditEvents } from "@platform/api-client";
import { asUser, currentUser } from "../../../lib/session";
import {
  getLogs,
  pushLogs,
  type LogEntry,
  type LogLevel,
} from "../../../lib/logger-queue";

export const dynamic = "force-dynamic";

function requestClientMeta(request: Request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  const ipAddress =
    fwd.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined;
  const userAgent =
    request.headers.get("user-agent")?.slice(0, 512) || undefined;
  return { ipAddress, userAgent };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const timeRange =
    (searchParams.get("timeRange") as "15m" | "1h" | "24h" | "7d" | "all") ||
    "24h";
  const user = searchParams.get("user") || undefined;
  const level = searchParams.get("level") || undefined;
  const service = searchParams.get("service") || undefined;
  const search = searchParams.get("search") || undefined;
  const sortBy =
    (searchParams.get("sortBy") as "timestamp" | "severity" | "duration") ||
    "timestamp";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 250;

  const result = getLogs({
    timeRange,
    user,
    level,
    service,
    search,
    sortBy,
    sortDir,
    limit,
  });

  // Also include recent backend audit events when authenticated as IT user
  try {
    const itUser = await currentUser();
    if (itUser && (!service || service === "all" || service === "backend/audit")) {
      const auditPage = await asUser(() =>
        listAuditEvents(itUser.token, {}),
      ).catch(() => null);
      if (auditPage?.items?.length) {
        const existingIds = new Set(result.items.map((i) => i.id));
        const auditLogs: LogEntry[] = auditPage.items
          .filter((ev) => !existingIds.has(`audit-${ev.id}`))
          .map((ev) => ({
            id: `audit-${ev.id}`,
            timestamp: ev.occurredAt,
            level: "INFO" as LogLevel,
            service: `backend/${ev.service || "audit"}`,
            user: ev.actor || "system",
            action: `${ev.entity}.${ev.verb}`.toUpperCase(),
            message: `${ev.verb} ${ev.entity} ${ev.subject}`.trim(),
            traceId: ev.traceId ?? undefined,
            ipAddress:
              typeof ev.payload?.ip === "string" ? ev.payload.ip : undefined,
            metadata: ev.payload ?? undefined,
          }))
          .filter((entry) => {
            if (level && level !== "ALL" && entry.level !== level) return false;
            if (user && user !== "all" && !entry.user.toLowerCase().includes(user.toLowerCase())) return false;
            if (search) {
              const q = search.toLowerCase();
              if (
                !entry.message.toLowerCase().includes(q) &&
                !entry.action.toLowerCase().includes(q) &&
                !entry.user.toLowerCase().includes(q)
              ) {
                return false;
              }
            }
            return true;
          });
        const merged = [...result.items, ...auditLogs]
          .sort((a, b) => {
            const cmp =
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            return sortDir === "desc" ? -cmp : cmp;
          })
          .slice(0, limit);
        return NextResponse.json({
          items: merged,
          totalCount: result.totalCount + auditLogs.length,
          bufferSize: result.bufferSize,
        });
      }
    }
  } catch {
    // non-fatal: return ring buffer logs
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const meta = requestClientMeta(request);

    const entry: Omit<LogEntry, "id"> = {
      timestamp: body.timestamp || new Date().toISOString(),
      level: (body.level as LogLevel) || "INFO",
      service: body.service || "frontend/unknown",
      user: body.user || "anonymous",
      action: body.action || "CLIENT_EVENT",
      message: body.message || "",
      durationMs: body.durationMs,
      traceId: body.traceId,
      ipAddress: body.ipAddress || meta.ipAddress,
      userAgent: body.userAgent || meta.userAgent,
      metadata: body.metadata,
    };

    pushLogs([entry]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to ingest log" },
      { status: 500 },
    );
  }
}
