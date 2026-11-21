import { expect, test } from "@playwright/test";
import {
  fetchMailpitMessage,
  fetchWhatsAppMessages,
  getCachedItAuth,
  loadRootEnv,
  mintServiceToken,
} from "./helpers/strict-audit";

const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";
const IDENTITY_DIRECT = "http://127.0.0.1:8082";

test.describe("Phase 1.1 — Gateway, Identity, System, Files, Notify, Realtime & Audit APIs", () => {
  test("gateway health, JWKS, and realm isolation (401 unauthenticated / 403 cross-realm)", async ({ request }) => {
    // Health probes across all 16 services (ports 9080-9095)
    for (let port = 9080; port <= 9095; port++) {
      const r = await request.get(`http://127.0.0.1:${port}/readyz`);
      expect(r.status(), `Service admin port ${port} /readyz`).toBe(200);
    }

    // JWKS public endpoint
    const jwksRes = await request.get(`${IDENTITY_DIRECT}/.well-known/jwks.json`);
    expect(jwksRes.status()).toBe(200);
    const jwks = await jwksRes.json();
    expect(Array.isArray(jwks.keys) && jwks.keys.length > 0).toBe(true);

    // Unauthenticated requests must return 401
    for (const p of ["/v1/system/company", "/v1/finance/invoices", "/v1/audit/desk/events", "/v1/itsm/desk/tickets"]) {
      const unauth = await request.get(`${GATEWAY}${p}`);
      expect(unauth.status(), `Expected 401 on unauthenticated ${p}`).toBe(401);
    }

    // Wrong realm / caller: web token cannot access IT desk or write system company
    const webToken = mintServiceToken("web");
    const wrongRealm = await request.get(`${GATEWAY}/v1/audit/desk/events`, {
      headers: { Authorization: `Bearer ${webToken}` },
    });
    expect(wrongRealm.status()).toBe(401);

    const forbiddenWrite = await request.put(`${GATEWAY}/v1/system/company`, {
      headers: { Authorization: `Bearer ${webToken}` },
      data: { values: { taglineEn: "Nope" }, actorId: "web" },
    });
    expect(forbiddenWrite.status()).toBe(403);
  });

  test("identity API: staff/customer/IT realms, roles CRUD, password policy, sessions & refresh/logout", async ({
    request,
  }) => {
    const adminToken = mintServiceToken("admin");
    const itSvcToken = mintServiceToken("it");
    const storeToken = mintServiceToken("store");
    const env = loadRootEnv();
    const ts = Date.now();

    // Password policy across realms
    for (const [realm, tok] of [
      ["staff", adminToken],
      ["customer", storeToken],
      ["it", itSvcToken],
    ] as const) {
      const polRes = await request.get(`${GATEWAY}/v1/identity/${realm}/password-policy`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      expect(polRes.status(), `password-policy for ${realm}`).toBe(200);
      const pol = await polRes.json();
      expect(pol.minLength).toBeGreaterThanOrEqual(8);
    }

    // Staff login -> wrong password -> 401, valid login -> 200 -> validate session -> refresh -> logout
    const badLogin = await request.post(`${GATEWAY}/v1/identity/staff/sessions/login`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { email: env.SUPER_ADMIN_USERNAME || "BA0001", password: "WrongPassword999!" },
    });
    expect(badLogin.status()).toBe(401);

    const okLogin = await request.post(`${GATEWAY}/v1/identity/staff/sessions/login`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { email: env.SUPER_ADMIN_USERNAME || "BA0001", password: env.SUPER_ADMIN_PASSWORD || "Admin12345678!" },
    });
    expect(okLogin.status()).toBe(200);
    const staffAuth = await okLogin.json();
    expect(staffAuth.accessToken).toBeTruthy();

    const sessRes = await request.get(`${GATEWAY}/v1/identity/session`, {
      headers: { Authorization: `Bearer ${staffAuth.accessToken}` },
    });
    expect(sessRes.status()).toBe(204);

    // Self-service profile & sessions GET
    const selfSessions = await request.get(`${GATEWAY}/v1/identity/me/sessions`, {
      headers: { Authorization: `Bearer ${staffAuth.accessToken}` },
    });
    expect(selfSessions.status()).toBe(200);

    // Refresh token rotation + logout
    const refreshRes = await request.post(`${GATEWAY}/v1/identity/staff/sessions/refresh`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { refreshToken: staffAuth.refreshToken },
    });
    expect(refreshRes.status()).toBe(200);
    const refreshed = await refreshRes.json();
    expect(refreshed.refreshToken).not.toBe(staffAuth.refreshToken);

    const logoutRes = await request.post(`${GATEWAY}/v1/identity/staff/sessions/logout`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { refreshToken: refreshed.refreshToken },
    });
    expect(logoutRes.status()).toBe(204);

    // Admin staff-role endpoints + IT desk endpoints
    const itAuth = await getCachedItAuth(GATEWAY);
    const rolesRes = await request.get(`${GATEWAY}/v1/identity/admin/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(rolesRes.status()).toBe(200);
    const usersRes = await request.get(`${GATEWAY}/v1/identity/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(usersRes.status()).toBe(200);
    const users = await usersRes.json();
    expect(Array.isArray(users) && users.length > 0).toBe(true);

    // IT Desk: staff roles POST -> GET -> PUT -> DELETE
    const roleId = `e2e_api_role_${ts}`;
    const createRole = await request.post(`${GATEWAY}/v1/identity/desk/staff-roles`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
      data: {
        id: roleId,
        nameEn: `E2E API Role ${ts}`,
        nameAr: `دور اختبار ${ts}`,
        system: false,
        grants: { "contacts:read": true },
        dataScopes: {},
      },
    });
    expect(createRole.status(), await createRole.text()).toBe(204);

    const listRoles = await request.get(`${GATEWAY}/v1/identity/desk/staff-roles?limit=200`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
    });
    expect(listRoles.status()).toBe(200);
    const roleListJson = await listRoles.json();
    expect(JSON.stringify(roleListJson)).toContain(roleId);

    const updRole = await request.put(`${GATEWAY}/v1/identity/desk/staff-roles/${roleId}`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
      data: {
        id: roleId,
        nameEn: `E2E API Role Updated ${ts}`,
        nameAr: `دور محدث ${ts}`,
        system: false,
        grants: { "contacts:read": true, "contacts:write": true },
        dataScopes: {},
      },
    });
    expect(updRole.status(), await updRole.text()).toBe(204);

    const delRole = await request.delete(`${GATEWAY}/v1/identity/desk/staff-roles/${roleId}`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
    });
    expect(delRole.status(), await delRole.text()).toBe(204);

    // IT Accounts & Sessions list via IT token
    for (const path of ["/v1/identity/desk/it-accounts", "/v1/identity/desk/it-roles", "/v1/identity/desk/staff-accounts", "/v1/identity/desk/sessions"]) {
      const r = await request.get(`${GATEWAY}${path}`, {
        headers: { Authorization: `Bearer ${itAuth.accessToken}` },
      });
      expect(r.status(), `GET ${path}`).toBe(200);
    }

    // Customer registration validation + create
    const weakCust = await request.post(`${GATEWAY}/v1/identity/customer/accounts`, {
      headers: { Authorization: `Bearer ${storeToken}` },
      data: { email: `weak-${ts}@example.test`, password: "123" },
    });
    expect(weakCust.status()).toBeGreaterThanOrEqual(400);

    const custEmail = `api-cust-${ts}@example.test`;
    const regCust = await request.post(`${GATEWAY}/v1/identity/customer/accounts`, {
      headers: { Authorization: `Bearer ${storeToken}` },
      data: { email: custEmail, password: `CustomerPass!${ts}` },
    });
    expect(regCust.status(), await regCust.text()).toBe(201);
  });

  test("system API: company, setup status, modules, integrations, services, projects, holidays, legal, API keys & backups", async ({
    request,
  }) => {
    const adminToken = mintServiceToken("admin");
    const itAuth = await getCachedItAuth(GATEWAY);
    const ts = Date.now();

    // Service-level reads
    for (const p of [
      "/v1/system/company",
      "/v1/system/setup/status",
      "/v1/system/modules",
      "/v1/system/integrations",
      "/v1/system/site",
      "/v1/system/services",
      "/v1/system/projects",
      "/v1/system/public-holidays",
      "/v1/system/legal-matters",
      "/v1/system/activity-logs",
      "/v1/system/workspace/folders",
    ]) {
      const r = await request.get(`${GATEWAY}${p}`, { headers: { Authorization: `Bearer ${adminToken}` } });
      expect(r.status(), `GET ${p}`).toBe(200);
    }

    // Services CRUD (POST -> GET -> PUT -> DELETE -> 404)
    const svcRes = await request.post(`${GATEWAY}/v1/system/services`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        code: `SRV-${ts}`,
        nameEn: `E2E Service ${ts}`,
        nameAr: `خدمة ${ts}`,
        category: "consulting",
        defaultRate: "150.000",
        currency: "BHD",
        isActive: true,
      },
    });
    expect(svcRes.status(), await svcRes.text()).toBe(201);
    const svc = await svcRes.json();
    expect((await request.get(`${GATEWAY}/v1/system/services/${svc.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/system/services/${svc.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { ...svc, nameEn: `E2E Service Updated ${ts}` },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/system/services/${svc.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(204);
    expect((await request.get(`${GATEWAY}/v1/system/services/${svc.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(404);

    // Projects CRUD
    const projRes = await request.post(`${GATEWAY}/v1/system/projects`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { code: `PRJ-${ts}`, name: `E2E Project ${ts}`, status: "active" },
    });
    expect(projRes.status(), await projRes.text()).toBe(201);
    const proj = await projRes.json();
    expect((await request.put(`${GATEWAY}/v1/system/projects/${proj.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { ...proj, name: `E2E Project Updated ${ts}` },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/system/projects/${proj.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(204);

    // Legal matter CRUD + unknown-field 400 validation
    const badLegal = await request.post(`${GATEWAY}/v1/system/legal-matters`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { titleEn: "Invalid field", status: "open" },
    });
    expect(badLegal.status()).toBe(400);

    const legalRes = await request.post(`${GATEWAY}/v1/system/legal-matters`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { title: `E2E Legal ${ts}`, kind: "contract", status: "open", counterparty: `E2E Party ${ts}` },
    });
    expect(legalRes.status(), await legalRes.text()).toBe(201);
    const legal = await legalRes.json();
    expect((await request.get(`${GATEWAY}/v1/system/legal-matters/${legal.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/system/legal-matters/${legal.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { ...legal, title: `E2E Legal Updated ${ts}` },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/system/legal-matters/${legal.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(204);

    // IT Desk endpoints: health, config, database, backups, store-presets, api-keys lifecycle
    for (const p of [
      "/v1/system/desk/health",
      "/v1/system/desk/config",
      "/v1/system/desk/database",
      "/v1/system/desk/backups",
      "/v1/system/desk/modules",
      "/v1/system/desk/integrations",
      "/v1/system/desk/site/domains",
      "/v1/system/desk/site/code",
      "/v1/it/store-presets",
      "/v1/system/desk/api-keys",
    ]) {
      const r = await request.get(`${GATEWAY}${p}`, { headers: { Authorization: `Bearer ${itAuth.accessToken}` } });
      expect(r.status(), `IT GET ${p}`).toBe(200);
    }

    // Create + Delete API key via IT desk
    const keyRes = await request.post(`${GATEWAY}/v1/system/desk/api-keys`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
      data: { name: `e2e-api-key-${ts}`, scopes: ["read"], rateLimit: 60 },
    });
    expect(keyRes.status(), await keyRes.text()).toBe(201);
    const apiKey = await keyRes.json();
    expect(apiKey.id).toBeTruthy();
    const delKey = await request.delete(`${GATEWAY}/v1/system/desk/api-keys/${apiKey.id}`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
    });
    expect(delKey.status()).toBe(204);
  });

  test("files, notify (Mailpit + WhatsApp), realtime & audit APIs full lifecycle", async ({ request }) => {
    const adminToken = mintServiceToken("admin");
    const itAuth = await getCachedItAuth(GATEWAY);
    const ts = Date.now();

    // 1. Files: reject disallowed folder/MIME (422), then register -> write PDF upload -> claim -> GET content -> DELETE
    const badFile = await request.post(`${GATEWAY}/v1/files/uploads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        ownerId: "e2e-api-tester",
        folder: "e2e",
        fileName: `test-${ts}.txt`,
        mimeType: "text/plain",
        fileSize: 12,
      },
    });
    expect(badFile.status()).toBe(422);

    const content = Buffer.from(`%PDF-1.4\n% E2E File Content ${ts}\n%%EOF\n`);
    const regFile = await request.post(`${GATEWAY}/v1/files/uploads`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        ownerId: "e2e-api-tester",
        folder: "general",
        fileName: `test-${ts}.pdf`,
        mimeType: "application/pdf",
        fileSize: content.byteLength,
      },
    });
    expect(regFile.status(), await regFile.text()).toBe(201);
    const fileRec = await regFile.json();

    const putUpload = await request.put(
      `${GATEWAY}/v1/files/uploads/content?fileUrl=${encodeURIComponent(fileRec.fileUrl)}&ownerId=e2e-api-tester`,
      {
        headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/pdf" },
        data: content,
      },
    );
    expect(putUpload.status(), await putUpload.text()).toBe(200);

    const claimRes = await request.post(`${GATEWAY}/v1/files/uploads/claim`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { fileUrl: fileRec.fileUrl, ownerId: "e2e-api-tester", requirePrivate: false },
    });
    expect(claimRes.status(), await claimRes.text()).toBe(200);

    const readRes = await request.get(
      `${GATEWAY}/v1/files/content?fileUrl=${encodeURIComponent(fileRec.fileUrl)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(readRes.status()).toBe(200);
    expect(await readRes.text()).toBe(content.toString());

    const delFile = await request.delete(
      `${GATEWAY}/v1/files/content?fileUrl=${encodeURIComponent(fileRec.fileUrl)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(delFile.status()).toBe(204);

    // 2. Notify: queue email -> verify Mailpit, queue whatsapp -> verify sandbox, inbox delivery + summary + actions
    const emailTarget = `e2e-notify-${ts}@example.test`;
    const mailRes = await request.post(`${GATEWAY}/v1/notify/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        channel: "email",
        to: emailTarget,
        subject: `E2E Notify Check ${ts}`,
        text: `Automated notify verification ${ts}`,
        idempotencyKey: `e2e-mail-${ts}`,
      },
    });
    expect(mailRes.status()).toBe(202);
    const msg = await fetchMailpitMessage(emailTarget, new RegExp(`${ts}`), 15_000);
    expect(msg.Subject).toContain(String(ts));

    const waRes = await request.post(`${GATEWAY}/v1/notify/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        channel: "whatsapp",
        to: "+97336001234",
        text: `E2E WA Check ${ts}`,
        idempotencyKey: `e2e-wa-${ts}`,
      },
    });
    expect(waRes.status()).toBe(202);
    const waMsgs = await fetchWhatsAppMessages();
    expect(waMsgs).toBeDefined();

    // Inbox delivery + IT desk message summary
    const inboxPut = await request.post(`${GATEWAY}/v1/notify/inbox`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        items: [
          {
            id: crypto.randomUUID(),
            realm: "staff",
            recipient: "BA0001",
            priority: "normal",
            title: `E2E Inbox ${ts}`,
            body: "Test inbox notification",
          },
        ],
      },
    });
    expect(inboxPut.status()).toBe(200);

    const deskNotify = await request.get(`${GATEWAY}/v1/notify/desk/messages`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
    });
    expect(deskNotify.status()).toBe(200);

    // 3. Realtime: status PUT (400 bad field guard -> 200 valid) -> GET -> presence GET -> DELETE
    const rtBad = await request.put(`${GATEWAY}/v1/realtime/status?realm=staff&userId=BA0001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "online", note: "invalid" },
    });
    expect(rtBad.status()).toBe(400);

    const rtPut = await request.put(`${GATEWAY}/v1/realtime/status?realm=staff&userId=BA0001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: "available", message: `e2e-${ts}` },
    });
    expect(rtPut.status(), await rtPut.text()).toBe(200);
    const rtGet = await request.get(`${GATEWAY}/v1/realtime/status?realm=staff&userId=BA0001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(rtGet.status()).toBe(200);
    const rtPres = await request.get(`${GATEWAY}/v1/realtime/presence?realm=staff&ids=BA0001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(rtPres.status()).toBe(200);
    const rtDel = await request.delete(`${GATEWAY}/v1/realtime/status?realm=staff&userId=BA0001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(rtDel.status()).toBe(200);

    // 4. Audit desk: list events + subjects
    const auditEvents = await request.get(`${GATEWAY}/v1/audit/desk/events?limit=10`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
    });
    expect(auditEvents.status()).toBe(200);
    const auditJson = await auditEvents.json();
    expect(Array.isArray(auditJson.items)).toBe(true);
    const auditSubjects = await request.get(`${GATEWAY}/v1/audit/desk/subjects`, {
      headers: { Authorization: `Bearer ${itAuth.accessToken}` },
    });
    expect(auditSubjects.status()).toBe(200);
  });
});
