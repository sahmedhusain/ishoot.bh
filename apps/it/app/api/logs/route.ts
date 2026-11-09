import { NextResponse } from "next/server";
import { getLogs, pushLogs, type LogEntry, type LogLevel } from "../../../lib/logger-queue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const timeRange = (searchParams.get("timeRange") as "15m" | "1h" | "24h" | "7d" | "all") || "24h";
  const user = searchParams.get("user") || undefined;
  const level = searchParams.get("level") || undefined;
  const service = searchParams.get("service") || undefined;
  const search = searchParams.get("search") || undefined;
  const sortBy = (searchParams.get("sortBy") as "timestamp" | "severity" | "duration") || "timestamp";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 250;

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

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const entry: Omit<LogEntry, "id"> = {
      timestamp: body.timestamp || new Date().toISOString(),
      level: (body.level as LogLevel) || "INFO",
      service: body.service || "frontend/unknown",
      user: body.user || "anonymous",
      action: body.action || "CLIENT_EVENT",
      message: body.message || "",
      durationMs: body.durationMs,
      traceId: body.traceId,
      metadata: body.metadata,
    };

    pushLogs([entry]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to ingest log" }, { status: 500 });
  }
}
