import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createTicket } from "../../../lib/api/itsm";
import { currentUser } from "../../../lib/session";

export const dynamic = "force-dynamic";

const ALLOWED_PRIORITIES = new Set(["critical", "high", "normal", "low"]);

type ErrorReportPayload = {
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
  } | null;
};

function asCleanString(value: unknown, max = 512): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function extractClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}

function parseUserAgent(ua: string): {
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: string;
  browser: string;
} {
  if (!ua) {
    return { deviceType: "unknown", os: "Unknown", browser: "Unknown" };
  }
  const lower = ua.toLowerCase();

  let deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown" = "desktop";
  if (/bot|crawl|spider|slurp|curl|wget|python|postman/i.test(ua)) {
    deviceType = "bot";
  } else if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|iphone|ipod|android.*mobi|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = "mobile";
  }

  let os = "Unknown";
  if (lower.includes("windows nt")) os = "Windows";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) os = "iOS";
  else if (lower.includes("mac os x") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("cros")) os = "ChromeOS";
  else if (lower.includes("linux")) os = "Linux";

  let browser = "Unknown";
  if (lower.includes("edg/") || lower.includes("edge/")) browser = "Microsoft Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) browser = "Safari";

  return { deviceType, os, browser };
}

function resolvePriority(explicitPriority: string, statusCode: number): string {
  if (ALLOWED_PRIORITIES.has(explicitPriority)) return explicitPriority;
  if (statusCode >= 500) return "critical";
  if (statusCode === 403 || statusCode === 404) return "normal";
  return "high";
}

function formatIncidentId(raw: string): string {
  if (raw) return raw.slice(0, 64);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ERR-${day}-${suffix}`;
}

export async function POST(request: Request) {
  let body: ErrorReportPayload;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { ok: false, error: "invalid_request", message: "Request body must be a JSON object." },
        { status: 400 },
      );
    }
    body = parsed as ErrorReportPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const rawStatus = typeof body.statusCode === "number" ? body.statusCode : Number(body.statusCode);
  const statusCode = Number.isFinite(rawStatus) && rawStatus >= 100 && rawStatus <= 599 ? Math.trunc(rawStatus) : 500;
  const errorCode = asCleanString(body.errorCode, 32) || String(statusCode);
  const incidentId = formatIncidentId(asCleanString(body.incidentId, 64));
  const route = asCleanString(body.route, 256) || "/";
  const url = asCleanString(body.url, 1024) || route;
  const timestamp = asCleanString(body.timestamp, 64) || new Date().toISOString();
  const message = asCleanString(body.message, 2000) || "No technical message captured.";
  const digest = asCleanString(body.digest, 128) || "none";
  const rawStack = asCleanString(body.stack, 8000);
  const explicitPriority = asCleanString(body.priority, 16).toLowerCase();
  const priority = resolvePriority(explicitPriority, statusCode);

  const clientMeta = body.clientMeta && typeof body.clientMeta === "object" ? body.clientMeta : null;
  const viewport = asCleanString(clientMeta?.viewport, 64) || "unknown";
  const language = asCleanString(clientMeta?.language, 64) || "unknown";
  const platform = asCleanString(clientMeta?.platform, 128) || "unknown";
  const referrer = asCleanString(clientMeta?.referrer, 512) || "none";

  const user = await currentUser().catch(() => null);
  const requesterId = user?.subject
    ? user.subject.slice(0, 64)
    : `visitor:${crypto.randomUUID().slice(0, 12)}`;
  const requesterName = user
    ? (user.email || user.subject).slice(0, 120)
    : "Anonymous Visitor (it)";
  const requesterEmail = user?.email
    ? user.email.slice(0, 160)
    : "anonymous+it@visitor.invalid";

  const clientIp = extractClientIp(request);
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 512);
  const { deviceType, os, browser } = parseUserAgent(userAgent);

  const title = `[IT ${errorCode}] ${incidentId} — ${route}`.slice(0, 200);

  const headerLines = [
    `Incident ID: ${incidentId}`,
    `Error Code: ${errorCode}`,
    `HTTP Status: ${statusCode}`,
    `App: it`,
    `Route: ${route}`,
    `URL: ${url}`,
    `Timestamp (UTC): ${timestamp}`,
    "",
    "--- User ---",
    `Name: ${requesterName}`,
    `Requester ID: ${requesterId}`,
    `Email: ${requesterEmail}`,
    `Roles: ${user?.roles?.length ? user.roles.join(", ") : "anonymous"}`,
    "",
    "--- Client & Network ---",
    `Client IP: ${clientIp}`,
    `Device Type: ${deviceType}`,
    `Browser / OS: ${browser} / ${os}`,
    `Viewport: ${viewport}`,
    `Platform: ${platform}`,
    `Language: ${language}`,
    `Referrer: ${referrer}`,
    `User-Agent: ${userAgent || "unknown"}`,
    "",
    "--- Technical Diagnostics ---",
    `Digest: ${digest}`,
    `Technical Error: ${message}`,
  ];

  const baseDescription = headerLines.join("\n");
  const stackHeader = "\n\nStack Trace:\n";
  const maxTotal = 9500;
  let description = baseDescription;
  if (rawStack) {
    const remaining = Math.max(0, maxTotal - baseDescription.length - stackHeader.length);
    if (remaining > 64) {
      const clippedStack =
        rawStack.length > remaining
          ? `${rawStack.slice(0, remaining - 20)}\n...[truncated]`
          : rawStack;
      description = `${baseDescription}${stackHeader}${clippedStack}`;
    }
  }

  try {
    const ticket = await createTicket({
      requesterId,
      requesterName,
      requesterEmail,
      category: "software",
      subcategory: "system_issue",
      priority,
      title,
      description: description.slice(0, 10000),
    });

    return NextResponse.json(
      {
        ok: true,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        incidentId,
        status: ticket.status,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "report_failed",
        message: "Unable to create an ITSM ticket for this error right now.",
      },
      { status: 502 },
    );
  }
}
