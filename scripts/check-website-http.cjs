// Run against the local preview server connected to the SAME disposable *_test database.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const dbUrl = new URL(process.env.DATABASE_URL || "file:///missing");
const origin = new URL(process.env.WEBSITE_TEST_URL || "http://localhost:3100");
if (
  !dbUrl.pathname.endsWith("_test") ||
  !["localhost", "127.0.0.1"].includes(origin.hostname)
)
  throw new Error("Use local server and disposable *_test database");
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
const keys = [];
const email = `http-${randomUUID()}@example.invalid`;
async function post(path, body) {
  const res = await fetch(new URL(path, origin), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
async function main() {
  for (const intent of [
    "inquiry",
    "quote_request",
    "complaint",
    "suggestion",
  ]) {
    const key = randomUUID();
    keys.push(key);
    const body = {
      intent,
      submissionKey: key,
      fullName: "HTTP verification",
      email: intent === "suggestion" ? "" : email,
      message: "Isolated endpoint verification",
      locale: "en",
    };
    const first = await post("/api/inquiry", body);
    assert.equal(first.status, 200, JSON.stringify(first));
    assert.ok(first.body.reference);
    const replay = await post("/api/inquiry", body);
    assert.equal(replay.body.reference, first.body.reference);
    const saved = await db.inquiry.findUniqueOrThrow({
      where: { submissionKey: key },
    });
    assert.equal(saved.intent, intent);
    assert.equal(
      saved.confirmationStatus,
      intent === "suggestion" ? "not_requested" : "failed",
    );
    if (["complaint", "suggestion"].includes(intent))
      assert.equal(saved.customerId, null);
  }
  const key = randomUUID();
  keys.push(key);
  const review = {
    submissionKey: key,
    authorName: "HTTP verification",
    quote: "Isolated Arabic review",
    locale: "ar",
    rating: 4,
  };
  assert.equal((await post("/api/reviews", review)).status, 200);
  assert.equal((await post("/api/reviews", review)).status, 200);
  const saved = await db.review.findUniqueOrThrow({
    where: { submissionKey: key },
  });
  assert.equal(saved.isApproved, false);
  assert.equal(saved.quoteEn, "");
  assert.equal(saved.originalLocale, "ar");
  assert.equal(
    (await post("/api/reviews", { ...review, rating: 6 })).status,
    400,
  );
  assert.equal(
    (
      await post("/api/inquiry", {
        intent: "complaint",
        submissionKey: randomUUID(),
        message: "Missing name and contact",
      })
    ).status,
    400,
  );
  console.log(
    "PASS: all five contact paths persist; retries return one request; invalid input rejected; reviews await moderation; disabled email is not reported as sent.",
  );
}
main()
  .finally(async () => {
    await db.inquiry.deleteMany({ where: { submissionKey: { in: keys } } });
    await db.review.deleteMany({ where: { submissionKey: { in: keys } } });
    await db.crmContact.deleteMany({ where: { email } });
    await db.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
