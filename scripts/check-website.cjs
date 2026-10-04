// Isolated PostgreSQL integration check. Set DATABASE_URL to a disposable *_test database.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("Use a disposable database ending in _test");
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
    jsx: "react",
  },
});
const { db } = require("../packages/database/src/db.ts");
const {
  resolveIncomingLead,
} = require("../packages/database/src/services/lead-resolver.ts");
const { getReviews } = require("../packages/database/src/queries/reviews.ts");
const {
  getAllInquiries,
} = require("../packages/database/src/queries/inquiries.ts");
const {
  getCustomerDossier,
} = require("../packages/database/src/queries/crm.ts");
const {
  getWebsiteEditor,
  getWebsiteSnapshot,
} = require("../packages/database/src/queries/website.ts");
const {
  defaultWebsiteConfig,
  validateWebsiteConfig,
  safeWebsiteUrl,
} = require("../packages/database/src/website-config.ts");
async function main() {
  const key = randomUUID();
  const email = `website-${key}@example.invalid`;
  const data = {
    name: "Integration test",
    email,
    message: "Production brief",
    intent: "quote_request",
    submissionKey: key,
    requestHash: "same",
  };
  const [a, b] = await Promise.all([
    resolveIncomingLead(data),
    resolveIncomingLead(data),
  ]);
  assert.equal(a.inquiryId, b.inquiryId);
  assert.notEqual(a.repeated, b.repeated);
  assert.equal(await db.inquiry.count({ where: { submissionKey: key } }), 1);
  assert.equal(await db.crmContact.count({ where: { email } }), 1);
  await assert.rejects(
    resolveIncomingLead({ ...data, requestHash: "different" }),
    /already used/,
  );
  const complaint = await resolveIncomingLead({
    ...data,
    intent: "complaint",
    submissionKey: randomUUID(),
    message: "Private complaint",
  });
  const suggestion = await resolveIncomingLead({
    name: "Anonymous",
    email: "",
    message: "Suggestion",
    intent: "suggestion",
    submissionKey: randomUUID(),
  });
  assert.equal(complaint.customerId, null);
  assert.equal(suggestion.customerId, null);
  assert.equal(await db.crmContact.count({ where: { email } }), 1);
  assert.equal(
    (await getAllInquiries()).some((i) => i.id === complaint.inquiryId),
    false,
  );
  assert.equal(
    (await getAllInquiries(true)).some((i) => i.id === complaint.inquiryId),
    true,
  );
  assert.equal(
    (await getCustomerDossier(a.customerId)).inquiries.some(
      (i) => i.message === "Private complaint",
    ),
    false,
  );
  const mapped = (await getAllInquiries(true)).find(
    (i) => i.id === a.inquiryId,
  );
  assert.equal(mapped.confirmation_sent, false);
  assert.equal(mapped.customer_id, a.customerId);
  const review = await db.review.create({
    data: {
      clientId: a.customerId,
      authorEn: "Test author",
      authorAr: "كاتب اختبار",
      quoteEn: "Test review",
      quoteAr: "",
      rating: 4,
      isApproved: true,
    },
  });
  const publicReview = (await getReviews(false)).find(
    (r) => r.id === review.id,
  );
  assert.equal("client" in publicReview, false);
  assert.equal("clientId" in publicReview, false);
  assert.equal("requestHash" in publicReview, false);
  await db.review.update({
    where: { id: review.id },
    data: { isApproved: false },
  });
  assert.equal(
    (await getReviews(false)).some((r) => r.id === review.id),
    false,
  );
  assert.throws(
    () => validateWebsiteConfig({ ...defaultWebsiteConfig, sections: [] }),
    /section/,
  );
  assert.equal(safeWebsiteUrl("javascript:alert(1)", "/contact"), "/contact");
  assert.equal(safeWebsiteUrl("//evil.example", "/contact"), "/contact");
  const content = await getWebsiteEditor();
  if (!content.published) {
    await assert.rejects(getWebsiteSnapshot(), /setup is incomplete/);
    const {collectWebsiteDraft} = require("../packages/database/src/queries/website.ts");
    await db.websiteContent.update({where:{id:"main"},data:{published:JSON.parse(JSON.stringify(await collectWebsiteDraft(defaultWebsiteConfig))),publishedAt:new Date()}});
  }
  const old = await getWebsiteSnapshot();
  await db.websiteContent.update({
    where: { id: "main" },
    data: { draft: { ...defaultWebsiteConfig, contactTitleEn: "Draft only" } },
  });
  assert.equal(
    (await getWebsiteSnapshot()).config.contactTitleEn,
    old.config.contactTitleEn,
  );
  assert.equal(
    (await getWebsiteSnapshot(true)).config.contactTitleEn,
    "Draft only",
  );
  await db.websiteContent.update({
    where: { id: "main" },
    data: { draft: content.draft, published: content.published ?? require("../packages/database/node_modules/@prisma/client").Prisma.DbNull, publishedAt:content.publishedAt },
  });
  await db.review.delete({ where: { id: review.id } });
  await db.inquiry.deleteMany({
    where: {
      id: { in: [a.inquiryId, complaint.inquiryId, suggestion.inquiryId] },
    },
  });
  await db.crmContact.delete({ where: { id: a.customerId } });
  console.log(
    "PASS: concurrent idempotency, identity linking, feedback isolation, complaint privacy, delivery mapping, review projection/moderation and draft isolation.",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
