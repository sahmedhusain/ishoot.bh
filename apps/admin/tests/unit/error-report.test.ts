import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildErrorReportTicket,
  extractClientIp,
  parseUserAgent,
  validateErrorReportPayload,
} from "../../lib/error-report";

const mockGetCurrentUser = vi.fn();
const mockCreateTicket = vi.fn();

vi.mock("../../lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("../../lib/api/itsm", () => ({
  createTicket: (body: unknown) => mockCreateTicket(body),
}));

import { POST } from "../../app/api/error-report/route";

describe("error-report helpers and route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts client IP and classifies user agent strings", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.24, 10.0.0.1",
      "user-agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    expect(extractClientIp(headers)).toBe("198.51.100.24");
    expect(parseUserAgent(headers.get("user-agent"))).toMatchObject({
      deviceType: "mobile",
      os: "iOS",
      browser: "Safari",
    });

    const desktopUa = parseUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    );
    expect(desktopUa).toMatchObject({
      deviceType: "desktop",
      os: "macOS",
      browser: "Chrome",
    });
  });

  it("validates payload fields and builds structured ITSM tickets", () => {
    expect(validateErrorReportPayload({ errorCode: "HTTP-500" }).ok).toBe(false);
    const valid = validateErrorReportPayload({
      errorCode: "HTTP-500",
      incidentId: "INC-20261125-500-AB12CD",
      statusCode: 500,
      route: "/dashboard/orders",
      url: "https://admin.example.test/dashboard/orders",
      timestamp: "2026-11-25T10:00:00.000Z",
      message: "Database connection failed",
      stack: "Error: Database connection failed\n    at loader",
      clientMeta: { viewport: "1440x900", language: "en" },
    });
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;

    const ticket = buildErrorReportTicket(valid.data, {
      user: {
        id: "user-1",
        full_name: "Tariq Al-Zayed",
        email: "tariq@example.test",
        role: "admin",
      },
      ip: "203.0.113.5",
      ua: parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/132.0"),
      visitorId: "vis-1",
    });

    expect(ticket.category).toBe("software");
    expect(ticket.subcategory).toBe("system_issue");
    expect(ticket.priority).toBe("critical");
    expect(ticket.requesterId).toBe("user-1");
    expect(ticket.title).toContain("HTTP-500");
    expect(ticket.description).toContain("Client IP: 203.0.113.5");
    expect(ticket.description).toContain("Browser / OS: Firefox / Windows");
    expect(ticket.description).toContain("Stack Trace:");
  });

  it("returns 400 on invalid payloads", async () => {
    const req = new Request("https://admin.example.test/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route: "/dashboard" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: "invalid_request" });
  });

  it("creates an ITSM ticket for anonymous visitors and returns 201", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    mockCreateTicket.mockResolvedValueOnce({
      id: "tkt-1",
      number: 108,
      status: "open",
    });

    const req = new Request("https://admin.example.test/api/error-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-real-ip": "192.0.2.44",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        errorCode: "HTTP-404",
        incidentId: "INC-20261125-404-XYZ999",
        statusCode: 404,
        route: "/dashboard/missing",
        url: "https://admin.example.test/dashboard/missing",
        timestamp: "2026-11-25T10:15:00.000Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ok: true,
      ticketId: "tkt-1",
      ticketNumber: 108,
      incidentId: "INC-20261125-404-XYZ999",
      status: "open",
    });
    expect(mockCreateTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterEmail: "anonymous+admin@visitor.invalid",
        priority: "normal",
        category: "software",
        subcategory: "system_issue",
      }),
    );
  });

  it("returns 502 when upstream ITSM ticket creation fails", async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: "u-1", email: "a@b.test", full_name: "Admin" });
    mockCreateTicket.mockRejectedValueOnce(new Error("ITSM down"));

    const req = new Request("https://admin.example.test/api/error-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorCode: "HTTP-500",
        incidentId: "INC-20261125-500-ERR111",
        statusCode: 500,
        route: "/dashboard",
        url: "https://admin.example.test/dashboard",
        timestamp: "2026-11-25T10:20:00.000Z",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, error: "report_failed" });
  });
});
