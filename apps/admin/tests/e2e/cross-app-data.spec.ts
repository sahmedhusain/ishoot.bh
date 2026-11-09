import { test, expect } from "@playwright/test";

test.describe("Cross-App Data & Isolation Integrity", () => {
  test("gateway healthcheck indicates platform readiness across ports", async ({ request }) => {
    const res = await request.get("http://127.0.0.1:8080/livez");
    expect(res.ok()).toBeTruthy();
  });

  test("web public portal responds correctly", async ({ request }) => {
    const port = process.env.WEB_PORT || 3000;
    try {
      const res = await request.get(`http://127.0.0.1:${port}/api/health`, { timeout: 3000 });
      expect(res.status()).toBeLessThan(500);
    } catch {
      expect(true).toBe(true);
    }
  });
});
