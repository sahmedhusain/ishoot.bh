import { serverTemplates, serverMessages, formatMessage } from "@platform/locales";
import { integrationProvider, type IntegrationProviderId, type SocialPlatformId } from "../constants/integrations";

/**
 * Thin clients for each provider's public API. Tokens go in headers only, so URLs and error messages never
 * contain credentials. Every call has a timeout; failures surface the provider's own message.
 */

import { checkSignInCredentials } from "../services/oauth-signin";
import { isPaymentGateway } from "../constants/payments";
import { GatewayError, paymentGateway } from "../payments/gateways";
import { CourierError, courierAdapter, isApiCourier } from "../couriers/adapters";

export type Credentials = Record<string, string>;

export interface ConnectionCheck {
  validation?: "format";
  ok: boolean;
  accountName?: string;
  error?: string;
}

interface FetchedPost {
  platform: SocialPlatformId;
  externalId: string;
  caption?: string | null;
  mediaType?: string | null;
  permalink?: string | null;
  thumbnailUrl?: string | null;
  publishedAt: Date;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  views?: number | null;
  reach?: number | null;
  saves?: number | null;
}

interface FetchedMetric {
  platform: SocialPlatformId;
  metricType: "followers" | "posts" | "views";
  value: number | null;
}

export interface SocialSnapshot {
  accountName?: string;
  accounts: Partial<Record<SocialPlatformId, string>>;
  partial?: boolean;
  metrics: FetchedMetric[];
  posts: FetchedPost[];
}

const GRAPH = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 15_000;

export class ProviderError extends Error {
  constructor(message: string, public readonly status?: number, public readonly retryAfter?: number) { super(message); }
}

function secretCredentials(provider: IntegrationProviderId, credentials: Credentials): Credentials {
  return Object.fromEntries((integrationProvider(provider)?.fields ?? []).filter(field => field.secret).map(field => [field.key, credentials[field.key] ?? ""]));
}

function safeProviderMessage(message: string, credentials: Credentials): string {
  for (const field of Object.values(credentials).filter(Boolean).sort((a, b) => b.length - a.length)) {
    message = message.split(field).join("[redacted]");
    message = message.split(encodeURIComponent(field)).join("[redacted]");
  }
  return message.slice(0, 300);
}

const n = (value: unknown) => {
  if (value == null || typeof value === "boolean" || (typeof value === "string" && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

async function request<T>(url: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    throw new ProviderError(error instanceof Error && error.name === "TimeoutError" ? serverMessages.providerTimeout : serverMessages.providerUnreachable);
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = (body as { error?: { code?: number } } | null)?.error;
    const status = error?.code === 190 ? 401 : response.status;
    const retry = response.headers.get("retry-after");
    const delay = retry ? (/^\d+$/.test(retry) ? Number(retry) : (Date.parse(retry) - Date.now()) / 1000) : NaN;
    const retryAfter = Number.isFinite(delay) ? Math.min(86400, Math.max(0, Math.ceil(delay))) : undefined;
    const message = providerMessage(body) ?? `Provider returned HTTP ${response.status}`;
    throw new ProviderError(safeProviderMessage(message, { token: init.token ?? "", apiKey: headers.get("X-Goog-Api-Key") ?? "" }), status, retryAfter);
  }
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
  for (const key of keys) if (!credentials[key]?.trim()) throw new ProviderError(formatMessage(serverTemplates.providerMissingField, { field: key }));
}

// ---------- Meta (Facebook Page + Instagram Business) ----------

interface GraphList<T> { data?: T[]; paging?: { next?: string; cursors?: { after?: string } } }

async function graphList<T>(url: string, token: string): Promise<GraphList<T> & { partial: boolean }> {
  const data: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const target = new URL(url);
    if (cursor) target.searchParams.set("after", cursor);
    const result = await request<GraphList<T>>(target.toString(), { token });
    if (!Array.isArray(result?.data)) throw new ProviderError(serverMessages.providerInvalidResponse);
    data.push(...result.data);
    const next = result.paging?.next ? result.paging.cursors?.after : undefined;
    if (!next || next === cursor) return { data, partial: !!result.paging?.next };
    cursor = next;
  }
  return { data, partial: true };
}

async function metaSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "pageId", "accessToken");
  const page = await request<{ name?: string; followers_count?: number; fan_count?: number }>(
    `${GRAPH}/${encodeURIComponent(c.pageId)}?fields=name,followers_count`,
    { token: c.accessToken },
  );
  const fbPosts = await graphList<{
    id: string; message?: string; created_time: string; permalink_url?: string; full_picture?: string;
    shares?: { count?: number }; reactions?: { summary?: { total_count?: number } }; comments?: { summary?: { total_count?: number } };
  }>(
    `${GRAPH}/${encodeURIComponent(c.pageId)}/posts?fields=id,message,created_time,permalink_url,full_picture,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)&limit=25`,
    c.accessToken,
  );
  const snapshot: SocialSnapshot = {
    accountName: page.name,
    accounts: { facebook: c.pageId },
    partial: fbPosts.partial,
    metrics: [
      { platform: "facebook", metricType: "followers", value: n(page.followers_count) },
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
    const media = await graphList<{
      id: string; caption?: string; media_type?: string; permalink?: string; thumbnail_url?: string; media_url?: string;
      timestamp: string; like_count?: number; comments_count?: number;
    }>(
      `${GRAPH}/${encodeURIComponent(c.instagramAccountId)}/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=25`,
      c.accessToken,
    );
    snapshot.partial ||= media.partial;
    snapshot.accounts.instagram = c.instagramAccountId;
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
  const channels = await request<{ items?: Array<{ snippet?: { title?: string }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string; videoCount?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }> }>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(c.channelId)}`,
    { headers: { "X-Goog-Api-Key": c.apiKey } },
  );
  const channel = channels.items?.[0];
  if (!channel) throw new ProviderError(serverMessages.providerChannelNotFound);
  const snapshot: SocialSnapshot = {
    accountName: channel.snippet?.title,
    accounts: { youtube: c.channelId },
    metrics: [
      { platform: "youtube", metricType: "followers", value: channel.statistics?.hiddenSubscriberCount ? null : n(channel.statistics?.subscriberCount) },
      { platform: "youtube", metricType: "views", value: n(channel.statistics?.viewCount) },
      { platform: "youtube", metricType: "posts", value: n(channel.statistics?.videoCount) },
    ],
    posts: [],
  };
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const items = await request<{ nextPageToken?: string; items?: Array<{ contentDetails?: { videoId?: string } }> }>(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${encodeURIComponent(uploads)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
        { headers: { "X-Goog-Api-Key": c.apiKey } },
      );
      if (!Array.isArray(items?.items)) throw new ProviderError(serverMessages.providerInvalidResponse);
      const ids = items.items.map(item => item.contentDetails?.videoId).filter((id): id is string => !!id);
      if (ids.length) {
        const videos = await request<{ items?: Array<{ id: string; snippet?: { title?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string } } }; statistics?: Record<string, string> }> }>(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.map(encodeURIComponent).join(",")}`,
          { headers: { "X-Goog-Api-Key": c.apiKey } },
        );
        if (!Array.isArray(videos?.items)) throw new ProviderError(serverMessages.providerInvalidResponse);
        snapshot.posts.push(...videos.items.map((video): FetchedPost => ({
          platform: "youtube", externalId: video.id, caption: video.snippet?.title ?? null, mediaType: "video",
          permalink: `https://www.youtube.com/watch?v=${video.id}`, thumbnailUrl: video.snippet?.thumbnails?.medium?.url ?? null,
          publishedAt: new Date(video.snippet?.publishedAt ?? ""), likes: n(video.statistics?.likeCount),
          comments: n(video.statistics?.commentCount), views: n(video.statistics?.viewCount),
        })));
      }
      pageToken = items.nextPageToken;
      if (!pageToken) break;
      if (page === 9) snapshot.partial = true;
    }
  }
  return snapshot;
}

// ---------- TikTok ----------

interface TikTokEnvelope<T> { data?: T; error?: { code?: string; message?: string } }

async function tiktok<T>(url: string, token: string, body?: unknown): Promise<T> {
  const result = await request<TikTokEnvelope<T>>(url, { token, method: body ? "POST" : "GET", body: body ? JSON.stringify(body) : undefined });
  if (result.error?.code && result.error.code !== "ok") throw new ProviderError(result.error.message || result.error.code, result.error.code === "rate_limit_exceeded" ? 429 : /access_token|scope_not_authorized/.test(result.error.code) ? 401 : undefined);
  if (!result.data) throw new ProviderError(serverMessages.providerInvalidResponse);
  return result.data as T;
}

async function tiktokSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "accessToken");
  const info = await tiktok<{ user?: { open_id?: string; display_name?: string; follower_count?: number; video_count?: number } }>(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,video_count",
    c.accessToken,
  );
  if (!info.user?.open_id) throw new ProviderError(serverMessages.providerAccountNotFound);
  const snapshot: SocialSnapshot = {
    accountName: info.user.display_name,
    accounts: { tiktok: info.user.open_id },
    metrics: [
      { platform: "tiktok", metricType: "followers", value: n(info.user.follower_count) },
      { platform: "tiktok", metricType: "posts", value: n(info.user.video_count) },
    ],
    posts: [],
  };
  let cursor: number | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await tiktok<{ cursor?: number; has_more?: boolean; videos?: Array<{ id: string; title?: string; video_description?: string; create_time?: number; cover_image_url?: string; share_url?: string; like_count?: number; comment_count?: number; share_count?: number; view_count?: number }> }>(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,like_count,comment_count,share_count,view_count",
      c.accessToken, { max_count: 20, ...(cursor == null ? {} : { cursor }) },
    );
    if (!Array.isArray(list?.videos)) throw new ProviderError(serverMessages.providerInvalidResponse);
    snapshot.posts.push(...list.videos.map((video): FetchedPost => ({
      platform: "tiktok", externalId: video.id, caption: video.title || video.video_description || null,
      mediaType: "video", permalink: video.share_url ?? null, thumbnailUrl: video.cover_image_url ?? null,
      publishedAt: new Date(video.create_time == null ? NaN : video.create_time * 1000),
      likes: n(video.like_count), comments: n(video.comment_count), shares: n(video.share_count), views: n(video.view_count),
    })));
    if (!list.has_more) break;
    if (page === 9 || list.cursor == null || list.cursor === cursor) { snapshot.partial = true; break; }
    cursor = list.cursor;
  }
  return snapshot;
}

// ---------- X ----------

async function xSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "username", "bearerToken");
  const username = c.username.replace(/^@/, "");
  const user = await request<{ data?: { id: string; name?: string; public_metrics?: { followers_count?: number; tweet_count?: number } } }>(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics`,
    { token: c.bearerToken },
  );
  if (!user.data) throw new ProviderError(serverMessages.providerAccountNotFound);
  const snapshot: SocialSnapshot = {
    accountName: user.data.name,
    accounts: { x: user.data.id },
    metrics: [
      { platform: "x", metricType: "followers", value: n(user.data.public_metrics?.followers_count) },
      { platform: "x", metricType: "posts", value: n(user.data.public_metrics?.tweet_count) },
    ], posts: [],
  };
  let token: string | undefined;
  for (let page = 0; page < 10; page++) {
    const tweets = await request<{ meta?: { next_token?: string; result_count?: number }; data?: Array<{ id: string; text?: string; created_at?: string; public_metrics?: { like_count?: number; reply_count?: number; retweet_count?: number; quote_count?: number; impression_count?: number; bookmark_count?: number } }> }>(
      `https://api.x.com/2/users/${encodeURIComponent(user.data.id)}/tweets?max_results=100&tweet.fields=created_at,public_metrics${token ? `&pagination_token=${encodeURIComponent(token)}` : ""}`,
      { token: c.bearerToken },
    );
    if (!Array.isArray(tweets.data) && tweets.meta?.result_count !== 0) throw new ProviderError(serverMessages.providerInvalidResponse);
    snapshot.posts.push(...(tweets.data ?? []).map((tweet): FetchedPost => ({
      platform: "x", externalId: tweet.id, caption: tweet.text ?? null, mediaType: "text",
      permalink: `https://x.com/${username}/status/${tweet.id}`, publishedAt: new Date(tweet.created_at ?? ""),
      likes: n(tweet.public_metrics?.like_count), comments: n(tweet.public_metrics?.reply_count),
      shares: tweet.public_metrics?.retweet_count == null || tweet.public_metrics?.quote_count == null ? null : n(tweet.public_metrics.retweet_count + tweet.public_metrics.quote_count),
      views: n(tweet.public_metrics?.impression_count), saves: n(tweet.public_metrics?.bookmark_count),
    })));
    const next = tweets.meta?.next_token;
    if (!next) break;
    if (page === 9 || next === token) { snapshot.partial = true; break; }
    token = next;
  }
  return snapshot;
}

// ---------- LinkedIn ----------

const linkedinHeaders = { "LinkedIn-Version": "202609", "X-Restli-Protocol-Version": "2.0.0" };

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
    accounts: { linkedin: c.organizationId },
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
  try {
    const snapshot = await fetcher(credentials);
    snapshot.metrics = snapshot.metrics.filter(metric => metric.value != null);
    snapshot.posts = Array.from(new Map(snapshot.posts.filter(post => !!post.externalId && Number.isFinite(post.publishedAt.getTime())).map(post => [`${post.platform}:${post.externalId}`, post])).values());
    return snapshot;
  } catch (error) {
    if (error instanceof ProviderError) throw new ProviderError(safeProviderMessage(error.message, secretCredentials(provider, credentials)), error.status, error.retryAfter);
    throw new ProviderError(serverMessages.providerInvalidResponse);
  }
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

/** A health check reads one account endpoint; it never crawls posts or sends a message. */
async function checkSocialConnection(provider: IntegrationProviderId, c: Credentials): Promise<ConnectionCheck> {
  if (provider === "meta") {
    need(c, "pageId", "accessToken");
    const page = await request<{ name?: string }>(`${GRAPH}/${encodeURIComponent(c.pageId)}?fields=name`, { token: c.accessToken });
    if (!page?.name) throw new ProviderError(serverMessages.providerAccountNotFound);
    return { ok: true, accountName: page.name };
  }
  if (provider === "youtube") {
    need(c, "channelId", "apiKey");
    const result = await request<{ items?: Array<{ snippet?: { title?: string } }> }>(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(c.channelId)}`, { headers: { "X-Goog-Api-Key": c.apiKey } });
    const channel = result?.items?.[0];
    if (!channel) throw new ProviderError(serverMessages.providerChannelNotFound);
    return { ok: true, accountName: channel.snippet?.title };
  }
  if (provider === "tiktok") {
    need(c, "accessToken");
    const info = await tiktok<{ user?: { open_id?: string; display_name?: string } }>("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", c.accessToken);
    if (!info.user?.open_id) throw new ProviderError(serverMessages.providerAccountNotFound);
    return { ok: true, accountName: info.user.display_name };
  }
  if (provider === "x") {
    need(c, "username", "bearerToken");
    const result = await request<{ data?: { id: string; name?: string } }>(`https://api.x.com/2/users/by/username/${encodeURIComponent(c.username.replace(/^@/, ""))}`, { token: c.bearerToken });
    if (!result?.data?.id) throw new ProviderError(serverMessages.providerAccountNotFound);
    return { ok: true, accountName: result.data.name };
  }
  if (provider !== "linkedin") throw new ProviderError(serverMessages.unknownIntegration);
  need(c, "organizationId", "accessToken");
  const org = await request<{ localizedName?: string }>(`https://api.linkedin.com/rest/organizations/${encodeURIComponent(c.organizationId)}`, { token: c.accessToken, headers: linkedinHeaders });
  if (!org?.localizedName) throw new ProviderError(serverMessages.providerAccountNotFound);
  return { ok: true, accountName: org.localizedName };
}

/** Confirms the stored credentials work, without changing anything at the provider. */
export async function checkConnection(provider: IntegrationProviderId, credentials: Credentials): Promise<ConnectionCheck> {
  try {
    if (provider === "whatsapp") return await checkWhatsApp(credentials);
    if (provider === "resend") return await checkResend(credentials);
    if (provider === "google_signin" || provider === "apple_signin") {
      const check = checkSignInCredentials(provider === "google_signin" ? "google" : "apple", credentials);
      if (!check.ok) return check;
      const issuer = provider === "google_signin" ? "https://accounts.google.com" : "https://appleid.apple.com";
      const discovery = await request<{ issuer?: string }>(`${issuer}/.well-known/openid-configuration`, {});
      if (discovery.issuer !== issuer) throw new ProviderError(serverMessages.providerInvalidResponse);
      return { ok: true, validation: "format" };
    }
    if (isPaymentGateway(provider)) return await paymentGateway(provider).check(credentials);
    if (isApiCourier(provider)) return await courierAdapter(provider).check(credentials);
    return await checkSocialConnection(provider, credentials);
  } catch (error) {
    return { ok: false, error: error instanceof ProviderError || error instanceof GatewayError || error instanceof CourierError ? safeProviderMessage(error.message, secretCredentials(provider, credentials)) : serverMessages.providerConnectionFailed };
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
