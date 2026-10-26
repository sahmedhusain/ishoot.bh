import { afterEach, describe, expect, test, vi } from "vitest";
import { checkConnection, fetchSocialSnapshot, ProviderError } from "../../packages/database/src/integrations/providers";
import { engagementRate, sumSocialCounts } from "../../packages/database/src/constants/integrations";

const token = "test-secret-access-token";
afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), { status, headers });

describe("real-only social adapters", () => {
  test("unavailable readings stay unavailable while measured zero remains zero", () => {
    expect(sumSocialCounts([])).toBeNull();
    expect(sumSocialCounts([4, null])).toBeNull();
    expect(sumSocialCounts([0, 0])).toBe(0);
    expect(engagementRate({ likes: 1, comments: 0, shares: null, saves: 0, reach: 100, views: 500 })).toBeNull();
    expect(engagementRate({ likes: 0, comments: 0, shares: 0, saves: 0, reach: 100, views: 500 })).toBe(0);
  });

  test("YouTube hidden subscribers and omitted counters never become fabricated zeroes", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/channels?")) return response({ items: [{ snippet: { title: "Channel" }, statistics: { hiddenSubscriberCount: true, viewCount: "3000000000", videoCount: "2" }, contentDetails: { relatedPlaylists: { uploads: "playlist" } } }] });
      if (url.includes("/playlistItems?")) return response({ items: [{ contentDetails: { videoId: "one" } }, { contentDetails: { videoId: "missing-date" } }] });
      return response({ items: [{ id: "one", snippet: { publishedAt: "2026-10-01" }, statistics: { likeCount: "0", viewCount: "-3" } }, { id: "missing-date", statistics: { likeCount: "42" } }] });
    }));
    const result = await fetchSocialSnapshot("youtube", { channelId: "channel", apiKey: token });
    expect(result.metrics.find(metric => metric.metricType === "followers")).toBeUndefined();
    expect(result.metrics.find(metric => metric.metricType === "views")?.value).toBe(3_000_000_000);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({ likes: 0, comments: null, views: null });
  });

  test("Meta follows cursors with header auth, never provider-supplied token URLs", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push(url);
      expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${token}`);
      if (!url.includes("/posts?")) return response({ name: "Page", followers_count: 0, fan_count: 12 });
      const second = new URL(url).searchParams.has("after");
      return response({ data: [{ id: second ? "two" : "one", created_time: "2026-10-01", reactions: { summary: { total_count: 0 } } }], ...(!second ? { paging: { next: `https://untrusted.example/?access_token=${token}`, cursors: { after: "cursor" } } } : {}) });
    });
    const result = await fetchSocialSnapshot("meta", { pageId: "page", accessToken: token });
    expect(result.posts).toHaveLength(2);
    expect(result.metrics[0].value).toBe(0);
    expect(result.accounts).toEqual({ facebook: "page" });
    expect(calls.every(url => new URL(url).hostname === "graph.facebook.com" && !url.includes(token))).toBe(true);
  });

  test("rate limits preserve retry metadata and redact credentials in provider errors", async () => {
    vi.stubGlobal("fetch", async () => response({ error: { message: `Rate limited for ${token}` } }, 429, { "Retry-After": "120" }));
    const error = await fetchSocialSnapshot("meta", { pageId: "page", accessToken: token }).catch(error => error);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ status: 429, retryAfter: 120 });
    expect(error.message).toContain("Rate limited");
    expect(error.message).not.toContain(token);
  });

  test("Meta expired-token errors request reconnect instead of returning an empty success", async () => {
    vi.stubGlobal("fetch", async () => response({ error: { code: 190, message: "Session has expired" } }, 400));
    await expect(fetchSocialSnapshot("meta", { pageId: "page", accessToken: token })).rejects.toMatchObject({ status: 401 });
  });

  test("LinkedIn uses a supported version and tests a single lightweight account endpoint", async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Headers(init.headers).get("LinkedIn-Version")).toBe("202609");
      return response({ localizedName: "Organization" });
    });
    vi.stubGlobal("fetch", fetch);
    expect(await checkConnection("linkedin", { organizationId: "org", accessToken: token })).toEqual({ ok: true, accountName: "Organization" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("malformed provider responses fail rather than reporting zero data", async () => {
    vi.stubGlobal("fetch", async () => response({ unexpected: true }));
    await expect(fetchSocialSnapshot("tiktok", { accessToken: token })).rejects.toBeInstanceOf(ProviderError);
  });
});
