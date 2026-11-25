import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiTimeoutMs, apiUrl, serviceCaller, serviceToken } from "../../../lib/api/index";
import { ACCESS_COOKIE, verifyAccessToken } from "../../../lib/identity-session";
import { getCustomerProfile } from "@platform/database";

export const dynamic = "force-dynamic";

type ErrorReportBody = {
  errorCode?: string;
  incidentId?: string;
  statusCode?: number;
  route?: string;
  url?: string;
  timestamp?: string;
  message?: string;
  stack?: string;
  digest?: string;
  priority?: string;
  clientMeta?: {
    viewport?: string;
    language?: string;
    platform?: string;
    referrer?: string;
  };
};

function parseUserAgent(ua: string): {
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: string;
  browser: string;
} {
  if (!ua) return { deviceType: "unknown", os: "Unknown", browser: "Unknown" };
  const lower = ua.toLowerCase();

  const deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown" =
    /bot|crawl|spider|slurp|headless|lighthouse/i.test(lower)
      ? "bot"
      : /ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(lower)
        ? "tablet"
        : /mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(lower)
          ? "mobile"
          : /mozilla|chrome|safari|firefox|edg|opera/i.test(lower)
            ? "desktop"
            : "unknown";

  const os = /windows nt/i.test(ua)
    ? "Windows"
    : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /mac os x/i.test(ua)
        ? "macOS"
        : /android/i.test(ua)
          ? "Android"
          : /linux/i.test(ua)
            ? "Linux"
            : "Unknown";

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\//i.test(ua) || /opera/i.test(ua)
      ? "Opera"
      : /chrome|crios/i.test(ua) && !/edg/i.test(ua)
        ? "Chrome"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /safari/i.test(ua) && !/chrome|crios/i.test(ua)
            ? "Safari"
            : "Unknown";

  return { deviceType, os, browser };
}

function generateIncidentId(): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ERR-${day}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function resolvePriority(explicit: unknown, statusCode: number): "critical" | "high" | "normal" | "low" {
  if (typeof explicit === "string" && ["critical", "high", "normal", "low"].includes(explicit)) {
    return explicit as "critical" | "high" | "normal" | "low";
  }
  if (statusCode >= 500) return "critical";
  if (statusCode === 403 || statusCode === 404) return "normal";
  return "high";
}

function truncate(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, Math.max(0, max - 3))}...` : trimmed;
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Payload must be a JSON object." },
      { status: 400 },
    );
  }

  const body = raw as ErrorReportBody;
  const statusCode =
    typeof body.statusCode === "number" && Number.isFinite(body.statusCode)
      ? Math.trunc(body.statusCode)
      : 500;
  const errorCode = truncate(body.errorCode || String(statusCode), 64);
  if (!errorCode) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Missing errorCode." },
      { status: 400 },
    );
  }

  const appName = serviceCaller() || "web";
  const incidentId = truncate(body.incidentId, 64) || generateIncidentId();
  const route = truncate(body.route, 300) || "/";
  const url = truncate(body.url, 1000) || route;
  const timestamp = truncate(body.timestamp, 64) || new Date().toISOString();
  const digest = truncate(body.digest, 128);
  const technicalMessage = truncate(body.message, 1500);
  const priority = resolvePriority(body.priority, statusCode);

  const fwd = req.headers.get("x-forwarded-for") || "";
  const clientIp =
    fwd.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const userAgent = truncate(req.headers.get("user-agent"), 512) || "unknown";
  const parsedUa = parseUserAgent(userAgent);

  let requesterId = `visitor:${randomUUID().slice(0, 12)}`;
  let requesterName = `Anonymous Visitor (${appName})`;
  let requesterEmail = `anonymous+${appName}@visitor.invalid`;

  try {
    const tokenCookie = req.cookies.get(ACCESS_COOKIE)?.value;
    const verified = await verifyAccessToken(tokenCookie);
    if (verified?.customerId) {
      const profile = await getCustomerProfile(verified.customerId).catch(() => null);
      requesterId = verified.customerId.slice(0, 64);
      requesterName = (profile?.name || profile?.email || verified.customerId).slice(0, 120);
      requesterEmail = profile?.email || requesterEmail;
    }
  } catch {
    // Keep anonymous visitor fallback if session verification is unavailable.
  }

  const clientMeta = body.clientMeta && typeof body.clientMeta === "object" ? body.clientMeta : {};
  const title = `[${appName.toUpperCase()} ${errorCode}] ${incidentId} — ${route}`.slice(0, 200);

  const headerLines = [
    `Incident ID: ${incidentId}`,
    `Error Code: ${errorCode}`,
    `HTTP Status: ${statusCode}`,
    `App: ${appName}`,
    `Route: ${route}`,
    `URL: ${url}`,
    `Timestamp (UTC): ${timestamp}`,
    `User: ${requesterName} (${requesterId} / ${requesterEmail})`,
    `Client IP: ${clientIp}`,
    `Device Type: ${parsedUa.deviceType}`,
    `Browser / OS: ${parsedUa.browser} / ${parsedUa.os}`,
    `Client Metadata: viewport=${truncate(clientMeta.viewport, 40) || "n/a"}, platform=${truncate(clientMeta.platform, 80) || "n/a"}, language=${truncate(clientMeta.language, 40) || "n/a"}, referrer=${truncate(clientMeta.referrer, 300) || "n/a"}`,
    `User-Agent: ${userAgent}`,
    digest ? `Digest: ${digest}` : "",
    technicalMessage ? `Technical Error: ${technicalMessage}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const stackPrefix = "\n\nStack Trace:\n";
  const rawStack = typeof body.stack === "string" ? body.stack.trim() : "";
  const maxStackLen = Math.max(0, 9500 - headerLines.length - stackPrefix.length);
  const stackBlock =
    rawStack && maxStackLen > 40
      ? `${stackPrefix}${truncate(rawStack, maxStackLen)}`
      : "";
  const description = `${headerLines}${stackBlock}`.slice(0, 10000);

  try {
    const token = await serviceToken();
    const res = await fetch(`${apiUrl()}/v1/itsm/requests/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        category: "software",
        subcategory: "system_issue",
        priority,
        requesterId,
        requesterName,
        requesterEmail,
      }),
      signal: AbortSignal.timeout(apiTimeoutMs()),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "report_failed",
          message: `ITSM ticket creation failed with status ${res.status}.`,
        },
        { status: 502 },
      );
    }

    const created = (await res.json().catch(() => ({}))) as {
      id?: string;
      ticketId?: string;
      ticketNumber?: number;
      number?: number;
      status?: string;
    };

    return NextResponse.json(
      {
        ok: true,
        ticketId: created.id || created.ticketId || null,
        ticketNumber: created.ticketNumber ?? created.number ?? null,
        incidentId,
        status: created.status || "new",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "report_failed",
        message: "Unable to reach ITSM service.",
      },
      { status: 502 },
    );
  }
}
