import { NextResponse } from "next/server";
import { pushLogs, type LogEntry } from "../../../../lib/logger-queue";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.logs)) {
      return NextResponse.json({ error: "Invalid payload: logs array required" }, { status: 400 });
    }

    const validLogs: Omit<LogEntry, "id">[] = body.logs.map((item: Partial<LogEntry>) => ({
      timestamp: item.timestamp || new Date().toISOString(),
      level: item.level || "INFO",
      service: item.service || "frontend/client",
      user: item.user || "anonymous",
      action: item.action || "CLIENT_BATCH_EVENT",
      message: item.message || "",
      durationMs: item.durationMs,
      traceId: item.traceId,
      metadata: item.metadata,
    }));

    pushLogs(validLogs);
    return NextResponse.json({ ok: true, count: validLogs.length });
  } catch {
    return NextResponse.json({ error: "Failed to ingest log batch" }, { status: 500 });
  }
}
