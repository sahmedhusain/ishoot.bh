import { NextRequest, NextResponse } from "next/server";
import { emitItTelemetry, type TelemetryEvent } from "../../../lib/telemetry";
import { ACCESS_COOKIE, verifyAccessToken } from "../../../lib/identity-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawLogs = Array.isArray(body?.logs) ? body.logs : [];
    if (rawLogs.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }
    const staff = await verifyAccessToken(
      req.cookies.get(ACCESS_COOKIE)?.value,
    ).catch(() => null);
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ipAddress =
      fwd.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      undefined;
    const userAgent = req.headers.get("user-agent")?.slice(0, 512) || undefined;

    const events: TelemetryEvent[] = rawLogs.slice(0, 50).map((item: any) => ({
      timestamp:
        typeof item?.timestamp === "string"
          ? item.timestamp
          : new Date().toISOString(),
      level: item?.level || "INFO",
      service:
        typeof item?.service === "string" ? item.service : "frontend/admin",
      user: staff?.userId || (typeof item?.user === "string" ? item.user : "anonymous"),
      action: typeof item?.action === "string" ? item.action : "CLIENT_EVENT",
      message: typeof item?.message === "string" ? item.message.slice(0, 2000) : "",
      ipAddress,
      userAgent,
      metadata:
        item?.metadata && typeof item.metadata === "object"
          ? item.metadata
          : undefined,
    }));

    void emitItTelemetry(events);
    return NextResponse.json({ ok: true, count: events.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
