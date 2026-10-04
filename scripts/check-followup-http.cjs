const assert = require("node:assert/strict");
const { randomUUID, createHmac } = require("node:crypto");
const { createRequire } = require("node:module");
const database = new URL(process.env.DATABASE_URL || "file:///missing");
const admin = new URL(process.env.ADMIN_TEST_URL || "http://127.0.0.1:32151");
const web = new URL(process.env.WEBSITE_TEST_URL || "http://127.0.0.1:32150");
if (
  !database.pathname.endsWith("_test") ||
  ![database, admin, web].every((url) =>
    ["localhost", "127.0.0.1"].includes(url.hostname),
  )
)
  throw Error("Use disposable local DB and local audit servers");
const secret = process.env.AUDIT_REVALIDATION_SECRET;
if (!secret) throw Error("Set the audit server revalidation secret");
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
  },
});
const { db } = require("../packages/database/src/db.ts");
const {
  getWebsiteEditor,
} = require("../packages/database/src/queries/website.ts");
const bcrypt = createRequire(
  require.resolve("../packages/database/package.json"),
)("bcryptjs");
const prefix = "http-followup-" + randomUUID();
let user, company, banner, website, invoice;
async function invalidate(headers = { "x-revalidate-secret": secret }) {
  return fetch(new URL("/api/revalidate", web), {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ tags: ["company", "website"], paths: [] }),
  });
}
async function main() {
  user = await db.user.create({
    data: {
      email: prefix + "@example.invalid",
      fullName: prefix,
      passwordHash: await bcrypt.hash("test-password-12-characters", 10),
      role: "viewer",
      permissions: {
        "invoices:read": true,
        "invoices:export": false,
        "calendar:read": false,
      },
    },
  });
  const login = await fetch(new URL("/api/auth/login", admin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: "test-password-12-characters",
    }),
  });
  assert.equal(login.status, 200, await login.clone().text());
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const me = await fetch(new URL("/api/auth/me", admin), {
    headers: { cookie },
  });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.id, user.id);
  const stored = await db.session.findFirstOrThrow({
    where: { userId: user.id },
  });
  assert.notEqual(stored.token, cookie.split("=")[1]);
  assert.match(stored.token, /^[a-f0-9]{64}$/);
  assert.equal(
    (
      await fetch(new URL("/api/documents/missing/pdf?download=true", admin), {
        headers: { cookie },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(new URL("/api/documents/missing/pdf", admin), {
        headers: { cookie },
      })
    ).status,
    404,
  );
  assert.equal(
    (await fetch(new URL("/api/calendar/feed", admin), { headers: { cookie } }))
      .status,
    403,
  );
  invoice = await db.invoice.create({
    data: {
      invoiceNumber: prefix,
      dueDate: new Date(),
      language: "en",
      status: "sent",
      subtotal: 10,
      totalAmount: 10,
      lineItems: {
        create: { descriptionEn: "Audit PDF rendering", unitPrice: 10, lineTotal: 10 },
      },
    },
  });
  const pdf = await fetch(new URL(`/api/documents/${invoice.id}/pdf`, admin), {
    headers: { cookie },
  });
  assert.equal(pdf.status, 200, pdf.status !== 200 ? await pdf.text() : "");
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  await fetch(new URL("/api/auth/logout", admin), {
    method: "POST",
    headers: { cookie },
  });
  assert.equal(
    (await fetch(new URL("/api/auth/me", admin), { headers: { cookie } }))
      .status,
    401,
  );
  company = await db.companySetting.findFirstOrThrow();
  await db.companySetting.update({
    where: { id: company.id },
    data: { companyNameEn: prefix + "-original" },
  });
  assert.equal((await invalidate()).status, 200);
  let html = await (await fetch(new URL("/en", web))).text();
  assert.ok(html.includes(prefix + "-original"));
  await db.companySetting.update({
    where: { id: company.id },
    data: { companyNameEn: prefix + "-updated" },
  });
  html = await (await fetch(new URL("/en", web))).text();
  assert.ok(html.includes(prefix + "-original"));
  assert.ok(!html.includes(prefix + "-updated"));
  assert.equal((await invalidate({})).status, 401);
  assert.equal((await invalidate()).status, 200);
  html = await (await fetch(new URL("/en", web))).text();
  assert.ok(html.includes(prefix + "-updated"));
  website = await getWebsiteEditor();
  banner = await db.heroBanner.create({
    data: {
      titleEn: prefix + "-draft",
      titleAr: prefix + "-draft",
      mediaType: "image",
      mediaUrl: "/brand/logo.svg",
    },
  });
  await invalidate();
  html = await (await fetch(new URL("/en", web))).text();
  assert.ok(!html.includes(prefix + "-draft"));
  const expires = String(Date.now() + 60000);
  const signature = createHmac("sha256", secret)
    .update("website-preview:" + expires)
    .digest("hex");
  html = await (
    await fetch(new URL("/en", web), {
      headers: { cookie: "ishoot_preview=" + expires + "." + signature },
    })
  ).text();
  assert.ok(html.includes(prefix + "-draft"));
  html = await (await fetch(new URL("/en", web))).text();
  assert.ok(!html.includes(prefix + "-draft"));
  console.log(
    "PASS: real hashed-session login/logout; PDF rendering and export denial; private calendar grants; public cache persists between requests, invalidates and isolates signed preview.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (invoice) await db.invoice.delete({ where: { id: invoice.id } });
    if (banner) await db.heroBanner.delete({ where: { id: banner.id } });
    if (company)
      await db.companySetting.update({
        where: { id: company.id },
        data: { companyNameEn: company.companyNameEn },
      });
    await invalidate();
    if (user) {
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.activityLog.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
    await db.$disconnect();
  });
