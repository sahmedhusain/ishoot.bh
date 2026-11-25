import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiTimeoutMs, apiUrl } from "../../../lib/api/config";
import { serviceToken } from "../../../lib/api/service-token";
import { currentCustomer } from "../../../lib/customer";

interface ErrorReportPayload {
  errorCode?: unknown;
  incidentId?: unknown;
  statusCode?: unknown;
  route?: unknown;
  url?: unknown;
  timestamp?: unknown;
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
  priority?: unknown;
  clientMeta?: {
    viewport?: unknown;
    language?: unknown;
    platform?: unknown;
    referrer?: unknown;
  };
}

const clean = (value: unknown, max = 500): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function extractClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}

function parseUserAgent(ua: string): {
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: string;
  browser: string;
} {
  if (!ua) return { deviceType: "unknown", os: "unknown", browser: "unknown" };
  const lower = ua.toLowerCase();
  const deviceType = /bot|crawler|spider|headless|curl|wget/i.test(lower)
    ? "bot"
    : /ipad|tablet|playbook|silk/i.test(lower) || (/android/i.test(lower) && !/mobile/i.test(lower))
      ? "tablet"
      : /iphone|ipod|android.*mobile|windows phone|blackberry|mobile/i.test(lower)
        ? "mobile"
        : "desktop";

  const os = /windows nt 10/i.test(ua)
    ? "Windows 10/11"
    : /windows/i.test(ua)
      ? "Windows"
      : /iphone|ipad|ipod/i.test(ua)
        ? "iOS"
        : /mac os x/i.test(ua)
          ? "macOS"
          : /android/i.test(ua)
            ? "Android"
            : /linux/i.test(ua)
              ? "Linux"
              : "unknown";

  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\//i.test(ua) || /opera/i.test(ua)
      ? "Opera"
      : /chrome\//i.test(ua) && !/chromium/i.test(ua)
        ? "Chrome"
        : /firefox\//i.test(ua)
          ? "Firefox"
          : /safari\//i.test(ua) && !/chrome/i.test(ua)
            ? "Safari"
            : "unknown";

  return { deviceType, os, browser };
}

function resolvePriority(explicit: string, statusCode: number): "critical" | "high" | "normal" | "low" {
  if (explicit === "critical" || explicit === "high" || explicit === "normal" || explicit === "low") {
    return explicit;
  }
  if (statusCode >= 500) return "critical";
  if (statusCode === 403 || statusCode === 404) return "normal";
  return "high";
}

export async function POST(req: NextRequest) {
  let body: ErrorReportPayload;
  try {
    body = (await req.json()) as ErrorReportPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Request body must be an object" },
      { status: 400 },
    );
  }

  const errorCode = clean(body.errorCode, 32) || String(Number(body.statusCode) || 500);
  const statusCode = Number.isFinite(Number(body.statusCode)) ? Number(body.statusCode) : Number(errorCode) || 500;
  const incidentId =
    clean(body.incidentId, 64) ||
    `ERR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const route = clean(body.route, 300) || "/";
  const url = clean(body.url, 1000) || route;
  const timestamp = clean(body.timestamp, 64) || new Date().toISOString();
  const techMessage = clean(body.message, 1500) || "Unhandled storefront exception";
  const digest = clean(body.digest, 120);
  const rawStack = clean(body.stack, 4000);
  const priority = resolvePriority(clean(body.priority, 20), statusCode);

  const clientIp = extractClientIp(req);
  const userAgent = (req.headers.get("user-agent") || "").slice(0, 512);
  const uaInfo = parseUserAgent(userAgent);
  const viewport = clean(body.clientMeta?.viewport, 64) || "unknown";
  const language = clean(body.clientMeta?.language, 64) || "unknown";
  const platform = clean(body.clientMeta?.platform, 64) || "unknown";
  const referrer = clean(body.clientMeta?.referrer, 500) || "none";

  const customer = await currentCustomer().catch(() => null);
  const requesterId = customer?.id
    ? customer.id.slice(0, 64)
    : `visitor:${crypto.randomUUID().slice(0, 12)}`;
  const requesterName = customer
    ? (customer.name || customer.email || "Store Customer").slice(0, 200)
    : "Anonymous Visitor (store)";
  const requesterEmail = customer?.email
    ? customer.email.slice(0, 254)
    : "anonymous+store@visitor.invalid";

  const title = `[STORE ${errorCode}] ${incidentId} — ${route}`.slice(0, 200);

  const headerLines = [
    `Incident ID: ${incidentId}`,
    `Error Code: ${errorCode}`,
    `HTTP Status: ${statusCode}`,
    `App: store`,
    `Route: ${route}`,
    `URL: ${url}`,
    `Timestamp (UTC): ${timestamp}`,
    `User: ${requesterName} (${requesterId}) <${requesterEmail}>`,
    `Client IP: ${clientIp}`,
    `Device Type: ${uaInfo.deviceType}`,
    `Browser / OS: ${uaInfo.browser} / ${uaInfo.os}`,
    `Client Metadata: viewport=${viewport}; platform=${platform}; language=${language}; referrer=${referrer}`,
    `User-Agent: ${userAgent || "unknown"}`,
    digest ? `Digest: ${digest}` : "",
    `Technical Error: ${techMessage}`,
  ]
    .filter(Boolean)
    .join("\n");

  const stackSection = rawStack ? `\n\nStack Trace:\n${rawStack}` : "";
  const description = `${headerLines}${stackSection}`.slice(0, 9500);

  try {
    const token = await serviceToken();
    const res = await fetch(`${apiUrl()}/v1/itsm/requests/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requesterId,
        requesterName,
        requesterEmail,
        category: "software",
        subcategory: "system_issue",
        priority,
        title,
        description,
      }),
      signal: AbortSignal.timeout(apiTimeoutMs()),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "report_failed", message: `ITSM responded with HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const ticket = (await res.json()) as {
      id?: string;
      number?: number;
      status?: string;
    };

    return NextResponse.json(
      {
        ok: true,
        ticketId: ticket.id ?? "",
        ticketNumber: ticket.number ?? null,
        incidentId,
        status: ticket.status ?? "new",
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "report_failed",
        message: err instanceof Error ? err.message : "Failed to forward error report to ITSM",
      },
      { status: 502 },
    );
  }
}
