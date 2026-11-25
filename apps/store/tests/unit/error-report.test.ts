import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mockServiceToken = vi.fn(async () => "svc-tok-123");
const mockCurrentCustomer = vi.fn<() => Promise<{ id: string; name?: string | null; email?: string | null } | null>>(
  async () => ({ id: "cust-42", name: "Noor Ali", email: "noor@example.test" }),
);

vi.mock("../../lib/api/config", () => ({
  apiUrl: () => "https://api.internal.test",
  apiTimeoutMs: () => 5000,
}));

vi.mock("../../lib/api/service-token", () => ({
  serviceToken: () => mockServiceToken(),
}));

vi.mock("../../lib/customer", () => ({
  currentCustomer: () => mockCurrentCustomer(),
}));

import { POST } from "../../app/api/error-report/route";

describe("POST /api/error-report", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockServiceToken.mockResolvedValue("svc-tok-123");
    mockCurrentCustomer.mockResolvedValue({
      id: "cust-42",
      name: "Noor Ali",
      email: "noor@example.test",
    });
  });

  test("returns 400 for invalid JSON payload", async () => {
    const req = new NextRequest("https://store.example.test/api/error-report", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("submits signed-in customer error report as ITSM ticket with IP and UA context", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "tkt-9", number: 409, status: "new" }), {
        status: 201,
      }),
    );

    const req = new NextRequest("https://store.example.test/api/error-report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.24, 10.0.0.1",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        errorCode: "500",
        incidentId: "ERR-20261125-ABC123",
        statusCode: 500,
        route: "/en/checkout",
        url: "https://store.example.test/en/checkout",
        message: "TypeError: Cannot read properties of null",
        stack: "TypeError: Cannot read properties of null\n    at CheckoutView",
        digest: "NEXT_DIGEST_99",
        clientMeta: { viewport: "1440x900", language: "en-US", platform: "MacIntel" },
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(json).toMatchObject({
      ok: true,
      ticketId: "tkt-9",
      ticketNumber: 409,
      incidentId: "ERR-20261125-ABC123",
      status: "new",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [targetUrl, init] = fetchSpy.mock.calls[0]!;
    expect(targetUrl).toBe("https://api.internal.test/v1/itsm/requests/tickets");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer svc-tok-123");

    const sentBody = JSON.parse(String(init?.body)) as Record<string, string>;
    expect(sentBody.category).toBe("software");
    expect(sentBody.subcategory).toBe("system_issue");
    expect(sentBody.priority).toBe("critical");
    expect(sentBody.requesterId).toBe("cust-42");
    expect(sentBody.requesterEmail).toBe("noor@example.test");
    expect(sentBody.description).toContain("Client IP: 198.51.100.24");
    expect(sentBody.description).toContain("Device Type: desktop");
    expect(sentBody.description).toContain("Chrome / macOS");
    expect(sentBody.description).toContain("Stack Trace:");
    expect(sentBody.description).toContain("NEXT_DIGEST_99");
  });

  test("falls back to anonymous visitor identity when customer is not signed in", async () => {
    mockCurrentCustomer.mockResolvedValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "tkt-10", number: 410, status: "new" }), {
        status: 201,
      }),
    );

    const req = new NextRequest("https://store.example.test/api/error-report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "203.0.113.7",
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify({ errorCode: "404", statusCode: 404, route: "/en/missing" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const sentBody = JSON.parse(String(fetchSpy.mock.calls[0]![1]?.body)) as Record<string, string>;
    expect(sentBody.requesterId).toMatch(/^visitor:/);
    expect(sentBody.requesterEmail).toBe("anonymous+store@visitor.invalid");
    expect(sentBody.priority).toBe("normal");
    expect(sentBody.description).toContain("Device Type: mobile");
    expect(sentBody.description).toContain("Safari / iOS");
  });
});
