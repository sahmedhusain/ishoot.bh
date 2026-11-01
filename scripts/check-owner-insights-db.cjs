// Disposable local database only. All records and changes roll back; provider HTTP is mocked.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const integrations = require("../packages/database/src/queries/integrations.ts");
const { getSocialAnalytics } = require("../packages/database/src/queries/social-analytics.ts");
const url = new URL(process.env.DATABASE_URL);
assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname.endsWith("_test"), "Use a disposable local *_test database");
const rollback = new Error("ROLLBACK_OWNER_INSIGHTS_TEST");
const now = new Date("2199-03-31T12:00:00Z");
const channelId = "UC0000000000000000000000";
const credentials = { channelId, apiKey: "E2E-public-key", ownerAccessToken: "E2E-owner-token", clientId: "E2E-client", clientSecret: "E2E-client-secret", refreshToken: "E2E-refresh-token" };
const names = ["views", "likes", "comments", "shares", "subscribersGained", "subscribersLost"];
let value = 0, ownerQuota = false, onChannel = null, holdChannel = null;
const report = (daily, rows) => ({ columnHeaders: [...(daily ? ["day"] : []), ...names].map(name => ({ name })), rows });
global.fetch = async (input, init) => {
  const target = new URL(input);
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (target.hostname === "www.googleapis.com" && target.pathname.endsWith("/channels")) {
    if (onChannel) { const callback = onChannel; onChannel = null; await callback(); }
    if (holdChannel) await holdChannel();
    return json({ items: [{ snippet: { title: "E2E owned channel" }, statistics: { subscriberCount: "0", viewCount: "900", videoCount: "0" } }] });
  }
  if (target.hostname === "oauth2.googleapis.com" && target.pathname === "/token") {
    assert.equal(new URLSearchParams(init.body).get("refresh_token"), credentials.refreshToken);
    return json({ access_token: "E2E-refreshed-owner-token", token_type: "Bearer", expires_in: 3600 });
  }
  if (target.hostname === "youtubeanalytics.googleapis.com" && target.pathname === "/v2/reports") {
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer E2E-refreshed-owner-token");
    if (ownerQuota) return json({ error: { message: "E2E quota exceeded", errors: [{ reason: "quotaExceeded" }] } }, 403);
    return json(target.searchParams.has("dimensions") ? report(true, [["2199-03-26", 1, 2, 3, 4, 5, 6], ["2199-03-27", 0, 0, 0, 0, 0, 0]]) : report(false, [[value, 2, 3, 4, 5, 6]]));
  }
  throw new Error(`Unmocked external request to ${target.hostname}${target.pathname}`);
};

async function main() {
  try {
    await db.$transaction(tx => transactionContext.run(tx, async () => {
      const actor = await db.user.findFirstOrThrow({ where: { role: "super_admin" } });
      await integrations.unlinkIntegrationSettings("youtube");
      const save = (values = credentials) => integrations.saveIntegrationSettings("youtube", { isActive: true, values }, actor.id);
      await save();
      const result = await integrations.syncSocialIntegration("youtube", now);
      assert.deepEqual(Object.keys(result).sort(), ["metrics", "posts"]);
      const rows = await db.socialInsightSnapshot.findMany({ where: { sourceProvider: "youtube", sourceAccountId: channelId } });
      assert.equal(rows.length, 6);
      assert.equal(rows.find(row => row.periodDays === 30).nativeMetrics.followers_gained, "subscribersGained");
      assert(rows.every(row => row.timeZone === "America/Los_Angeles"));
      let analytics = await getSocialAnalytics({ platform: "youtube", days: 30, now });
      assert.equal(analytics.ownerInsights[0].snapshot.metrics.views, 0);
      assert.equal(analytics.ownerInsights[0].snapshot.metrics.reach, undefined);
      assert.equal(analytics.ownerInsights[0].snapshot.periodEnd, "2199-03-27");
      let record = await integrations.getIntegrationRecord("youtube");
      assert.equal(record.credentials.ownerAccessToken, "E2E-refreshed-owner-token");
      assert.equal(record.syncLeaseToken, null);
      assert.equal(record.syncLeaseUntil, null);
      assert(!JSON.stringify(record.config).includes("E2E-refreshed-owner-token"));
      const view = (await integrations.listIntegrationsForAdmin()).find(row => row.provider === "youtube");
      assert.equal(view.secrets.ownerAccessToken.set, true);
      assert.equal(view.values.ownerAccessToken, undefined);
      assert(!JSON.stringify(view).includes("E2E-refreshed-owner-token"));

      value = 13;
      await integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 1000));
      assert.equal(await db.socialInsightSnapshot.count({ where: { sourceProvider: "youtube", sourceAccountId: channelId } }), 6);
      analytics = await getSocialAnalytics({ platform: "youtube", days: 365, now: new Date(now.getTime() + 1000) });
      assert.equal(analytics.ownerInsights[0].snapshot.metrics.views, 13);

      ownerQuota = true;
      await integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 2000));
      analytics = await getSocialAnalytics({ platform: "youtube", now: new Date(now.getTime() + 2000) });
      assert.equal(analytics.ownerInsights[0].status, "rate_limited");
      assert.equal(analytics.ownerInsights[0].snapshot, null);
      assert.equal(analytics.accounts[0].followers, 0);
      assert.equal(await db.socialInsightSnapshot.count({ where: { sourceProvider: "youtube", sourceAccountId: channelId } }), 6);
      await assert.rejects(integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 3000)), /wait|waiting/i);
      ownerQuota = false;
      await save();
      record = await integrations.getIntegrationRecord("youtube");
      assert.equal(record.config.retryAfterAt, null);

      let entered;
      const started = new Promise(resolve => { entered = resolve; });
      let release;
      const blocked = new Promise(resolve => { release = resolve; });
      holdChannel = async () => { entered(); await blocked; };
      const pending = integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 4000));
      try {
        await started;
        await assert.rejects(integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 4000)), error => error.status === 409);
      } finally { holdChannel = null; release(); }
      await pending;
      record = await integrations.getIntegrationRecord("youtube");
      const unchanged = record.credentials;
      onChannel = async () => { onChannel = null; await save(unchanged); };
      await assert.rejects(integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 4500)), error => error.status === 409);
      record = await integrations.getIntegrationRecord("youtube");
      assert.equal(record.syncLeaseToken, null);
      assert.equal(record.syncLeaseUntil, null);
      await integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 4600));

      onChannel = () => integrations.unlinkIntegrationSettings("youtube", actor.id);
      await assert.rejects(integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 5000)), error => error.status === 409);
      record = await integrations.getIntegrationRecord("youtube");
      assert.equal(record.isActive, false);
      assert.equal(record.healthStatus, "unknown");
      assert.equal(record.credentials, null);
      assert.deepEqual(record.config, {});
      analytics = await getSocialAnalytics({ platform: "youtube", now });
      assert.equal(analytics.ownerInsights.length, 0);
      assert.equal(analytics.accounts[0].followers, null);

      await save();
      const replacement = { ...credentials, channelId: "UC1111111111111111111111", ownerAccessToken: "E2E-replacement-token" };
      onChannel = () => save(replacement);
      await assert.rejects(integrations.syncSocialIntegration("youtube", new Date(now.getTime() + 6000)), error => error.status === 409);
      record = await integrations.getIntegrationRecord("youtube");
      assert.equal(record.healthStatus, "unknown");
      assert.deepEqual(record.config.socialAccounts, {});
      assert.equal(await db.socialInsightSnapshot.count({ where: { sourceAccountId: replacement.channelId } }), 0);
      onChannel = () => save(credentials);
      await assert.rejects(integrations.testIntegration("youtube"), /integration settings changed/i);
      record = await integrations.getIntegrationRecord("youtube");
      assert.equal(record.healthStatus, "unknown");
      assert.equal(record.accountName, null);
      throw rollback;
    }), { timeout: 60000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally {
    await integrations.unlinkIntegrationSettings("youtube").catch(() => {});
  }
  console.log("Owner insights DB checks passed: real zero/null, native periods/history/upsert, encrypted refresh, no secret DTO, rate backoff, one sync lease, disconnect/reconfiguration/check races; fixtures rolled back.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
