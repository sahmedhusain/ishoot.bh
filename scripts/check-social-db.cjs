// Run: node scripts/check-social-db.cjs  (local database only; everything is rolled back)
// Integrations and social analytics against the real schema, with the provider APIs mocked.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const integrations = require("../packages/database/src/queries/integrations.ts");
const analytics = require("../packages/database/src/queries/social-analytics.ts");

const rollback = new Error("ROLLBACK_SOCIAL_TEST");
const TOKEN = "EAAG-secret-token-123456";
const now = new Date("2199-03-31T12:00:00Z");
const day = (n) => new Date(now.getTime() - n * 86400000).toISOString();

// Fake Graph API: a page with two posts and an Instagram account with one reel.
let likes = 40;
let failNext = false;
const calls = [];
global.fetch = async (url, init) => {
  calls.push({ url: String(url), auth: new Headers(init?.headers).get("Authorization") });
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (failNext) return json(400, { error: { message: "Error validating access token: Session has expired", code: 190 } });
  const u = new URL(String(url));
  if (u.pathname.endsWith("/page-1")) return json(200, { name: "Example Productions", followers_count: 1200 });
  if (u.pathname.endsWith("/page-1/posts"))
    return json(200, { data: [
      { id: "p1", message: "Behind the scenes", created_time: day(2), permalink_url: "https://facebook.com/p1", reactions: { summary: { total_count: likes } }, comments: { summary: { total_count: 5 } }, shares: { count: 3 } },
      { id: "p2", message: "Old post", created_time: day(45), reactions: { summary: { total_count: 10 } }, comments: { summary: { total_count: 1 } } },
    ] });
  if (u.pathname.endsWith("/ig-1")) return json(200, { username: "example", followers_count: 3400, media_count: 210 });
  if (u.pathname.endsWith("/ig-1/media"))
    return json(200, { data: [{ id: "m1", caption: "Reel", media_type: "VIDEO", permalink: "https://instagram.com/p/m1", timestamp: day(1), like_count: 300, comments_count: 20 }] });
  if (u.host === "api.resend.com") return json(200, { data: [{ name: "example.com", status: "verified" }] });
  return json(404, { error: { message: "Unknown endpoint" } });
};

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true }, select: { id: true } });
      await tx.socialPost.deleteMany({});
      await tx.socialMetric.deleteMany({});
      await tx.integrationSetting.deleteMany({ where: { provider: { in: ["meta", "resend"] } } });

      await tx.socialMetric.create({ data: { platform: "facebook", metricType: "followers", value: 999999, recordedAt: now } });
      const disconnected = await analytics.getSocialAnalytics({ now });
      assert.equal(disconnected.accounts.find(a => a.platform === "facebook").followers, null, "legacy or seeded readings must not be displayed");
      // Required fields are enforced before an integration can be turned on.
      await assert.rejects(integrations.saveIntegrationSettings("meta", { isActive: true, values: { pageId: "page-1" } }, actor.id), /accessToken/);
      await integrations.saveIntegrationSettings("meta", { isActive: true, values: { pageId: "page-1", instagramAccountId: "ig-1", accessToken: TOKEN } }, actor.id);

      // The admin view never contains the secret, only that it is set and its last characters.
      const views = await integrations.listIntegrationsForAdmin();
      const meta = views.find((v) => v.provider === "meta");
      assert.equal(meta.values.pageId, "page-1");
      assert.ok(!JSON.stringify(views).includes(TOKEN), "secrets must not reach the settings page");
      assert.deepEqual(meta.secrets.accessToken, { set: true, hint: "…3456" });
      const stored = await tx.integrationSetting.findUniqueOrThrow({ where: { provider: "meta" } });
      assert.ok(!stored.credentials.includes(TOKEN), "credentials are encrypted at rest");

      // Saving with a blank secret keeps the stored token.
      await integrations.saveIntegrationSettings("meta", { isActive: true, values: { pageId: "page-1", instagramAccountId: "ig-1", accessToken: "" } }, actor.id);
      assert.equal((await integrations.getActiveIntegrationCredentials("meta")).accessToken, TOKEN);

      // Connection test records health and the account name; tokens travel only in the Authorization header.
      const check = await integrations.testIntegration("meta");
      assert.equal(check.ok, true);
      assert.equal(check.accountName, "Example Productions");
      assert.ok(calls.every((call) => !call.url.includes(TOKEN)), "tokens are never put in URLs");
      assert.ok(calls.some((call) => call.auth === `Bearer ${TOKEN}`));

      // Sync stores posts and follower snapshots; a second sync updates counts instead of duplicating posts.
      const first = await integrations.syncSocialIntegration("meta", now);
      assert.deepEqual(first, { posts: 3, metrics: 3 });
      likes = 90;
      await integrations.syncSocialIntegration("meta", new Date(now.getTime() + 1000));
      assert.equal(await tx.socialPost.count(), 3);
      assert.equal((await tx.socialPost.findFirstOrThrow({ where: { externalId: "p1" } })).likes, 90);
      const reel = await tx.socialPost.findFirstOrThrow({ where: { externalId: "m1" } });
      assert.equal(reel.platform, "instagram");
      assert.equal(reel.mediaType, "video");
      const health = await tx.integrationSetting.findUniqueOrThrow({ where: { provider: "meta" } });
      assert.equal(health.healthStatus, "healthy");
      assert.ok(health.lastSyncedAt);

      // Analytics over 30 days: two recent posts, follower totals, engagement maths.
      const report = await analytics.getSocialAnalytics({ days: 30, now: new Date(now.getTime() + 2000) });
      assert.equal(report.totals.posts, 2, "the 45-day-old post is outside the period");
      assert.equal(report.totals.likes, 390);
      assert.equal(report.totals.comments, 25);
      assert.equal(report.totals.interactions, null, "unsupported share/save counts cannot become measured zero");
      assert.equal(report.totals.views, null);
      assert.equal(await tx.socialPostSnapshot.count(), 6, "both post readings survive later syncs");
      assert.equal(report.previousTotals.posts, 1);
      assert.equal(report.accounts.find((a) => a.platform === "facebook").followers, 1200);
      assert.equal(report.accounts.find((a) => a.platform === "instagram").followers, 3400);
      assert.equal(report.daily.length, 30);
      assert.equal(report.daily.reduce((sum, d) => sum + d.posts, 0), 2);
      assert.equal(report.topPosts[0].externalId ?? report.topPosts[0].caption, "Reel");
      const igOnly = await analytics.getSocialAnalytics({ days: 30, platform: "instagram", now: new Date(now.getTime() + 2000) });
      assert.equal(igOnly.totals.posts, 1);
      assert.deepEqual(igOnly.accounts.map(a => a.platform), ["instagram"], "account totals follow the platform filter");

      // A failed sync records the provider's message and marks the numbers stale.
      failNext = true;
      await assert.rejects(integrations.syncSocialIntegration("meta", now), /Session has expired/);
      failNext = false;
      const failed = await tx.integrationSetting.findUniqueOrThrow({ where: { provider: "meta" } });
      assert.equal(failed.healthStatus, "error");
      assert.match(failed.lastError, /Session has expired/);
      assert.ok((await analytics.getSocialAnalytics({ days: 30, now })).accounts.find((a) => a.platform === "facebook").isStale);

      // Resend checks that the sender domain is verified.
      await integrations.saveIntegrationSettings("resend", { isActive: true, values: { apiKey: "re_test_123456789", fromEmail: "billing@example.com" } }, actor.id);
      assert.equal((await integrations.testIntegration("resend")).ok, true);
      await integrations.saveIntegrationSettings("resend", { isActive: true, values: { apiKey: "", fromEmail: "billing@other.com" } }, actor.id);
      assert.match((await integrations.testIntegration("resend")).error, /not added in Resend/);
      await assert.rejects(integrations.saveIntegrationSettings("resend", { isActive: true, values: { apiKey: "", fromEmail: "not-an-email" } }, actor.id), /valid sender/);

      // Unlinking deletes the credentials.
      await integrations.unlinkIntegrationSettings("meta", actor.id);
      assert.equal((await tx.integrationSetting.findUniqueOrThrow({ where: { provider: "meta" } })).credentials, null);
      assert.equal(await integrations.getActiveIntegrationCredentials("meta"), null);
      const unlinked = await analytics.getSocialAnalytics({ now });
      assert.equal(unlinked.totals.posts, 0);
      assert.ok(unlinked.accounts.every(a => a.followers === null));
      assert.equal(await tx.socialPostSnapshot.count(), 6, "disconnect preserves provider history");

      // Content plan validation.
      await assert.rejects(analytics.createSocialPlan({ title: "Launch", platforms: [], status: "idea" }, actor.id), /platform/);
      await assert.rejects(analytics.createSocialPlan({ title: "Launch", platforms: ["instagram"], status: "scheduled" }, actor.id), /date/);
      await assert.rejects(analytics.createSocialPlan({ title: "Launch", platforms: ["myspace"], status: "idea" }, actor.id), /platform/);
      const plan = await analytics.createSocialPlan({ title: "Launch reel", platforms: ["instagram", "tiktok", "instagram"], status: "scheduled", scheduledFor: "2199-04-02T09:00:00.000Z" }, actor.id);
      assert.deepEqual(plan.platforms, ["instagram", "tiktok"]);
      const published = await analytics.updateSocialPlan(plan.id, { title: "Launch reel", platforms: ["instagram"], status: "published", publishedUrl: "https://instagram.com/p/x" });
      assert.equal(published.status, "published");
      await analytics.deleteSocialPlan(plan.id);
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Social database checks passed and rolled back: secrets encrypted and never sent to the page, blank secrets kept, tokens only in headers, sync upserts posts and follower history, period analytics and platform filter, failed syncs flagged stale, Resend domain check, unlink, content plan validation.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
