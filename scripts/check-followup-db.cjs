const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const url = new URL(process.env.DATABASE_URL || "file:///missing");
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
)
  throw Error("Use a disposable local *_test database");
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
const requests = require("../packages/database/src/queries/inquiries.ts");
const {
  getCRMDealOverview,
  getCustomerDossier,
} = require("../packages/database/src/queries/crm.ts");
const prefix = "followup-" + randomUUID();
let actor, request, contact, savedWebsite;
const publicationJobs = [];
const ids = [];
async function main() {
  actor = await db.user.create({
    data: {
      email: prefix + "@example.invalid",
      fullName: prefix,
      passwordHash: "test-only",
      role: "super_admin",
    },
  });
  const sessions = require("../packages/database/src/queries/sessions.ts");
  const rawToken = prefix + "-opaque-token";
  await sessions.createSession({
    userId: actor.id,
    token: rawToken,
    expiresAt: new Date(Date.now() + 60000),
  });
  const stored = await db.session.findFirstOrThrow({
    where: { userId: actor.id },
  });
  assert.notEqual(stored.token, rawToken);
  assert.match(stored.token, /^[a-f0-9]{64}$/);
  assert.equal((await sessions.getSessionByToken(rawToken)).user_id, actor.id);
  await sessions.deleteSession(rawToken);
  assert.equal(await sessions.getSessionByToken(rawToken), null);
  const legacyToken = prefix + "-legacy-token";
  await db.session.create({
    data: {
      userId: actor.id,
      token: legacyToken,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  await sessions.createSession({
    userId: actor.id,
    token: rawToken,
    expiresAt: new Date(Date.now() + 60000),
  });
  const migration = require("node:fs").readFileSync(
    "packages/database/prisma/migrations/20261004030000_session_token_hash/migration.sql",
    "utf8",
  );
  await db.$executeRawUnsafe(migration);
  assert.equal(
    (await sessions.getSessionByToken(legacyToken)).user_id,
    actor.id,
  );
  assert.equal((await sessions.getSessionByToken(rawToken)).user_id, actor.id);
  assert.equal(await db.session.count({ where: { token: legacyToken } }), 0);
  request = await db.inquiry.create({
    data: {
      name: prefix,
      email: actor.email,
      message: "test",
      workflowStatus: "received",
    },
  });
  ids.push(request.id);
  await requests.assignRequest(request.id, {
    assignedToId: actor.id,
    assignedById: actor.id,
    team: "support",
  });
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      requests.reassignRequest(request.id, {
        newAssignedToId: actor.id,
        reassignedById: actor.id,
        notes: "change " + i,
      }),
    ),
  );
  let saved = await db.inquiry.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(saved.customAssignments.length, 9);
  // Work is submitted before it can be approved (REQUEST_TRANSITIONS); approving straight from
  // "assigned" is refused.
  await assert.rejects(requests.approveRequest(request.id, { approvedById: actor.id }));
  await requests.submitRequestForApproval(request.id, { submittedById: actor.id });
  const approvals = await Promise.allSettled(
    [1, 2].map(() =>
      requests.approveRequest(request.id, { approvedById: actor.id }),
    ),
  );
  assert.equal(approvals.filter((r) => r.status === "fulfilled").length, 1);
  saved = await db.inquiry.findUniqueOrThrow({ where: { id: request.id } });
  assert.equal(saved.workflowStatus, "approved");
  assert.equal(saved.approvedById, actor.id);
  assert.ok(saved.approvedAt);
  await requests.confirmRequest(request.id, { confirmedById: actor.id });
  await requests.resolveRequest(request.id, {
    resolvedById: actor.id,
    resolutionNotes: "done",
  });
  await assert.rejects(
    requests.returnRequest(request.id, {
      returnedById: actor.id,
      reason: "reopen",
    }),
    /state changed/,
  );
  const logs = await db.activityLog.count({ where: { entityId: request.id } });
  assert.equal(logs, 13); // assign + 8 reassigns + submit + approve + confirm + resolve
  const other = await db.inquiry.create({
    data: {
      name: prefix,
      email: actor.email,
      message: "rollback",
      workflowStatus: "assigned",
      assignedToId: actor.id,
    },
  });
  ids.push(other.id);
  await assert.rejects(
    requests.approveRequest(other.id, { approvedById: "nonexistent-user" }),
  );
  saved = await db.inquiry.findUniqueOrThrow({ where: { id: other.id } });
  assert.equal(saved.workflowStatus, "assigned");
  assert.equal(saved.customAssignments.length, 0);
  await assert.rejects(
    requests.assignRequest(other.id, {
      assignedToId: actor.id,
      assignedById: actor.id,
      team: "forged-team",
    }),
    /Invalid team/,
  );
  await db.inquiry.createMany({
    data: Array.from({ length: 105 }, () => ({
      name: prefix + "-page",
      email: actor.email,
      message: prefix,
      workflowStatus: "received",
      intent: "quote_request",
    })),
  });
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      requests.getRequestsPage(
        { search: prefix + "-page", intent: "quote_request" },
        page,
      ),
    ),
  );
  assert.deepEqual(
    pages.map((p) => p.items.length),
    [50, 50, 5],
  );
  assert.equal(
    new Set(pages.flatMap((p) => p.items.map((r) => r.id))).size,
    105,
  );
  assert.ok(pages.every((p) => p.total === 105));
  contact = await db.crmContact.create({ data: { firstName: prefix } });
  for (const [currency, total, status, paid] of [
    ["BHD", 10, "sent", 2],
    ["USD", 20, "sent", 3],
    ["BHD", 100, "draft", 0],
    ["BHD", 200, "void", 0],
  ]) {
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: prefix + currency + status,
        clientId: contact.id,
        dueDate: new Date(),
        currency,
        totalAmount: total,
        status,
      },
    });
    if (paid)
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          receiptNumber: invoice.invoiceNumber,
          amount: paid,
          currency,
        },
      });
  }
  const dossier = await getCustomerDossier(contact.id);
  assert.ok(dossier);
  assert.deepEqual(dossier.metrics.balancesByCurrency, {
    BHD: { totalLtv: 10, totalPaid: 2, totalOutstanding: 8 },
    USD: { totalLtv: 20, totalPaid: 3, totalOutstanding: 17 },
  });
  assert.equal(dossier.metrics.totalLtv, 10);
  await db.crmDeal.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      title: prefix,
      contactId: contact.id,
      dealValue: 10,
      currency: i === 0 ? "USD" : "BHD",
      dealStage: "lead",
    })),
  });
  const overview = await getCRMDealOverview();
  assert.equal(overview.recent.length, 5);
  assert.equal(overview.activeCount, 12);
  assert.equal(overview.activePipelineValue, 110);
  const {
    processRevalidationJobs,
  } = require("../packages/database/src/services/revalidation-outbox.ts");
  const createJob = (suffix) =>
    db.revalidationJob.create({
      data: {
        eventKey: prefix + suffix,
        payload: { tags: ["website"], paths: [] },
      },
    });
  const retry = await createJob("retry");
  await processRevalidationJobs({
    webUrl: "http://127.0.0.1:1",
    secret: "test",
    fetcher: async () => new Response("", { status: 503 }),
    batchSize: 1,
  });
  let job = await db.revalidationJob.findUniqueOrThrow({
    where: { id: retry.id },
  });
  assert.equal(job.status, "pending");
  assert.equal(job.attempts, 1);
  assert.ok(job.nextAttemptAt > new Date());
  await processRevalidationJobs({
    webUrl: "http://127.0.0.1:1",
    secret: "test",
    now: new Date(Date.now() + 20000),
    fetcher: async () => new Response("{}", { status: 200 }),
    batchSize: 1,
  });
  job = await db.revalidationJob.findUniqueOrThrow({ where: { id: retry.id } });
  assert.equal(job.status, "delivered");
  assert.equal(job.attempts, 2);
  await Promise.all([createJob("parallel1"), createJob("parallel2")]);
  let calls = 0;
  await Promise.all(
    [1, 2].map(() =>
      processRevalidationJobs({
        webUrl: "http://127.0.0.1:1",
        secret: "test",
        fetcher: async () => {
          calls++;
          return new Response("{}", { status: 200 });
        },
        batchSize: 1,
      }),
    ),
  );
  assert.equal(calls, 2);
  assert.equal(
    await db.revalidationJob.count({
      where: { eventKey: { startsWith: prefix }, status: "delivered" },
    }),
    3,
  );
  const exhausted = await createJob("exhausted");
  await db.revalidationJob.update({
    where: { id: exhausted.id },
    data: { status: "processing", attempts: 8, nextAttemptAt: new Date(0) },
  });
  await processRevalidationJobs({
    webUrl: "http://127.0.0.1:1",
    secret: "test",
    fetcher: async () => {
      throw Error("must not deliver exhausted job");
    },
  });
  assert.equal(
    (
      await db.revalidationJob.findUniqueOrThrow({
        where: { id: exhausted.id },
      })
    ).status,
    "failed",
  );
  console.log(
    "PASS: outbox retains delivery failures, retries successfully, concurrent workers claim distinct jobs and exhausted leases terminate.",
  );
  const websiteQueries = require("../packages/database/src/queries/website.ts");
  savedWebsite = await websiteQueries.getWebsiteEditor();
  const moduleBox = { exports: {} };
  const compiled = require("typescript").transpileModule(
    require("node:fs").readFileSync(
      "apps/admin/app/actions/website.ts",
      "utf8",
    ),
    { compilerOptions: { module: 1, target: 9 } },
  ).outputText;
  const dependencies = {
    "node:crypto": require("node:crypto"),
    "@platform/database": { db, ...websiteQueries, requireFeatureEnabled: async()=>{}, measureOperation: async (_name,fn)=>fn() },
    "../../lib/action-input": require("../apps/admin/lib/action-input.ts"),
    "@platform/database/website-config": require("../packages/database/src/website-config.ts"),
    "../../lib/auth": { requirePermission: async () => ({ id: actor.id }) },
    "next/cache": { revalidatePath: () => {} },
    "../../lib/revalidate-web": { revalidatePublicSite: async () => false },
    "@platform/locales": require("../packages/locales/src/index.ts"),
    "../../constants/routes": require("../packages/database/src/constants/routes.ts"),
  };
  require("node:vm").runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (name) => {
      if (!(name in dependencies)) throw Error(name);
      return dependencies[name];
    },
    Date,
    JSON,
    console,
  });
  await moduleBox.exports.publishWebsiteAction(savedWebsite.revision);
  const queued = await db.revalidationJob.findUniqueOrThrow({
    where: { eventKey: `website:publish:${savedWebsite.revision + 1}` },
  });
  publicationJobs.push(queued.id);
  assert.equal(queued.status, "pending");
  const conflicting = await db.revalidationJob.create({
    data: {
      eventKey: `website:publish:${savedWebsite.revision + 2}`,
      payload: {},
    },
  });
  publicationJobs.push(conflicting.id);
  await assert.rejects(
    moduleBox.exports.publishWebsiteAction(savedWebsite.revision + 1),
  );
  assert.equal(
    (await db.websiteContent.findUniqueOrThrow({ where: { id: "main" } }))
      .revision,
    savedWebsite.revision + 1,
  );
  console.log(
    "PASS: publication queues invalidation despite delivery failure; queue failure rolls back publication and revision.",
  );
  console.log(
    "PASS: per-currency issued invoice totals; draft and void exclusion; bounded five-deal overview with full counts.",
  );
  console.log(
    "PASS: concurrent request history retained; approval wins once; approver persisted; audit failure rolls back; terminal transitions rejected; pagination reaches all 105 matches.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (savedWebsite) {
      const {
        Prisma,
      } = require("../packages/database/node_modules/@prisma/client");
      await db.websiteContent.update({
        where: { id: "main" },
        data: {
          draft: savedWebsite.draft,
          published: savedWebsite.published ?? Prisma.DbNull,
          previous: savedWebsite.previous ?? Prisma.DbNull,
          revision: savedWebsite.revision,
          publishedAt: savedWebsite.publishedAt,
          updatedAt: savedWebsite.updatedAt,
        },
      });
    }
    await db.revalidationJob.deleteMany({
      where: { id: { in: publicationJobs } },
    });
    await db.revalidationJob.deleteMany({
      where: { eventKey: { startsWith: prefix } },
    });
    if (contact) {
      const invoices = await db.invoice.findMany({
        where: { clientId: contact.id },
        select: { id: true },
      });
      await db.payment.deleteMany({
        where: { invoiceId: { in: invoices.map((i) => i.id) } },
      });
      await db.invoice.deleteMany({ where: { clientId: contact.id } });
      await db.crmDeal.deleteMany({ where: { contactId: contact.id } });
      await db.crmContact.delete({ where: { id: contact.id } });
    }
    await db.activityLog.deleteMany({ where: { userId: actor?.id || prefix } });
    await db.inquiry.deleteMany({
      where: { email: prefix + "@example.invalid" },
    });
    if (actor) await db.session.deleteMany({ where: { userId: actor.id } });
    if (actor) await db.user.delete({ where: { id: actor.id } });
    await db.$disconnect();
  });
