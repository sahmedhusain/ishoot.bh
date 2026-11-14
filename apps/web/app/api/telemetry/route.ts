import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const itBaseUrl = () =>
  (process.env.IT_INTERNAL_URL || "http://localhost:3002").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawLogs = Array.isArray(body?.logs) ? body.logs : [];
    if (rawLogs.length === 0) return NextResponse.json({ ok: true, count: 0 });
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ipAddress =
      fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || undefined;
    const userAgent = req.headers.get("user-agent")?.slice(0, 512) || undefined;

    const logs = rawLogs.slice(0, 50).map((item: any) => ({
      timestamp: typeof item?.timestamp === "string" ? item.timestamp : new Date().toISOString(),
      level: item?.level || "INFO",
      service: "frontend/web",
      user: typeof item?.user === "string" ? item.user : "visitor",
      action: typeof item?.action === "string" ? item.action : "CLIENT_EVENT",
      message: typeof item?.message === "string" ? item.message.slice(0, 2000) : "",
      ipAddress,
      userAgent,
      metadata: item?.metadata && typeof item.metadata === "object" ? item.metadata : undefined,
    }));

    void fetch(`${itBaseUrl()}/api/logs/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
      signal: AbortSignal.timeout(1500),
    }).catch(() => {});

    return NextResponse.json({ ok: true, count: logs.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
