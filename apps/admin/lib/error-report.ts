import type { NewTicket } from "./api/itsm";

export interface ErrorReportPayload {
  errorCode: string;
  incidentId: string;
  statusCode: number;
  route: string;
  url: string;
  timestamp: string;
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
}

export interface ParsedUserAgent {
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  os: string;
  browser: string;
  raw: string;
}

export interface ErrorReportUser {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
}

const VALID_PRIORITIES = new Set(["critical", "high", "normal", "low"]);

/** Extracts the client IP from standard reverse-proxy headers. */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Classifies device type, OS, and browser cleanly from a User-Agent string. */
export function parseUserAgent(uaHeader: string | null | undefined): ParsedUserAgent {
  const raw = (uaHeader ?? "").trim();
  if (!raw) {
    return { deviceType: "unknown", os: "Unknown OS", browser: "Unknown Browser", raw: "" };
  }

  let deviceType: ParsedUserAgent["deviceType"] = "desktop";
  if (/bot|crawler|spider|slurp|curl|wget|headless/i.test(raw)) {
    deviceType = "bot";
  } else if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(raw)) {
    deviceType = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(raw)) {
    deviceType = "mobile";
  }

  let os = "Unknown OS";
  if (/iphone|ipad|ipod/i.test(raw)) os = "iOS";
  else if (/android/i.test(raw)) os = "Android";
  else if (/mac os x|macintosh/i.test(raw)) os = "macOS";
  else if (/windows nt/i.test(raw)) os = "Windows";
  else if (/cros/i.test(raw)) os = "ChromeOS";
  else if (/linux/i.test(raw)) os = "Linux";

  let browser = "Unknown Browser";
  if (/edg\//i.test(raw)) browser = "Edge";
  else if (/opr\/|opera/i.test(raw)) browser = "Opera";
  else if (/firefox\//i.test(raw)) browser = "Firefox";
  else if (/chrome\/|crios\//i.test(raw) && !/edg\//i.test(raw)) browser = "Chrome";
  else if (/safari\//i.test(raw) && !/chrome\/|crios\//i.test(raw)) browser = "Safari";

  return { deviceType, os, browser, raw };
}

/** Validates and normalizes incoming POST /api/error-report payloads. */
export function validateErrorReportPayload(raw: unknown):
  | { ok: true; data: ErrorReportPayload }
  | { ok: false; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const obj = raw as Record<string, unknown>;
  const str = (k: string, max = 500) =>
    typeof obj[k] === "string" ? obj[k].trim().slice(0, max) : "";

  const errorCode = str("errorCode", 64);
  const incidentId = str("incidentId", 64);
  const route = str("route", 500);
  const url = str("url", 1500);
  const statusCode = Number(obj.statusCode);

  if (!errorCode) return { ok: false, message: "errorCode is required." };
  if (!incidentId) return { ok: false, message: "incidentId is required." };
  if (!Number.isFinite(statusCode) || statusCode < 100 || statusCode > 599) {
    return { ok: false, message: "statusCode must be a valid HTTP status code." };
  }
  if (!route) return { ok: false, message: "route is required." };
  if (!url) return { ok: false, message: "url is required." };

  const timestamp =
    typeof obj.timestamp === "string" && obj.timestamp.trim()
      ? obj.timestamp.trim().slice(0, 64)
      : new Date().toISOString();

  const metaRaw =
    obj.clientMeta && typeof obj.clientMeta === "object" && !Array.isArray(obj.clientMeta)
      ? (obj.clientMeta as Record<string, unknown>)
      : undefined;

  const metaStr = (k: string, max = 200) =>
    metaRaw && typeof metaRaw[k] === "string" ? metaRaw[k].trim().slice(0, max) : undefined;

  return {
    ok: true,
    data: {
      errorCode,
      incidentId,
      statusCode: Math.trunc(statusCode),
      route,
      url,
      timestamp,
      message: typeof obj.message === "string" ? obj.message.trim().slice(0, 2000) : undefined,
      stack: typeof obj.stack === "string" ? obj.stack.trim() : undefined,
      digest: typeof obj.digest === "string" ? obj.digest.trim().slice(0, 200) : undefined,
      priority:
        typeof obj.priority === "string" && VALID_PRIORITIES.has(obj.priority.trim())
          ? obj.priority.trim()
          : undefined,
      clientMeta: metaRaw
        ? {
            viewport: metaStr("viewport", 64),
            language: metaStr("language", 32),
            platform: metaStr("platform", 64),
            referrer: metaStr("referrer", 500),
          }
        : undefined,
    },
  };
}

/** Formats the ITSM ticket payload with requester, environment, and hidden diagnostics. */
export function buildErrorReportTicket(
  payload: ErrorReportPayload,
  context: {
    user: ErrorReportUser | null;
    ip: string;
    ua: ParsedUserAgent;
    visitorId: string;
  },
): NewTicket {
  const priority =
    payload.priority && VALID_PRIORITIES.has(payload.priority)
      ? payload.priority
      : payload.statusCode >= 500
        ? "critical"
        : payload.statusCode === 403 || payload.statusCode === 404
          ? "normal"
          : "high";

  const requesterId = context.user?.id || `visitor:${context.visitorId}`;
  const requesterName =
    context.user?.full_name?.trim() ||
    context.user?.email?.trim() ||
    context.user?.id ||
    "Anonymous Visitor (admin)";
  const requesterEmail = context.user?.email?.trim() || "anonymous+admin@visitor.invalid";
  const userSummary = context.user
    ? `${requesterName} (${requesterEmail}${context.user.role ? `, role=${context.user.role}` : ""}, id=${context.user.id})`
    : "Anonymous / Unauthenticated visitor";

  const title = `[ADMIN ${payload.errorCode}] ${payload.incidentId} — ${payload.route}`.slice(0, 200);

  const clientMetaLines: string[] = [];
  if (payload.clientMeta?.viewport) clientMetaLines.push(`Viewport: ${payload.clientMeta.viewport}`);
  if (payload.clientMeta?.language) clientMetaLines.push(`Language: ${payload.clientMeta.language}`);
  if (payload.clientMeta?.platform) clientMetaLines.push(`Platform: ${payload.clientMeta.platform}`);
  if (payload.clientMeta?.referrer) clientMetaLines.push(`Referrer: ${payload.clientMeta.referrer}`);

  const headerLines = [
    `Incident ID: ${payload.incidentId}`,
    `Error Code: ${payload.errorCode}`,
    `HTTP Status: ${payload.statusCode}`,
    `App: admin`,
    `Route / URL: ${payload.route} | ${payload.url}`,
    `Timestamp (UTC): ${payload.timestamp}`,
    `User: ${userSummary}`,
    `Client IP: ${context.ip}`,
    `Device Type: ${context.ua.deviceType}`,
    `Browser / OS: ${context.ua.browser} / ${context.ua.os}`,
    ...(context.ua.raw ? [`User-Agent: ${context.ua.raw.slice(0, 400)}`] : []),
    ...(clientMetaLines.length ? [`Client Metadata: ${clientMetaLines.join(" | ")}`] : []),
    ...(payload.digest ? [`Digest: ${payload.digest}`] : []),
    `Technical Error: ${payload.message || "(none)"}`,
  ].join("\n");

  const stackPrefix = "\n\nStack Trace:\n";
  const maxTotalLength = 9500;
  let description = headerLines;
  if (payload.stack) {
    const budget = Math.max(0, maxTotalLength - headerLines.length - stackPrefix.length);
    if (budget > 0) {
      const truncatedStack =
        payload.stack.length > budget
          ? `${payload.stack.slice(0, Math.max(0, budget - 16))}\n...[truncated]`
          : payload.stack;
      description = `${headerLines}${stackPrefix}${truncatedStack}`;
    }
  }

  return {
    requesterId,
    requesterName,
    requesterEmail,
    category: "software",
    subcategory: "system_issue",
    priority,
    title,
    description: description.slice(0, 10_000),
  };
}
