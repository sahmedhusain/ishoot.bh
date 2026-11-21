import { expect, test } from "@playwright/test";
import { loginToItStrict, resetSuiteLog } from "./helpers/strict-audit";

const IT_ORIGIN = (process.env.IT_URL || "http://localhost:3002").replace(/\/$/, "");

test.describe("Phase 1.4 — IT Console Next.js API Routes (all 9 routes)", () => {
  test("unauthenticated checks, /api/logs (+batch), /api/auth/forgot-password & /api/auth/reset-password, and authenticated IT API routes", async ({
    playwright,
    page,
  }) => {
    resetSuiteLog("it-api-routes");
    const ts = Date.now();
    const unauthCtx = await playwright.request.newContext({ baseURL: IT_ORIGIN });

    // 1. Unauthenticated 401 checks on protected IT routes
    expect((await unauthCtx.get("/api/notifications")).status()).toBe(401);
    expect((await unauthCtx.post("/api/realtime/activity", { data: { state: "active" } })).status()).toBe(401);
    expect((await unauthCtx.get("/api/realtime/stream")).status()).toBe(401);
    expect((await unauthCtx.get("/tickets/00000000-0000-0000-0000-000000000000/attachment")).status()).toBe(401);

    // 2. /api/logs POST + /api/logs/batch POST + /api/logs GET
    const uniqueMsg = `IT_API_LOG_${ts}`;
    expect((await unauthCtx.post("/api/logs", { data: { level: "INFO", service: "qa/e2e", action: "TEST", message: uniqueMsg } })).status()).toBe(200);
    expect(
      (
        await unauthCtx.post("/api/logs/batch", {
          data: { logs: [{ level: "WARN", service: "qa/e2e", action: "BATCH_TEST", message: `${uniqueMsg}_BATCH` }] },
        })
      ).status(),
    ).toBe(200);
    const logsRes = await unauthCtx.get(`/api/logs?search=${encodeURIComponent(uniqueMsg)}`);
    expect(logsRes.status()).toBe(200);
    const logsJson = await logsRes.json();
    expect(JSON.stringify(logsJson)).toContain(uniqueMsg);

    // 3. /api/auth/forgot-password (400 missing fields, 200 non-matching unknown safe response) & /api/auth/reset-password (400 invalid token)
    expect(
      (
        await unauthCtx.post("/api/auth/forgot-password", {
          data: { username: "bad@email", email: "" },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await unauthCtx.post("/api/auth/forgot-password", {
          data: { username: "nonexistentuser", email: "nonexistent@example.test" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await unauthCtx.post("/api/auth/reset-password", {
          data: { email: "admin@example.com", token: "invalid-reset-token", newPassword: "SomeStrongPassword!99" },
        })
      ).status(),
    ).toBe(400);

    // 4. GET /api/files/[folder]/[name] (404 on invalid/missing)
    expect((await unauthCtx.get("/api/files/general/missing-no-ext")).status()).toBe(404);
    await unauthCtx.dispose();

    // 5. Log in as IT Admin in browser so cookies carry IT session for authenticated API routes
    await loginToItStrict(page);
    const authCtx = page.request;

    const notifList = await authCtx.get("/api/notifications?filter=all");
    expect(notifList.status(), await notifList.text()).toBe(200);
    const notifSettings = await authCtx.get("/api/notifications?view=settings");
    expect(notifSettings.status()).toBe(200);

    // Realtime activity validation & valid heartbeat
    expect((await authCtx.post("/api/realtime/activity", { data: { state: "invalid" } })).status()).toBe(400);
    expect((await authCtx.post("/api/realtime/activity", { data: { state: "active" } })).status()).toBe(204);

    // Realtime SSE stream headers check (abort quickly so Playwright doesn't wait forever on open stream)
    const streamController = new AbortController();
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const streamRes = await fetch(`${IT_ORIGIN}/api/realtime/stream`, {
      headers: { Cookie: cookieHeader },
      signal: streamController.signal,
    });
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers.get("content-type")).toContain("text/event-stream");
    streamController.abort();

    // Ticket attachment 404 check when missing fileUrl
    expect((await authCtx.get("/tickets/00000000-0000-0000-0000-000000000000/attachment?fileUrl=missing")).status()).toBeGreaterThanOrEqual(404);
  });
});
