import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../lib/api/index", () => ({
  apiUrl: () => "http://127.0.0.1:8080",
  apiTimeoutMs: () => 5000,
  serviceCaller: () => "web",
  serviceToken: vi.fn(async () => "svc-jwt-token"),
}));

vi.mock("../../lib/identity-session", () => ({
  ACCESS_COOKIE: "platform_customer_access",
  verifyAccessToken: vi.fn(async () => null),
}));

vi.mock("@platform/database", () => ({
  getCustomerProfile: vi.fn(async () => null),
}));

import { POST } from "../../app/api/error-report/route";

describe("POST /api/error-report", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 on malformed JSON or non-object payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/error-report", {
      method: "POST",
      body: "{bad json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ ok: false, error: "invalid_request" });
  });

  it("forwards enriched ITSM ticket with IP, device/OS/browser, and anonymous visitor fallback", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "ticket-uuid-1", ticketNumber: 108, status: "new" }),
        { status: 201 },
      ),
    );

    const req = new NextRequest("http://localhost:3000/api/error-report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.42, 10.0.0.1",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify({
        errorCode: "500",
        incidentId: "ERR-20261125-ABC123",
        statusCode: 500,
        route: "/en/work",
        url: "https://example.test/en/work",
        timestamp: "2026-11-25T12:00:00.000Z",
        message: "TypeError: Cannot read properties of null",
        stack: "Error: boom\n  at WorkPage",
        digest: "dig-777",
        clientMeta: {
          viewport: "390x844",
          language: "en-US",
          platform: "iPhone",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      ticketId: "ticket-uuid-1",
      ticketNumber: 108,
      incidentId: "ERR-20261125-ABC123",
      status: "new",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [targetUrl, init] = fetchMock.mock.calls[0];
    expect(targetUrl).toBe("http://127.0.0.1:8080/v1/itsm/requests/tickets");
    const forwarded = JSON.parse(String(init?.body));
    expect(forwarded).toMatchObject({
      category: "software",
      subcategory: "system_issue",
      priority: "critical",
      requesterName: "Anonymous Visitor (web)",
      requesterEmail: "anonymous+web@visitor.invalid",
    });
    expect(forwarded.requesterId).toMatch(/^visitor:/);
    expect(forwarded.description).toContain("Client IP: 203.0.113.42");
    expect(forwarded.description).toContain("Device Type: mobile");
    expect(forwarded.description).toContain("Browser / OS: Safari / iOS");
    expect(forwarded.description).toContain("TypeError: Cannot read properties of null");
  });

  it("returns 502 when ITSM upstream fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("down", { status: 503 }));
    const req = new NextRequest("http://localhost:3000/api/error-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ errorCode: "404", statusCode: 404, route: "/missing" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: "report_failed" });
  });
});
