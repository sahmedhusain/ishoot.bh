import { NextResponse } from "next/server";
import { pushLogs, type LogEntry } from "../../../../lib/logger-queue";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.logs)) {
      return NextResponse.json(
        { error: "Invalid payload: logs array required" },
        { status: 400 },
      );
    }

    const fwd = request.headers.get("x-forwarded-for") || "";
    const reqIp =
      fwd.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      undefined;
    const reqUa =
      request.headers.get("user-agent")?.slice(0, 512) || undefined;

    const validLogs: Omit<LogEntry, "id">[] = body.logs.map(
      (item: Partial<LogEntry>) => ({
        timestamp: item.timestamp || new Date().toISOString(),
        level: item.level || "INFO",
        service: item.service || "frontend/client",
        user: item.user || "anonymous",
        action: item.action || "CLIENT_BATCH_EVENT",
        message: item.message || "",
        durationMs: item.durationMs,
        traceId: item.traceId,
        ipAddress: item.ipAddress || reqIp,
        userAgent: item.userAgent || reqUa,
        metadata: item.metadata,
      }),
    );

    pushLogs(validLogs);
    return NextResponse.json({ ok: true, count: validLogs.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to ingest log batch" },
      { status: 500 },
    );
  }
}
