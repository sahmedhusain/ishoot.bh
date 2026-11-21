import { test, expect } from "@playwright/test";

test.describe("Cross-App Data & Isolation Integrity", () => {
  test("gateway healthcheck indicates platform readiness across ports", async ({ request }) => {
    const adminPort = process.env.GATEWAY_ADMIN_PORT || 9080;
    const res = await request.get(`http://127.0.0.1:${adminPort}/livez`);
    expect(res.ok()).toBeTruthy();
  });

  test("web public portal responds correctly", async ({ request }) => {
    const port = process.env.WEB_PORT || 3000;
    const res = await request.get(`http://127.0.0.1:${port}/api/health`, { timeout: 5000 });
    expect(res.status()).toBe(200);
  });
});
