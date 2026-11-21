import { expect, test } from "@playwright/test";
import { loadRootEnv, mintServiceToken } from "./helpers/strict-audit";

const ADMIN_ORIGIN = (process.env.ADMIN_URL || "http://localhost:3001").replace(/\/$/, "");
const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const SAMPLE_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n",
);

async function expectPdfResponse(res: any, label: string) {
  expect(res.status(), `${label} status: ${res.status()}`).toBe(200);
  expect(res.headers()["content-type"], `${label} content-type`).toContain("application/pdf");
  const buf = await res.body();
  expect(buf.subarray(0, 5).toString("ascii"), `${label} magic bytes`).toBe("%PDF-");
}

test.describe("Phase 1.4 — Admin App Next.js API Routes (all 44 routes)", () => {
  test("unauthenticated checks, /api/health, /api/auth/*, /api/cron, /api/webhooks/resend, /api/telemetry, /api/internal/identity-projection", async ({
    playwright,
  }) => {
    const env = loadRootEnv();
    const ts = Date.now();
    const unauth = await playwright.request.newContext({ baseURL: ADMIN_ORIGIN });

    // 1. /api/health
    const h = await unauth.get("/api/health");
    expect(h.status()).toBe(200);
    expect((await h.json()).ok).toBe(true);

    // 2. Unauthenticated 401 enforcement across protected endpoints
    for (const p of [
      "/api/auth/me",
      "/api/exports/invoices",
      "/api/lookups/contacts",
      "/api/reports/sales_by_product",
      "/api/letterhead",
      "/api/calendar/events?start=2026-01-01&end=2026-01-31",
      "/api/calendar/feed",
      "/api/notifications",
      "/api/presence?ids=BA0001",
      "/api/presence/me",
      "/api/workspace/prefs",
      "/api/realtime/stream",
    ]) {
      expect((await unauth.get(p)).status(), `Unauth GET ${p}`).toBe(401);
    }
    expect((await unauth.post("/api/auth/mfa", { data: { mode: "enroll", password: "x" } })).status()).toBe(401);
    expect((await unauth.post("/api/upload/init", { data: {} })).status()).toBe(401);
    expect((await unauth.post("/api/upload/finalize", { data: {} })).status()).toBe(401);
    expect((await unauth.post("/api/profile/avatar", { data: { url: "https://example.test/a.png" } })).status()).toBe(401);
    expect((await unauth.post("/api/realtime/activity", { data: { state: "active" } })).status()).toBe(401);
    expect((await unauth.put("/api/workspace/prefs", { data: {} })).status()).toBe(401);

    // 3. Auth validation + login + /api/auth/me + MFA enroll/cancel + logout
    expect((await unauth.post("/api/auth/login", { data: { username: "", password: "" } })).status()).toBe(400);
    expect(
      (await unauth.post("/api/auth/login", { data: { username: "BA0001", password: "WrongPassword!" } })).status(),
    ).toBe(401);

    const authCtx = await playwright.request.newContext({ baseURL: ADMIN_ORIGIN });
    const loginRes = await authCtx.post("/api/auth/login", {
      data: {
        username: env.SUPER_ADMIN_USERNAME || "BA0001",
        password: env.SUPER_ADMIN_PASSWORD || "Admin12345678!",
      },
    });
    expect(loginRes.status(), await loginRes.text()).toBe(200);
    const meRes = await authCtx.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.user?.id).toBeTruthy();

    // MFA enroll -> cancel without changing MFA state
    const mfaEnroll = await authCtx.post("/api/auth/mfa", {
      data: { mode: "enroll", password: env.SUPER_ADMIN_PASSWORD || "Admin12345678!" },
    });
    expect(mfaEnroll.status(), await mfaEnroll.text()).toBe(200);
    expect((await mfaEnroll.json()).secret).toBeTruthy();

    const mfaCancel = await authCtx.post("/api/auth/mfa", {
      data: { mode: "cancel", password: env.SUPER_ADMIN_PASSWORD || "Admin12345678!" },
    });
    expect(mfaCancel.status()).toBe(200);

    const logoutRes = await authCtx.post("/api/auth/logout");
    expect(logoutRes.status()).toBe(200);
    expect((await authCtx.get("/api/auth/me")).status()).toBe(401);
    await authCtx.dispose();

    // 4. Forgot-password (400 validation + 200 non-existent safe) & reset-password (400 invalid token)
    expect((await unauth.post("/api/auth/forgot-password", { data: { username: "a@b.com", email: "" } })).status()).toBe(400);
    expect(
      (await unauth.post("/api/auth/forgot-password", { data: { username: "nonexistent999", email: "none@example.test" } })).status(),
    ).toBe(200);
    expect(
      (
        await unauth.post("/api/auth/reset-password", {
          data: { email: "admin@example.com", token: "invalid-token", newPassword: "StrongPassword!99" },
        })
      ).status(),
    ).toBe(400);

    // 5. Cron: 401 without secret, 200 with Bearer CRON_SECRET
    expect((await unauth.get("/api/cron")).status()).toBe(401);
    expect(env.CRON_SECRET, "CRON_SECRET must be configured in .env").toBeTruthy();
    const cronOk = await unauth.get("/api/cron", {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    expect(cronOk.status(), await cronOk.text()).toBe(200);
    expect((await cronOk.json()).success).toBe(true);

    // 6. Resend webhook, telemetry, identity-projection
    const whRes = await unauth.post("/api/webhooks/resend", { data: { type: "email.sent" } });
    expect(whRes.status()).toBe(env.RESEND_WEBHOOK_SECRET ? 401 : 503);

    expect(
      (
        await unauth.post("/api/telemetry", {
          data: { logs: [{ level: "INFO", action: `ADMIN_API_PING_${ts}`, message: "ok" }] },
        })
      ).status(),
    ).toBe(200);

    expect((await unauth.post("/api/internal/identity-projection", { data: {} })).status()).toBe(401);
    await unauth.dispose();
  });

  test("authenticated exports (10 domains), lookups (17 domains), reports, workspace prefs, calendar, notifications, presence, realtime & upload", async ({
    playwright,
    request,
  }) => {
    const env = loadRootEnv();
    const adminToken = mintServiceToken("admin");
    const ts = Date.now();
    const api = await playwright.request.newContext({ baseURL: ADMIN_ORIGIN });

    const loginRes = await api.post("/api/auth/login", {
      data: {
        username: env.SUPER_ADMIN_USERNAME || "BA0001",
        password: env.SUPER_ADMIN_PASSWORD || "Admin12345678!",
      },
    });
    expect(loginRes.status()).toBe(200);

    // 1. All 10 export domains -> 200 CSV + 404 unknown
    for (const domain of [
      "contacts",
      "deals",
      "invoices",
      "payments",
      "expenses",
      "calendar",
      "moms",
      "companyDocuments",
      "requests",
      "archive",
    ]) {
      const res = await api.get(`/api/exports/${domain}`);
      expect(res.status(), `GET /api/exports/${domain}`).toBe(200);
      expect(res.headers()["content-type"]).toContain("text/csv");
    }
    expect((await api.get("/api/exports/nonexistent")).status()).toBe(404);

    // 2. All 17 lookup domains -> 200 { items } + 404 unknown
    for (const domain of [
      "contacts",
      "deals",
      "invoices",
      "payments",
      "projects",
      "departments",
      "employees",
      "users",
      "quotations",
      "contracts",
      "letters",
      "assets",
      "orders",
      "warehouses",
      "tickets",
      "products",
      "services",
    ]) {
      const res = await api.get(`/api/lookups/${domain}?q=a`);
      expect(res.status(), `GET /api/lookups/${domain}`).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.items)).toBe(true);
    }
    expect((await api.get("/api/lookups/nonexistent")).status()).toBe(404);

    // 3. Reports (/api/reports/[key] CSV + PDF + 403 unauthorized key)
    expect((await api.get("/api/reports/unknown_report_key")).status()).toBe(403);
    const repCsv = await api.get("/api/reports/sales_by_product?format=csv&locale=en&from=2026-01-01&to=2026-12-31");
    expect(repCsv.status(), await repCsv.text()).toBe(200);
    expect(repCsv.headers()["content-type"]).toContain("text/csv");
    await expectPdfResponse(
      await api.get("/api/reports/sales_by_product?format=pdf&locale=en&from=2026-01-01&to=2026-12-31"),
      "GET /api/reports/sales_by_product?format=pdf",
    );

    // 4. Upload init -> PUT content -> finalize -> GET /api/files + avatar validation
    expect((await api.post("/api/upload/init", { data: { fileName: "" } })).status()).toBe(400);
    const initRes = await api.post("/api/upload/init", {
      data: {
        fileName: `admin-api-${ts}.pdf`,
        fileType: "application/pdf",
        fileSize: SAMPLE_PDF.byteLength,
        entityType: "general",
        entityId: "pending",
      },
    });
    expect(initRes.status(), await initRes.text()).toBe(200);
    const initJson = await initRes.json();
    expect(initJson.signedUrl).toBeTruthy();

    const putRes = await api.put(initJson.signedUrl, {
      headers: { "content-type": "application/pdf", "content-length": String(SAMPLE_PDF.byteLength) },
      data: SAMPLE_PDF,
    });
    expect(putRes.status(), await putRes.text()).toBe(200);

    // Before finalize, GET /api/files/... returns 200 (unclaimed owned file)
    const getUnclaimed = await api.get(initJson.fileUrl);
    expect(getUnclaimed.status()).toBe(200);

    const finRes = await api.post("/api/upload/finalize", {
      data: { fileUrl: initJson.fileUrl, entityType: "general", entityId: "pending" },
    });
    expect(finRes.status(), await finRes.text()).toBe(200);
    await request.delete(`${GATEWAY}/v1/files/content?fileUrl=${encodeURIComponent(initJson.fileUrl)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect((await api.post("/api/profile/avatar", { data: { url: "" } })).status()).toBe(400);

    // 5. Calendar events (400 invalid range -> 200 valid), feed ICS, and /api/calendar/ics/[token]
    expect((await api.get("/api/calendar/events?start=bad&end=bad")).status()).toBe(400);
    const calEv = await api.get("/api/calendar/events?start=2026-01-01&end=2026-12-31");
    expect(calEv.status()).toBe(200);

    const calFeed = await api.get("/api/calendar/feed");
    expect(calFeed.status()).toBe(200);
    expect(calFeed.headers()["content-type"]).toContain("text/calendar");
    expect(await calFeed.text()).toContain("BEGIN:VCALENDAR");

    expect((await api.get("/api/calendar/ics/nonexistent-token-xyz")).status()).toBe(404);

    // 6. Notifications, Presence, Realtime Activity, Stream SSE, Workspace Prefs & IT Support Attachment
    expect((await api.get("/api/notifications?view=preview")).status()).toBe(200);
    expect((await api.get("/api/notifications?view=page&limit=10")).status()).toBe(200);
    expect((await api.get("/api/notifications?view=settings")).status()).toBe(200);
    expect((await api.get("/api/presence?ids=BA0001")).status()).toBe(200);
    expect((await api.get("/api/presence/me")).status()).toBe(200);

    expect((await api.post("/api/realtime/activity", { data: { state: "bad" } })).status()).toBe(400);
    expect((await api.post("/api/realtime/activity", { data: { state: "active" } })).status()).toBe(204);

    // SSE stream check with cookie
    const state = await api.storageState();
    const cookieHeader = state.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const streamCtrl = new AbortController();
    const sseRes = await fetch(`${ADMIN_ORIGIN}/api/realtime/stream`, {
      headers: { Cookie: cookieHeader },
      signal: streamCtrl.signal,
    });
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get("content-type")).toContain("text/event-stream");
    streamCtrl.abort();

    // Workspace prefs GET -> PUT -> restore original
    const origPrefsRes = await api.get("/api/workspace/prefs");
    expect(origPrefsRes.status()).toBe(200);
    const origPrefs = await origPrefsRes.json();
    const putPrefsRes = await api.put("/api/workspace/prefs", {
      data: { ...origPrefs, scratchpad: { ...(origPrefs.scratchpad || {}), e2eNote: `ping-${ts}` } },
    });
    expect(putPrefsRes.status()).toBe(200);
    await api.put("/api/workspace/prefs", { data: origPrefs });

    // IT Support attachment 404 when not attached
    expect(
      (await api.get("/api/it-support/00000000-0000-0000-0000-000000000000/attachment?fileUrl=missing")).status(),
    ).toBe(404);

    await api.dispose();
  });

  test("all PDF routes (%PDF-), signing & acknowledge endpoints, and /certificates/[code]/file", async ({
    playwright,
    request,
  }) => {
    const env = loadRootEnv();
    const adminToken = mintServiceToken("admin");
    const gwHeaders = { Authorization: `Bearer ${adminToken}` };
    const api = await playwright.request.newContext({ baseURL: ADMIN_ORIGIN });
    const loginRes = await api.post("/api/auth/login", {
      data: {
        username: env.SUPER_ADMIN_USERNAME || "BA0001",
        password: env.SUPER_ADMIN_PASSWORD || "Admin12345678!",
      },
    });
    expect(loginRes.status()).toBe(200);

    // 1. Letterhead PDF
    await expectPdfResponse(await api.get("/api/letterhead?locale=en"), "GET /api/letterhead");

    // 2. Invoice, Quotation & Payment Receipt PDFs + invalid type 400
    expect((await api.get("/api/documents/nonexistent/pdf?type=badtype")).status()).toBe(400);

    const [invs, quotes, pays, moms, pos] = await Promise.all([
      request.get(`${GATEWAY}/v1/finance/invoices`, { headers: gwHeaders }).then((r) => r.json()),
      request.get(`${GATEWAY}/v1/sales/quotations`, { headers: gwHeaders }).then((r) => r.json()),
      request.get(`${GATEWAY}/v1/finance/payments`, { headers: gwHeaders }).then((r) => r.json()),
      request.get(`${GATEWAY}/v1/workflow/moms`, { headers: gwHeaders }).then((r) => r.json()),
      request.get(`${GATEWAY}/v1/inventory/purchase-orders`, { headers: gwHeaders }).then((r) => r.json()),
    ]);
    expect(Array.isArray(invs) && invs.length > 0, "Expected seeded invoices").toBe(true);
    await expectPdfResponse(await api.get(`/api/documents/${invs[0].id}/pdf?type=invoice`), "Invoice PDF");
    expect(Array.isArray(quotes) && quotes.length > 0, "Expected seeded quotations").toBe(true);
    await expectPdfResponse(await api.get(`/api/documents/${quotes[0].id}/pdf?type=quotation`), "Quotation PDF");
    expect(Array.isArray(pays) && pays.length > 0, "Expected seeded payments").toBe(true);
    await expectPdfResponse(await api.get(`/api/documents/${pays[0].id}/pdf?type=receipt`), "Receipt PDF");
    expect(Array.isArray(moms) && moms.length > 0, "Expected seeded MoMs").toBe(true);
    await expectPdfResponse(await api.get(`/api/moms/${moms[0].id}/pdf`), "MoM PDF");
    expect(Array.isArray(pos) && pos.length > 0, "Expected seeded purchase orders").toBe(true);
    await expectPdfResponse(await api.get(`/api/procurement/orders/${pos[0].id}/pdf`), "Purchase Order PDF");

    // 3. Announcement PDF (404 on unknown; live published official)
    expect((await api.get("/api/announcements/00000000-0000-0000-0000-000000000000/pdf")).status()).toBe(404);
    const annRes = await request.get(`${GATEWAY}/v1/system/announcements`, { headers: gwHeaders });
    const anns: any[] = await annRes.json();
    const pubAnn = anns.find((a) => a.official && a.status === "published");
    expect(pubAnn, "Expected published official announcement in seed").toBeTruthy();
    await expectPdfResponse(await api.get(`/api/announcements/${pubAnn.id}/pdf?locale=en`), "Announcement PDF");

    // 4. Official Letter PDF (404 on unknown; live letter)
    expect((await api.get("/api/letters/00000000-0000-0000-0000-000000000000/pdf")).status()).toBe(404);
    const letRes = await request.get(`${GATEWAY}/v1/workflow/letters`, { headers: gwHeaders });
    const letters: any[] = await letRes.json();
    expect(Array.isArray(letters) && letters.length > 0, "Expected seeded official letters").toBe(true);
    await expectPdfResponse(await api.get(`/api/letters/${letters[0].id}/pdf?locale=en`), "Letter PDF");

    // 5. Asset Handover PDF, HR Salary Document PDF, HR Settlement PDF, Inventory Labels PDF
    expect((await api.get("/api/assets/handovers/00000000-0000-0000-0000-000000000000/pdf")).status()).toBe(404);
    const handovers: any[] = await (
      await request.get(`${GATEWAY}/v1/itsm/requests/asset-handovers`, { headers: gwHeaders })
    ).json();
    expect(Array.isArray(handovers) && handovers.length > 0, "Expected seeded asset handovers").toBe(true);
    await expectPdfResponse(await api.get(`/api/assets/handovers/${handovers[0].id}/pdf`), "Asset Handover PDF");

    const salaryDocs: any[] = await (
      await request.get(`${GATEWAY}/v1/hr/tables/salary_document`, { headers: gwHeaders })
    ).json();
    const issuedDoc = Array.isArray(salaryDocs) ? salaryDocs.find((p) => p.status === "issued") : null;
    expect(issuedDoc, "Expected issued salary document in seed").toBeTruthy();
    await expectPdfResponse(await api.get(`/api/hr/documents/${issuedDoc.id}/pdf`), "HR Salary Document PDF");

    expect((await api.get("/api/hr/settlements/00000000-0000-0000-0000-000000000000/pdf")).status()).toBe(404);
    const settles: any[] = await (
      await request.get(`${GATEWAY}/v1/system/final-settlements`, { headers: gwHeaders })
    ).json();
    expect(Array.isArray(settles) && settles.length > 0, "Expected seeded final settlements").toBe(true);
    await expectPdfResponse(await api.get(`/api/hr/settlements/${settles[0].id}/pdf`), "Final Settlement PDF");

    const labelJobs: any[] = await (
      await request.get(`${GATEWAY}/v1/system/tables/label_print_job`, { headers: gwHeaders })
    ).json();
    expect(Array.isArray(labelJobs) && labelJobs.length > 0, "Expected seeded label print jobs").toBe(true);
    await expectPdfResponse(await api.get(`/api/inventory/labels/${labelJobs[0].id}/pdf`), "Stock Label PDF");

    // 6. Client Sign & Handover Acknowledge routes + PDF + Certificates
    expect((await api.post("/api/sign/nonexistent-sign-token", { data: { signerName: "A" } })).status()).toBe(400);
    expect((await api.get("/api/sign/nonexistent-sign-token/pdf")).status()).toBe(410);
    expect((await api.post("/api/acknowledge/nonexistent-ack-token", { data: { signerName: "A" } })).status()).toBe(400);
    expect((await api.get("/api/acknowledge/nonexistent-ack-token/pdf")).status()).toBe(410);
    expect((await api.get("/certificates/nonexistent-tax-cert-xyz/file")).status()).toBe(404);

    await api.dispose();
  });
});
