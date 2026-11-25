import { beforeEach, describe, expect, it, vi } from "vitest";

const createTicketMock = vi.fn();
const currentUserMock = vi.fn();

vi.mock("../../lib/api/itsm", () => ({
  createTicket: createTicketMock,
}));

vi.mock("../../lib/session", () => ({
  currentUser: currentUserMock,
}));

describe("POST /api/error-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid JSON or non-object payload", async () => {
    const { POST } = await import("../../app/api/error-report/route");
    const res = await POST(
      new Request("https://it.example.test/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "[]",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("invalid_request");
  });

  it("creates an ITSM ticket with signed-in user, IP, UA device info, and truncated stack", async () => {
    currentUserMock.mockResolvedValue({
      subject: "it-admin-1",
      sessionId: "sess-1",
      roles: ["it_admin"],
      email: "bader@example.test",
      token: "tok",
    });
    createTicketMock.mockResolvedValue({
      id: "tkt-100",
      number: 42,
      status: "new",
    });

    const { POST } = await import("../../app/api/error-report/route");
    const res = await POST(
      new Request("https://it.example.test/api/error-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          errorCode: "ERR-IT-500",
          incidentId: "IT-500-20261125-ABC123",
          statusCode: 500,
          route: "/tickets",
          url: "https://it.example.test/tickets",
          timestamp: "2026-11-25T12:00:00.000Z",
          message: "Boom!",
          stack: "Error: Boom!\n" + "at line\n".repeat(2000),
          digest: "dig-99",
          clientMeta: {
            viewport: "1440x900",
            language: "en-US",
            platform: "MacIntel",
          },
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      ticketId: string;
      ticketNumber: number;
      incidentId: string;
      status: string;
    };
    expect(body).toEqual({
      ok: true,
      ticketId: "tkt-100",
      ticketNumber: 42,
      incidentId: "IT-500-20261125-ABC123",
      status: "new",
    });

    expect(createTicketMock).toHaveBeenCalledTimes(1);
    const arg = createTicketMock.mock.calls[0][0] as {
      requesterId: string;
      requesterName: string;
      requesterEmail: string;
      category: string;
      subcategory: string;
      priority: string;
      title: string;
      description: string;
    };
    expect(arg.requesterId).toBe("it-admin-1");
    expect(arg.requesterEmail).toBe("bader@example.test");
    expect(arg.category).toBe("software");
    expect(arg.subcategory).toBe("system_issue");
    expect(arg.priority).toBe("critical");
    expect(arg.title).toContain("[IT ERR-IT-500] IT-500-20261125-ABC123");
    expect(arg.description).toContain("Client IP: 203.0.113.10");
    expect(arg.description).toContain("Device Type: desktop");
    expect(arg.description).toContain("Browser / OS: Chrome / macOS");
    expect(arg.description).toContain("Technical Error: Boom!");
    expect(arg.description.length).toBeLessThanOrEqual(10000);
  });

  it("falls back to anonymous visitor requester and returns 502 if ITSM fails", async () => {
    currentUserMock.mockResolvedValue(null);
    createTicketMock.mockRejectedValue(new Error("ITSM down"));

    const { POST } = await import("../../app/api/error-report/route");
    const res = await POST(
      new Request("https://it.example.test/api/error-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "198.51.100.7",
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        },
        body: JSON.stringify({
          errorCode: "ERR-IT-404",
          statusCode: 404,
          route: "/missing",
        }),
      }),
    );

    expect(res.status).toBe(502);
    const arg = createTicketMock.mock.calls[0][0] as {
      requesterId: string;
      requesterName: string;
      requesterEmail: string;
      priority: string;
      description: string;
    };
    expect(arg.requesterId).toMatch(/^visitor:/);
    expect(arg.requesterName).toBe("Anonymous Visitor (it)");
    expect(arg.requesterEmail).toBe("anonymous+it@visitor.invalid");
    expect(arg.priority).toBe("normal");
    expect(arg.description).toContain("Client IP: 198.51.100.7");
    expect(arg.description).toContain("Device Type: mobile");
  });
});
