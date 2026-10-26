import { afterEach, expect, test, vi } from "vitest";
import { fetchSocialSnapshot } from "../../packages/database/src/integrations/providers";

const channelId = "UC1234567890123456789012";
const token = "owner-access-secret";
const now = new Date("2026-03-09T06:30:00Z"); // Still March 8 in Pacific time after the DST change.
const names = ["views", "likes", "comments", "shares", "subscribersGained", "subscribersLost"];
const response = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), { status, headers });
const report = (daily: boolean, rows: unknown[][]) => ({ columnHeaders: [...(daily ? ["day"] : []), ...names].map(name => ({ name })), rows });
const channel = () => response({ items: [{ snippet: { title: "Owned channel" }, statistics: { subscriberCount: "0", viewCount: "900", videoCount: "0" } }] });
const creds = { channelId, apiKey: "public-key", ownerAccessToken: token };
afterEach(() => vi.unstubAllGlobals());

function provider(handler: (url: URL, init: RequestInit) => Promise<Response> | Response) {
  vi.stubGlobal("fetch", async (input: string, init: RequestInit) => {
    const url = new URL(input);
    expect(url.toString()).not.toContain(token);
    expect((init as Record<string, unknown>).secrets).toBeUndefined();
    if (url.hostname === "www.googleapis.com") return channel();
    return handler(url, init);
  });
}

test("owner reports use the configured channel, Pacific days and provider-computed totals", async () => {
  const calls: URL[] = [];
  provider((url, init) => {
    expect(url.hostname).toBe("youtubeanalytics.googleapis.com");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${token}`);
    expect(url.searchParams.get("ids")).toBe(`channel==${channelId}`);
    expect(url.searchParams.get("metrics")).toBe(names.join(","));
    calls.push(url);
    return response(url.searchParams.has("dimensions") ? report(true, [["2026-03-04", 5, 1, 2, 3, 4, 5], ["2026-03-05", 0, 0, 0, 0, 0, 0]]) : report(false, [[0, 10, 20, 30, 40, 50]]));
  });
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(calls).toHaveLength(5);
  expect(calls[0].searchParams.get("endDate")).toBe("2026-03-07");
  expect(calls[0].searchParams.get("startDate")).toBe("2025-03-08");
  expect(calls[1].searchParams.get("startDate")).toBe("2026-02-27");
  expect(calls[1].searchParams.get("endDate")).toBe("2026-03-05");
  expect(calls[4].searchParams.get("startDate")).toBe("2025-03-06");
  expect(snapshot.ownerInsights?.youtube).toMatchObject({ status: "ready", availablePeriods: [7, 30, 90, 365], timeZone: "America/Los_Angeles" });
  expect(snapshot.ownerReadings?.filter(row => row.periodDays === 1)).toHaveLength(2);
  expect(snapshot.ownerReadings?.find(row => row.periodDays === 7)).toMatchObject({ periodStart: "2026-02-27", periodEnd: "2026-03-05", metrics: { views: 0, followers_gained: 40 }, nativeMetrics: { followers_gained: "subscribersGained" } });
  expect(snapshot.ownerReadings?.some(row => "reach" in row.metrics || "impressions" in row.metrics || "profile_views" in row.metrics)).toBe(false);
});

test("an API-key connection does not claim owner authorization or make a private request", async () => {
  const fetch = vi.fn(async () => channel());
  vi.stubGlobal("fetch", fetch);
  const snapshot = await fetchSocialSnapshot("youtube", { channelId, apiKey: "key" }, now);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(snapshot.ownerInsights?.youtube.status).toBe("auth_required");
  expect(snapshot.ownerReadings).toEqual([]);
  expect(snapshot.metrics.find(row => row.metricType === "followers")?.value).toBe(0);
});

test("empty owner reports remain no-data and never become zero snapshots", async () => {
  let requests = 0;
  provider(() => { requests++; return response(report(true, [])); });
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(requests).toBe(1);
  expect(snapshot.ownerInsights?.youtube.status).toBe("no_data");
  expect(snapshot.ownerReadings).toEqual([]);
});

test.each([null, [], {}, true, -1, 1.5, "0x10", "1e3", "NaN", Number.MAX_SAFE_INTEGER + 1])("invalid owner counts stay unavailable: %j", async value => {
  provider(() => response(report(true, [["2026-03-05", value, 0, 0, 0, 0, 0]])));
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(snapshot.ownerInsights?.youtube.status).toBe("error");
  expect(snapshot.ownerReadings).toEqual([]);
  expect(snapshot.partial).toBe(true);
});

test("a failed range preserves other real ranges without summing daily observations", async () => {
  provider(url => {
    if (url.searchParams.has("dimensions")) return response(report(true, [["2026-03-05", 1, 0, 0, 0, 0, 0]]));
    if (url.searchParams.get("startDate") === "2026-02-04") return response({ columnHeaders: [], rows: [[999]] });
    return response(report(false, [[99, 0, 0, 0, 0, 0]]));
  });
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(snapshot.ownerInsights?.youtube.availablePeriods).toEqual([7, 90, 365]);
  expect(snapshot.ownerInsights?.youtube.periodErrors?.[30].status).toBe("error");
  expect(snapshot.ownerReadings?.find(row => row.periodDays === 7)?.metrics.views).toBe(99);
  expect(snapshot.partial).toBe(true);
});

test("a range rate limit stops subsequent reports and preserves Retry-After", async () => {
  let calls = 0;
  provider(url => {
    calls++;
    return url.searchParams.has("dimensions") ? response(report(true, [["2026-03-05", 1, 0, 0, 0, 0, 0]])) : response({ error: { message: "Slow down" } }, 429, { "Retry-After": "120" });
  });
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(calls).toBe(2);
  expect(snapshot.ownerInsights?.youtube).toMatchObject({ retryAfterAt: "2026-03-09T06:32:00.000Z", availablePeriods: [], periodErrors: { 7: { status: "rate_limited" }, 365: { status: "rate_limited" } } });
});

test.each([[401, "reconnect"], [403, "permission_required"]])("owner HTTP %s does not discard public statistics", async (status, expected) => {
  provider(() => response({ error: { message: `Denied ${token}` } }, status as number));
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(snapshot.ownerInsights?.youtube.status).toBe(expected);
  expect(snapshot.ownerInsights?.youtube.error).not.toContain(token);
  expect(snapshot.metrics.find(row => row.metricType === "views")?.value).toBe(900);
});

test("Google quotaExceeded 403 is a rate failure rather than a scope failure", async () => {
  provider(() => response({ error: { message: "Quota exhausted", errors: [{ reason: "quotaExceeded" }] } }, 403));
  const snapshot = await fetchSocialSnapshot("youtube", creds, now);
  expect(snapshot.ownerInsights?.youtube.status).toBe("rate_limited");
});

test("complete offline credentials refresh through the OAuth form endpoint", async () => {
  let refreshes = 0;
  provider((url, init) => {
    if (url.hostname === "oauth2.googleapis.com") {
      refreshes++;
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("Content-Type")).toBe("application/x-www-form-urlencoded");
      expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({ grant_type: "refresh_token", client_id: "client", client_secret: "client-secret", refresh_token: "refresh-secret" });
      return response({ access_token: "new-owner-secret", token_type: "Bearer", expires_in: 3600 });
    }
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer new-owner-secret");
    return response(report(true, []));
  });
  const snapshot = await fetchSocialSnapshot("youtube", { ...creds, clientId: "client", clientSecret: "client-secret", refreshToken: "refresh-secret" }, now);
  expect(refreshes).toBe(1);
  expect(snapshot.refreshedCredentials).toEqual({ ownerAccessToken: "new-owner-secret" });
});

test("OAuth errors retain the code/description and redact long secrets before truncation", async () => {
  const refreshToken = "refresh-secret-" + "x".repeat(500);
  provider(() => response({ error: "invalid_grant", error_description: `Expired ${refreshToken}` }, 400));
  const snapshot = await fetchSocialSnapshot("youtube", { ...creds, clientId: "client", clientSecret: "secret", refreshToken }, now);
  expect(snapshot.ownerInsights?.youtube.status).toBe("reconnect");
  expect(snapshot.ownerInsights?.youtube.error).toContain("invalid_grant: Expired");
  expect(snapshot.ownerInsights?.youtube.error).not.toContain(refreshToken.slice(0, 40));
  expect(snapshot.ownerInsights?.youtube.error).toContain("[redacted]");
});
