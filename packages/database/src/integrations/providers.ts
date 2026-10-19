import { serverTemplates, formatMessage } from "@ishoot/locales";
import type { IntegrationProviderId, SocialPlatformId } from "../constants/integrations";

/**
 * Thin clients for each provider's public API. Tokens go in headers only, so URLs and error messages never
 * contain credentials. Every call has a timeout; failures surface the provider's own message.
 */

export type Credentials = Record<string, string>;

export interface ConnectionCheck {
  ok: boolean;
  accountName?: string;
  error?: string;
}

export interface FetchedPost {
  platform: SocialPlatformId;
  externalId: string;
  caption?: string | null;
  mediaType?: string | null;
  permalink?: string | null;
  thumbnailUrl?: string | null;
  publishedAt: Date;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  saves?: number;
}

export interface FetchedMetric {
  platform: SocialPlatformId;
  metricType: "followers" | "posts" | "views";
  value: number;
}

export interface SocialSnapshot {
  accountName?: string;
  metrics: FetchedMetric[];
  posts: FetchedPost[];
}

const GRAPH = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 15_000;

export class ProviderError extends Error {}

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
};

async function request<T>(url: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    throw new ProviderError(error instanceof Error && error.name === "TimeoutError" ? "The provider did not respond in time" : "Could not reach the provider");
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) throw new ProviderError(providerMessage(body) ?? `Provider returned HTTP ${response.status}`);
  return body as T;
}

/** Pulls the human-readable message out of the error shapes these APIs use. */
function providerMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const error = b.error as Record<string, unknown> | string | undefined;
  if (typeof error === "string") return error.slice(0, 300);
  if (error && typeof error.message === "string") return error.message.slice(0, 300);
  if (typeof b.message === "string") return b.message.slice(0, 300);
  if (typeof b.detail === "string") return b.detail.slice(0, 300);
  if (Array.isArray(b.errors) && b.errors[0] && typeof b.errors[0].message === "string") return String(b.errors[0].message).slice(0, 300);
  return null;
}

function need(credentials: Credentials, ...keys: string[]) {
  for (const key of keys) if (!credentials[key]?.trim()) throw new ProviderError(`Missing ${key}`);
}

// ---------- Meta (Facebook Page + Instagram Business) ----------

interface GraphList<T> { data?: T[] }

async function metaSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "pageId", "accessToken");
  const page = await request<{ name?: string; followers_count?: number; fan_count?: number }>(
    `${GRAPH}/${encodeURIComponent(c.pageId)}?fields=name,followers_count,fan_count`,
    { token: c.accessToken },
  );
  const fbPosts = await request<GraphList<{
    id: string; message?: string; created_time: string; permalink_url?: string; full_picture?: string;
    shares?: { count?: number }; reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } };
  }>>(
    `${GRAPH}/${encodeURIComponent(c.pageId)}/posts?fields=id,message,created_time,permalink_url,full_picture,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)&limit=25`,
    { token: c.accessToken },
  );
  const snapshot: SocialSnapshot = {
    accountName: page.name,
    metrics: [
      { platform: "facebook", metricType: "followers", value: n(page.followers_count ?? page.fan_count) },
    ],
    posts: (fbPosts.data ?? []).map((post) => ({
      platform: "facebook",
      externalId: post.id,
      caption: post.message ?? null,
      mediaType: post.full_picture ? "image" : "text",
      permalink: post.permalink_url ?? null,
      thumbnailUrl: post.full_picture ?? null,
      publishedAt: new Date(post.created_time),
      likes: n(post.reactions?.summary?.total_count),
      comments: n(post.comments?.summary?.total_count),
      shares: n(post.shares?.count),
    })),
  };
  if (c.instagramAccountId?.trim()) {
    const account = await request<{ username?: string; followers_count?: number; media_count?: number }>(
      `${GRAPH}/${encodeURIComponent(c.instagramAccountId)}?fields=username,followers_count,media_count`,
      { token: c.accessToken },
    );
    const media = await request<GraphList<{
      id: string; caption?: string; media_type?: string; permalink?: string; thumbnail_url?: string; media_url?: string;
      timestamp: string; like_count?: number; comments_count?: number;
    }>>(
      `${GRAPH}/${encodeURIComponent(c.instagramAccountId)}/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=25`,
      { token: c.accessToken },
    );
    snapshot.metrics.push(
      { platform: "instagram", metricType: "followers", value: n(account.followers_count) },
      { platform: "instagram", metricType: "posts", value: n(account.media_count) },
    );
    snapshot.posts.push(
      ...(media.data ?? []).map((item): FetchedPost => ({
        platform: "instagram",
        externalId: item.id,
        caption: item.caption ?? null,
        mediaType: (item.media_type ?? "image").toLowerCase().replace("carousel_album", "carousel"),
        permalink: item.permalink ?? null,
        thumbnailUrl: item.thumbnail_url ?? (item.media_type === "VIDEO" ? null : item.media_url ?? null),
        publishedAt: new Date(item.timestamp),
        likes: n(item.like_count),
        comments: n(item.comments_count),
      })),
    );
  }
  return snapshot;
}

// ---------- YouTube ----------

async function youtubeSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "channelId", "apiKey");
  const channels = await request<{ items?: Array<{ snippet?: { title?: string }; statistics?: Record<string, string>; contentDetails?: { relatedPlaylists?: { uploads?: string } } }> }>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(c.channelId)}`,
    { headers: { "X-Goog-Api-Key": c.apiKey } },
  );
  const channel = channels.items?.[0];
  if (!channel) throw new ProviderError("Channel not found");
  const snapshot: SocialSnapshot = {
    accountName: channel.snippet?.title,
    metrics: [
      { platform: "youtube", metricType: "followers", value: n(channel.statistics?.subscriberCount) },
      { platform: "youtube", metricType: "views", value: n(channel.statistics?.viewCount) },
      { platform: "youtube", metricType: "posts", value: n(channel.statistics?.videoCount) },
    ],
    posts: [],
  };
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    const items = await request<{ items?: Array<{ contentDetails?: { videoId?: string } }> }>(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=25&playlistId=${encodeURIComponent(uploads)}`,
      { headers: { "X-Goog-Api-Key": c.apiKey } },
    );
    const ids = (items.items ?? []).map((item) => item.contentDetails?.videoId).filter(Boolean) as string[];
    if (ids.length) {
      const videos = await request<{ items?: Array<{ id: string; snippet?: { title?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string } } }; statistics?: Record<string, string> }> }>(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.map(encodeURIComponent).join(",")}`,
        { headers: { "X-Goog-Api-Key": c.apiKey } },
      );
      snapshot.posts = (videos.items ?? []).map((video) => ({
        platform: "youtube",
        externalId: video.id,
        caption: video.snippet?.title ?? null,
        mediaType: "video",
        permalink: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url ?? null,
        publishedAt: new Date(video.snippet?.publishedAt ?? Date.now()),
        likes: n(video.statistics?.likeCount),
        comments: n(video.statistics?.commentCount),
        views: n(video.statistics?.viewCount),
      }));
    }
  }
  return snapshot;
}

// ---------- TikTok ----------

interface TikTokEnvelope<T> { data?: T; error?: { code?: string; message?: string } }

async function tiktok<T>(url: string, token: string, body?: unknown): Promise<T> {
  const result = await request<TikTokEnvelope<T>>(url, { token, method: body ? "POST" : "GET", body: body ? JSON.stringify(body) : undefined });
  if (result.error?.code && result.error.code !== "ok") throw new ProviderError(result.error.message || result.error.code);
  return result.data as T;
}

async function tiktokSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "accessToken");
  const info = await tiktok<{ user?: { display_name?: string; follower_count?: number; video_count?: number } }>(
    "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,video_count",
    c.accessToken,
  );
  const list = await tiktok<{ videos?: Array<{ id: string; title?: string; video_description?: string; create_time?: number; cover_image_url?: string; share_url?: string; like_count?: number; comment_count?: number; share_count?: number; view_count?: number }> }>(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,like_count,comment_count,share_count,view_count",
    c.accessToken,
    { max_count: 20 },
  );
  return {
    accountName: info.user?.display_name,
    metrics: [
      { platform: "tiktok", metricType: "followers", value: n(info.user?.follower_count) },
      { platform: "tiktok", metricType: "posts", value: n(info.user?.video_count) },
    ],
    posts: (list.videos ?? []).map((video) => ({
      platform: "tiktok",
      externalId: video.id,
      caption: video.title || video.video_description || null,
      mediaType: "video",
      permalink: video.share_url ?? null,
      thumbnailUrl: video.cover_image_url ?? null,
      publishedAt: new Date((video.create_time ?? Date.now() / 1000) * 1000),
      likes: n(video.like_count),
      comments: n(video.comment_count),
      shares: n(video.share_count),
      views: n(video.view_count),
    })),
  };
}

// ---------- X ----------

async function xSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "username", "bearerToken");
  const username = c.username.replace(/^@/, "");
  const user = await request<{ data?: { id: string; name?: string; public_metrics?: { followers_count?: number; tweet_count?: number } } }>(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics`,
    { token: c.bearerToken },
  );
  if (!user.data) throw new ProviderError("Account not found");
  const tweets = await request<{ data?: Array<{ id: string; text?: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number; quote_count?: number; impression_count?: number; bookmark_count?: number } }> }>(
    `https://api.x.com/2/users/${encodeURIComponent(user.data.id)}/tweets?max_results=20&tweet.fields=created_at,public_metrics`,
    { token: c.bearerToken },
  );
  return {
    accountName: user.data.name,
    metrics: [
      { platform: "x", metricType: "followers", value: n(user.data.public_metrics?.followers_count) },
      { platform: "x", metricType: "posts", value: n(user.data.public_metrics?.tweet_count) },
    ],
    posts: (tweets.data ?? []).map((tweet) => ({
      platform: "x",
      externalId: tweet.id,
      caption: tweet.text ?? null,
      mediaType: "text",
      permalink: `https://x.com/${username}/status/${tweet.id}`,
      publishedAt: new Date(tweet.created_at ?? Date.now()),
      likes: n(tweet.public_metrics?.like_count),
      comments: n(tweet.public_metrics?.reply_count),
      shares: n((tweet.public_metrics?.retweet_count ?? 0) + (tweet.public_metrics?.quote_count ?? 0)),
      views: n(tweet.public_metrics?.impression_count),
      saves: n(tweet.public_metrics?.bookmark_count),
    })),
  };
}

// ---------- LinkedIn ----------

const linkedinHeaders = { "LinkedIn-Version": "202405", "X-Restli-Protocol-Version": "2.0.0" };

async function linkedinSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "organizationId", "accessToken");
  const id = encodeURIComponent(c.organizationId);
  const org = await request<{ localizedName?: string }>(`https://api.linkedin.com/rest/organizations/${id}`, { token: c.accessToken, headers: linkedinHeaders });
  const size = await request<{ firstDegreeSize?: number }>(
    `https://api.linkedin.com/rest/networkSizes/urn%3Ali%3Aorganization%3A${id}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
    { token: c.accessToken, headers: linkedinHeaders },
  );
  return {
    accountName: org.localizedName,
    metrics: [{ platform: "linkedin", metricType: "followers", value: n(size.firstDegreeSize) }],
    posts: [],
  };
}

const SNAPSHOTS: Partial<Record<IntegrationProviderId, (c: Credentials) => Promise<SocialSnapshot>>> = {
  meta: metaSnapshot,
  youtube: youtubeSnapshot,
  tiktok: tiktokSnapshot,
  x: xSnapshot,
  linkedin: linkedinSnapshot,
};

/** Fetches follower counts and recent posts for a social provider. */
export async function fetchSocialSnapshot(provider: IntegrationProviderId, credentials: Credentials): Promise<SocialSnapshot> {
  const fetcher = SNAPSHOTS[provider];
  if (!fetcher) throw new ProviderError("This integration has no social data to sync");
  return fetcher(credentials);
}

// ---------- WhatsApp & Resend ----------

async function checkWhatsApp(c: Credentials): Promise<ConnectionCheck> {
  need(c, "phoneId", "token");
  const phone = await request<{ display_phone_number?: string; verified_name?: string }>(
    `${GRAPH}/${encodeURIComponent(c.phoneId)}?fields=display_phone_number,verified_name`,
    { token: c.token },
  );
  return { ok: true, accountName: [phone.verified_name, phone.display_phone_number].filter(Boolean).join(" · ") || undefined };
}

async function checkResend(c: Credentials): Promise<ConnectionCheck> {
  need(c, "apiKey", "fromEmail");
  const domains = await request<{ data?: Array<{ name: string; status: string }> }>("https://api.resend.com/domains", { token: c.apiKey });
  const sender = c.fromEmail.split("@")[1]?.toLowerCase();
  const domain = (domains.data ?? []).find((d) => d.name.toLowerCase() === sender);
  if (!domain) return { ok: false, error: formatMessage(serverTemplates.senderDomainNotAdded, { 0: sender ?? "" }) };
  if (domain.status !== "verified") return { ok: false, accountName: domain.name, error: formatMessage(serverTemplates.senderDomainStatus, { 0: domain.name, 1: domain.status }) };
  return { ok: true, accountName: domain.name };
}

/** Confirms the stored credentials work, without changing anything at the provider. */
export async function checkConnection(provider: IntegrationProviderId, credentials: Credentials): Promise<ConnectionCheck> {
  try {
    if (provider === "whatsapp") return await checkWhatsApp(credentials);
    if (provider === "resend") return await checkResend(credentials);
    const snapshot = await fetchSocialSnapshot(provider, credentials);
    return { ok: true, accountName: snapshot.accountName };
  } catch (error) {
    return { ok: false, error: error instanceof ProviderError ? error.message : "Connection check failed" };
  }
}

/** Sends a plain text WhatsApp message. Business-initiated chats outside 24 hours need an approved template. */
export async function sendWhatsAppText(credentials: Credentials, to: string, body: string): Promise<{ messageId: string }> {
  need(credentials, "phoneId", "token");
  const recipient = to.replace(/[^\d]/g, "");
  if (recipient.length < 8) throw new ProviderError("Enter the number with its country code");
  const result = await request<{ messages?: Array<{ id: string }> }>(`${GRAPH}/${encodeURIComponent(credentials.phoneId)}/messages`, {
    method: "POST",
    token: credentials.token,
    body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "text", text: { body: body.slice(0, 4096) } }),
  });
  const messageId = result.messages?.[0]?.id;
  if (!messageId) throw new ProviderError("WhatsApp did not accept the message");
  return { messageId };
}
