import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  fetchMailpitMessage,
  loadRootEnv,
  mintServiceToken,
} from "./helpers/strict-audit";

const WEB_ORIGIN = (process.env.WEB_URL || "http://localhost:3000").replace(/\/$/, "");
const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";

// Minimal 1x1 valid PNG (8-byte magic header + minimal IHDR/IDAT/IEND) for upload checks
const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("Phase 1.4 — Web App Next.js API Routes (all 10 routes)", () => {
  test("GET /api/health, /api/files, /[locale]/[collection]/rss.xml and POST /api/telemetry", async ({
    request,
  }) => {
    const webToken = mintServiceToken("web");
    const adminToken = mintServiceToken("admin");
    const env = loadRootEnv();

    // 1. Health
    const healthRes = await request.get(`${WEB_ORIGIN}/api/health`);
    expect(healthRes.status()).toBe(200);
    const health = await healthRes.json();
    expect(health.ok).toBe(true);
    expect(health.app).toBe("web");

    // 2. Discover brand file via /v1/system/site and published articles collection slug
    const siteRes = await request.get(`${GATEWAY}/v1/system/site`, {
      headers: { Authorization: `Bearer ${webToken}` },
    });
    expect(siteRes.status()).toBe(200);
    const siteJson = await siteRes.json();
    const articlesSlug = "news";

    // 3. RSS XML feed (EN & AR + 404 for unknown collection)
    for (const locale of ["en", "ar"]) {
      const rssRes = await request.get(`${WEB_ORIGIN}/${locale}/${articlesSlug}/rss.xml`);
      expect(rssRes.status(), `GET /${locale}/${articlesSlug}/rss.xml`).toBe(200);
      expect(rssRes.headers()["content-type"]).toContain("application/rss+xml");
      const xml = await rssRes.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0">');
    }
    const rssMissing = await request.get(`${WEB_ORIGIN}/en/nonexistent-collection-xyz/rss.xml`);
    expect(rssMissing.status()).toBe(404);

    // 4. GET /api/files/[folder]/[name] (invalid -> 404, valid public brand file -> 200)
    expect((await request.get(`${WEB_ORIGIN}/api/files/general/missing-no-ext`)).status()).toBe(404);
    const brandFileUrl =
      siteJson?.published?.brandAssets?.logo_light_url ||
      siteJson?.published?.brandAssets?.logo_url ||
      siteJson?.published?.brandAssets?.favicon_url;
    if (typeof brandFileUrl === "string" && brandFileUrl.startsWith("/api/files/")) {
      const fileRes = await request.get(`${WEB_ORIGIN}${brandFileUrl}`);
      expect(fileRes.status(), `GET ${brandFileUrl}`).toBe(200);
    } else {
      // Upload a temporary public brand PNG, verify GET /api/files returns 200, then clean up
      const ts = Date.now();
      const reg = await request.post(`${GATEWAY}/v1/files/uploads`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          ownerId: "e2e-web-api",
          folder: "brand",
          fileName: `web-test-${ts}.png`,
          mimeType: "image/png",
          fileSize: SAMPLE_PNG.byteLength,
        },
      });
      expect(reg.status()).toBe(201);
      const { fileUrl } = await reg.json();
      await request.put(
        `${GATEWAY}/v1/files/uploads/content?fileUrl=${encodeURIComponent(fileUrl)}&ownerId=e2e-web-api`,
        {
          headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "image/png" },
          data: SAMPLE_PNG,
        },
      );
      await request.post(`${GATEWAY}/v1/files/uploads/claim`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { fileUrl, ownerId: "e2e-web-api", requirePrivate: false },
      });
      const fileRes = await request.get(`${WEB_ORIGIN}${fileUrl}`);
      expect(fileRes.status()).toBe(200);
      await request.delete(`${GATEWAY}/v1/files/content?fileUrl=${encodeURIComponent(fileUrl)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // 5. POST /api/telemetry (valid -> 200, malformed -> 400)
    const telBad = await request.post(`${WEB_ORIGIN}/api/telemetry`, {
      headers: { "Content-Type": "application/json" },
      data: Buffer.from("{bad-json"),
    });
    expect(telBad.status()).toBe(400);
    const telOk = await request.post(`${WEB_ORIGIN}/api/telemetry`, {
      data: {
        logs: [{ action: "E2E_WEB_API_PING", message: "Web API route test", level: "INFO" }],
      },
    });
    expect(telOk.status()).toBe(200);
    expect((await telOk.json()).ok).toBe(true);

    // 6. POST /api/revalidate (401 without/wrong secret, 200 with secret)
    const revUnauth = await request.post(`${WEB_ORIGIN}/api/revalidate`, {
      headers: { "x-revalidate-secret": "wrong-secret" },
      data: { paths: ["/en"] },
    });
    expect(revUnauth.status()).toBe(401);
    const revOk = await request.post(`${WEB_ORIGIN}/api/revalidate`, {
      headers: { "x-revalidate-secret": env.REVALIDATION_SECRET },
      data: { tags: ["website"], paths: ["/", "/about"] },
    });
    expect(revOk.status(), await revOk.text()).toBe(200);
    expect((await revOk.json()).revalidated).toBe(true);
  });

  test("POST /api/inquiry, /api/inquiry/attachments, /api/reviews, /api/preview & /api/internal/identity-projection", async ({
    playwright,
    request,
  }) => {
    const env = loadRootEnv();
    const adminToken = mintServiceToken("admin");
    const ts = Date.now();
    const ctx = await playwright.request.newContext({ baseURL: WEB_ORIGIN });

    // 1. /api/inquiry validation -> 400, valid -> 200 + email in Mailpit + CRM inquiry created
    const badInq = await ctx.post("/api/inquiry", {
      headers: { Origin: WEB_ORIGIN },
      data: { intent: "inquiry", email: "bad", message: "", submissionKey: `e2e-web-bad-${ts}` },
    });
    expect(badInq.status()).toBe(400);

    const subKey = `e2e-web-api-inq-${ts}`;
    const requesterEmail = `web-api-${ts}@example.test`;
    const okInq = await ctx.post("/api/inquiry", {
      headers: { Origin: WEB_ORIGIN },
      data: {
        intent: "quote_request",
        locale: "en",
        fullName: `Web API Tester ${ts}`,
        email: requesterEmail,
        phone: "+97336005555",
        company: `Web QA Co ${ts}`,
        budget: "500_1500",
        timeline: "Next month",
        message: `Testing POST /api/inquiry at ${ts}`,
        submissionKey: subKey,
      },
    });
    expect(okInq.status(), await okInq.text()).toBe(200);
    const inqBody = await okInq.json();
    expect(inqBody.success).toBe(true);
    expect(inqBody.reference).toBeTruthy();

    const mail = await fetchMailpitMessage(requesterEmail, undefined, 15_000);
    expect(mail.Subject).toContain(inqBody.reference);

    // 2. /api/inquiry/attachments: wrong Origin -> 403; valid Origin + uploadToken + PNG -> 201
    const csrfAtt = await ctx.post("/api/inquiry/attachments", {
      headers: { Origin: "https://evil.example" },
      data: SAMPLE_PNG,
    });
    expect(csrfAtt.status()).toBe(403);

    if (inqBody.uploadToken) {
      const okAtt = await ctx.post("/api/inquiry/attachments", {
        headers: {
          Origin: WEB_ORIGIN,
          "x-inquiry-upload-token": inqBody.uploadToken,
          "x-file-name": encodeURIComponent(`inq-${ts}.png`),
          "content-type": "application/octet-stream",
        },
        data: SAMPLE_PNG,
      });
      expect(okAtt.status(), await okAtt.text()).toBe(201);
      const attJson = await okAtt.json();
      expect(attJson.success).toBe(true);
    }

    // Cleanup created inquiry via gateway
    const listInq = await request.get(`${GATEWAY}/v1/sales/inquiries`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const inqs: any[] = await listInq.json();
    const createdInq = inqs.find((i) => i.requesterEmail === requesterEmail);
    expect(createdInq).toBeTruthy();
    await request.delete(`${GATEWAY}/v1/sales/inquiries/${createdInq.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 3. /api/reviews: invalid rating -> 400, valid review -> 200 -> delete from CMS
    const badRev = await ctx.post("/api/reviews", {
      data: { authorName: "Bad Rating", quote: "Missing valid stars", rating: 7, submissionKey: `e2e-rev-bad-${ts}` },
    });
    expect(badRev.status()).toBe(400);

    const revQuote = `E2E API Review Quote ${ts}`;
    const okRev = await ctx.post("/api/reviews", {
      data: {
        authorName: `API Reviewer ${ts}`,
        companyName: "Review QA Ltd",
        quote: revQuote,
        rating: 5,
        locale: "en",
        submissionKey: `e2e-rev-ok-${ts}`,
      },
    });
    expect(okRev.status(), await okRev.text()).toBe(200);
    expect((await okRev.json()).success).toBe(true);

    const listRevs = await request.get(`${GATEWAY}/v1/cms/reviews?all=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const revs: any[] = await listRevs.json();
    const createdRev = revs.find((r) => r.quoteEn === revQuote);
    expect(createdRev).toBeTruthy();
    await request.delete(`${GATEWAY}/v1/cms/reviews/${createdRev.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 4. GET/POST /api/preview
    expect((await ctx.get("/api/preview?expires=0&token=" + "a".repeat(64))).status()).toBe(403);
    const exp = String(Date.now() + 120_000);
    const hmac = createHmac("sha256", env.REVALIDATION_SECRET).update(`website-preview:${exp}`).digest("hex");
    const prevOk = await ctx.get(`/api/preview?expires=${exp}&token=${hmac}&locale=en&path=/en`, {
      maxRedirects: 0,
    });
    expect(prevOk.status()).toBe(307);

    const prevPostBad = await ctx.post("/api/preview", { headers: { Origin: "https://evil.example" } });
    expect(prevPostBad.status()).toBe(403);
    const prevPostOk = await ctx.post("/api/preview", {
      headers: { Origin: WEB_ORIGIN },
      maxRedirects: 0,
    });
    expect(prevPostOk.status()).toBe(303);

    // 5. POST /api/internal/identity-projection (unauthenticated -> 401)
    const projUnauth = await ctx.post("/api/internal/identity-projection", {
      data: { realm: "customer", subjectId: "none", version: 1, deleted: true },
    });
    expect(projUnauth.status()).toBe(401);

    await ctx.dispose();
  });
});
