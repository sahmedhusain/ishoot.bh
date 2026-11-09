import {
  serverTemplates,
  serverMessages,
  formatMessage,
} from "@platform/locales";
import {
  integrationProvider,
  type IntegrationProviderId,
  type SocialPlatformId,
  type SocialOwnerMetricId,
} from "../config/constants/integrations";

import { checkSignInCredentials } from "./oauth-signin";
import { isPaymentGateway } from "../config/constants/payments";
import { GatewayError, paymentGateway } from "./gateways";
import {
  CourierError,
  courierAdapter,
  isApiCourier,
} from "./courier-adapters";

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
  ownerInsights?: Partial<Record<SocialPlatformId, OwnerInsightState>>;
  ownerReadings?: OwnerInsightReading[];

  refreshedCredentials?: Credentials;
}

export type OwnerInsightStatus =
  | "auth_required"
  | "ready"
  | "no_data"
  | "permission_required"
  | "reconnect"
  | "rate_limited"
  | "error";
interface OwnerInsightState {
  status: OwnerInsightStatus;
  timeZone: string;
  availablePeriods: number[];
  error?: string;
  retryAfterAt?: string;
  periodErrors?: Record<string, { status: OwnerInsightStatus; error?: string }>;
}
interface OwnerInsightReading {
  platform: SocialPlatformId;
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  timeZone: string;
  metrics: Partial<Record<SocialOwnerMetricId, number>>;
  nativeMetrics: Partial<Record<SocialOwnerMetricId, string>>;
}

const GRAPH = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 15_000;

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

function secretCredentials(
  provider: IntegrationProviderId,
  credentials: Credentials,
): Credentials {
  return Object.fromEntries(
    (integrationProvider(provider)?.fields ?? [])
      .filter((field) => field.secret)
      .map((field) => [field.key, credentials[field.key] ?? ""]),
  );
}

function safeProviderMessage(
  message: string,
  credentials: Credentials,
): string {
  for (const field of Object.values(credentials)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)) {
    message = message.split(field).join("[redacted]");
    message = message.split(encodeURIComponent(field)).join("[redacted]");
  }
  return message.slice(0, 300);
}

const n = (value: unknown) => {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !/^\d+$/.test(value.trim()))
  )
    return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

async function request<T>(
  url: string,
  init: RequestInit & { token?: string; secrets?: Credentials } = {},
): Promise<T> {
  const { token, secrets, ...options } = init;
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new ProviderError(
      error instanceof Error && error.name === "TimeoutError"
        ? serverMessages.providerTimeout
        : serverMessages.providerUnreachable,
    );
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = (
      body as {
        error?: { code?: number; errors?: Array<{ reason?: string }> };
      } | null
    )?.error;
    const quotaExceeded =
      response.status === 403 &&
      Array.isArray(error?.errors) &&
      error.errors.some((detail) => detail?.reason === "quotaExceeded");
    const status =
      error?.code === 190 ? 401 : quotaExceeded ? 429 : response.status;
    const retry = response.headers.get("retry-after");
    const delay = retry
      ? /^\d+$/.test(retry)
        ? Number(retry)
        : (Date.parse(retry) - Date.now()) / 1000
      : NaN;
    const retryAfter = Number.isFinite(delay)
      ? Math.min(86400, Math.max(0, Math.ceil(delay)))
      : undefined;
    const message =
      providerMessage(body) ?? `Provider returned HTTP ${response.status}`;
    throw new ProviderError(
      safeProviderMessage(message, {
        ...secrets,
        token: token ?? "",
        apiKey: headers.get("X-Goog-Api-Key") ?? "",
      }),
      status,
      retryAfter,
    );
  }
  return body as T;
}

function providerMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const error = b.error as Record<string, unknown> | string | undefined;
  if (typeof error === "string")
    return `${error}${typeof b.error_description === "string" ? `: ${b.error_description}` : ""}`;
  if (error && typeof error.message === "string") return error.message;
  if (typeof b.message === "string") return b.message;
  if (typeof b.detail === "string") return b.detail;
  if (
    Array.isArray(b.errors) &&
    b.errors[0] &&
    typeof b.errors[0].message === "string"
  )
    return String(b.errors[0].message);
  return null;
}

function need(credentials: Credentials, ...keys: string[]) {
  for (const key of keys)
    if (!credentials[key]?.trim())
      throw new ProviderError(
        formatMessage(serverTemplates.providerMissingField, { field: key }),
      );
}

interface GraphList<T> {
  data?: T[];
  paging?: { next?: string; cursors?: { after?: string } };
}

async function graphList<T>(
  url: string,
  token: string,
): Promise<GraphList<T> & { partial: boolean }> {
  const data: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const target = new URL(url);
    if (cursor) target.searchParams.set("after", cursor);
    const result = await request<GraphList<T>>(target.toString(), { token });
    if (!Array.isArray(result?.data))
      throw new ProviderError(serverMessages.providerInvalidResponse);
    data.push(...result.data);
    const next = result.paging?.next ? result.paging.cursors?.after : undefined;
    if (!next || next === cursor)
      return { data, partial: !!result.paging?.next };
    cursor = next;
  }
  return { data, partial: true };
}

async function metaSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "pageId", "accessToken");
  const page = await request<{
    name?: string;
    followers_count?: number;
    fan_count?: number;
  }>(`${GRAPH}/${encodeURIComponent(c.pageId)}?fields=name,followers_count`, {
    token: c.accessToken,
  });
  const fbPosts = await graphList<{
    id: string;
    message?: string;
    created_time: string;
    permalink_url?: string;
    full_picture?: string;
    shares?: { count?: number };
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
  }>(
    `${GRAPH}/${encodeURIComponent(c.pageId)}/posts?fields=id,message,created_time,permalink_url,full_picture,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)&limit=25`,
    c.accessToken,
  );
  const snapshot: SocialSnapshot = {
    accountName: page.name,
    accounts: { facebook: c.pageId },
    partial: fbPosts.partial,
    metrics: [
      {
        platform: "facebook",
        metricType: "followers",
        value: n(page.followers_count),
      },
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
    const account = await request<{
      username?: string;
      followers_count?: number;
      media_count?: number;
    }>(
      `${GRAPH}/${encodeURIComponent(c.instagramAccountId)}?fields=username,followers_count,media_count`,
      { token: c.accessToken },
    );
    const media = await graphList<{
      id: string;
      caption?: string;
      media_type?: string;
      permalink?: string;
      thumbnail_url?: string;
      media_url?: string;
      timestamp: string;
      like_count?: number;
      comments_count?: number;
    }>(
      `${GRAPH}/${encodeURIComponent(c.instagramAccountId)}/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=25`,
      c.accessToken,
    );
    snapshot.partial ||= media.partial;
    snapshot.accounts.instagram = c.instagramAccountId;
    snapshot.metrics.push(
      {
        platform: "instagram",
        metricType: "followers",
        value: n(account.followers_count),
      },
      {
        platform: "instagram",
        metricType: "posts",
        value: n(account.media_count),
      },
    );
    snapshot.posts.push(
      ...(media.data ?? []).map((item): FetchedPost => ({
        platform: "instagram",
        externalId: item.id,
        caption: item.caption ?? null,
        mediaType: (item.media_type ?? "image")
          .toLowerCase()
          .replace("carousel_album", "carousel"),
        permalink: item.permalink ?? null,
        thumbnailUrl:
          item.thumbnail_url ??
          (item.media_type === "VIDEO" ? null : (item.media_url ?? null)),
        publishedAt: new Date(item.timestamp),
        likes: n(item.like_count),
        comments: n(item.comments_count),
      })),
    );
  }
  return snapshot;
}

async function youtubeSnapshot(
  c: Credentials,
  now = new Date(),
): Promise<SocialSnapshot> {
  need(c, "channelId", "apiKey");
  const channels = await request<{
    items?: Array<{
      snippet?: { title?: string };
      statistics?: {
        subscriberCount?: string;
        hiddenSubscriberCount?: boolean;
        viewCount?: string;
        videoCount?: string;
      };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  }>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(c.channelId)}`,
    { headers: { "X-Goog-Api-Key": c.apiKey } },
  );
  const channel = channels.items?.[0];
  if (!channel) throw new ProviderError(serverMessages.providerChannelNotFound);
  const snapshot: SocialSnapshot = {
    accountName: channel.snippet?.title,
    accounts: { youtube: c.channelId },
    metrics: [
      {
        platform: "youtube",
        metricType: "followers",
        value: channel.statistics?.hiddenSubscriberCount
          ? null
          : n(channel.statistics?.subscriberCount),
      },
      {
        platform: "youtube",
        metricType: "views",
        value: n(channel.statistics?.viewCount),
      },
      {
        platform: "youtube",
        metricType: "posts",
        value: n(channel.statistics?.videoCount),
      },
    ],
    posts: [],
  };
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const items = await request<{
        nextPageToken?: string;
        items?: Array<{ contentDetails?: { videoId?: string } }>;
      }>(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${encodeURIComponent(uploads)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
        { headers: { "X-Goog-Api-Key": c.apiKey } },
      );
      if (!Array.isArray(items?.items))
        throw new ProviderError(serverMessages.providerInvalidResponse);
      const ids = items.items
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => !!id);
      if (ids.length) {
        const videos = await request<{
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              publishedAt?: string;
              thumbnails?: { medium?: { url?: string } };
            };
            statistics?: Record<string, string>;
          }>;
        }>(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.map(encodeURIComponent).join(",")}`,
          { headers: { "X-Goog-Api-Key": c.apiKey } },
        );
        if (!Array.isArray(videos?.items))
          throw new ProviderError(serverMessages.providerInvalidResponse);
        snapshot.posts.push(
          ...videos.items.map((video): FetchedPost => ({
            platform: "youtube",
            externalId: video.id,
            caption: video.snippet?.title ?? null,
            mediaType: "video",
            permalink: `https://www.youtube.com/watch?v=${video.id}`,
            thumbnailUrl: video.snippet?.thumbnails?.medium?.url ?? null,
            publishedAt: new Date(video.snippet?.publishedAt ?? ""),
            likes: n(video.statistics?.likeCount),
            comments: n(video.statistics?.commentCount),
            views: n(video.statistics?.viewCount),
          })),
        );
      }
      pageToken = items.nextPageToken;
      if (!pageToken) break;
      if (page === 9) snapshot.partial = true;
    }
  }
  await youtubeOwnerInsights(c, snapshot, now);
  return snapshot;
}

const YOUTUBE_OWNER_METRICS = {
  views: "views",
  likes: "likes",
  comments: "comments",
  shares: "shares",
  followers_gained: "subscribersGained",
  followers_lost: "subscribersLost",
} as const;
const OWNER_PERIODS = [7, 30, 90, 365];
const YOUTUBE_TIME_ZONE = "America/Los_Angeles";
const offsetDay = (day: string, offset: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);

function youtubeReport(
  body: unknown,
  daily: boolean,
  start: string,
  end: string,
) {
  const report = body as {
    columnHeaders?: Array<{ name?: string }>;
    rows?: unknown[][];
  } | null;
  const names = report?.columnHeaders?.map((column) => column.name);
  const expected = [
    ...(daily ? ["day"] : []),
    ...Object.values(YOUTUBE_OWNER_METRICS),
  ];
  if (
    !Array.isArray(names) ||
    names.length !== expected.length ||
    new Set(names).size !== names.length ||
    expected.some((name) => !names.includes(name)) ||
    (report?.rows != null && !Array.isArray(report.rows))
  )
    throw new ProviderError(serverMessages.providerInvalidResponse);
  const days = new Set<string>();
  const rows = report?.rows ?? [];
  if (rows.length > (daily ? 366 : 1))
    throw new ProviderError(serverMessages.providerInvalidResponse);
  return rows.map((row) => {
    if (!Array.isArray(row) || row.length !== names.length)
      throw new ProviderError(serverMessages.providerInvalidResponse);
    const day = daily ? row[names.indexOf("day")] : end;
    if (
      typeof day !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day ||
      day < start ||
      day > end ||
      days.has(day)
    )
      throw new ProviderError(serverMessages.providerInvalidResponse);
    days.add(day);
    const metrics: Partial<Record<SocialOwnerMetricId, number>> = {};
    for (const [key, native] of Object.entries(YOUTUBE_OWNER_METRICS)) {
      const value = n(row[names.indexOf(native)]);
      if (value == null)
        throw new ProviderError(serverMessages.providerInvalidResponse);
      metrics[key as SocialOwnerMetricId] = value;
    }
    return { day, metrics };
  });
}

async function youtubeOwnerInsights(
  c: Credentials,
  snapshot: SocialSnapshot,
  now: Date,
) {
  const state: OwnerInsightState = {
    status: "auth_required",
    timeZone: YOUTUBE_TIME_ZONE,
    availablePeriods: [],
  };
  snapshot.ownerInsights = { youtube: state };
  snapshot.ownerReadings = [];
  const refreshBundle = [c.clientId, c.clientSecret, c.refreshToken];
  if (!c.ownerAccessToken && !refreshBundle.some(Boolean)) return;
  const failure = (
    error: unknown,
  ): { status: OwnerInsightStatus; error: string } => {
    const status = error instanceof ProviderError ? error.status : undefined;
    return {
      status:
        status === 401
          ? "reconnect"
          : status === 403
            ? "permission_required"
            : status === 429
              ? "rate_limited"
              : "error",
      error:
        error instanceof ProviderError
          ? safeProviderMessage(error.message, secretCredentials("youtube", c))
          : serverMessages.providerInvalidResponse,
    };
  };
  try {
    let accessToken = c.ownerAccessToken;
    if (refreshBundle.some(Boolean)) {
      if (!refreshBundle.every(Boolean))
        throw new ProviderError(serverMessages.ownerRefreshCredentialsRequired);
      const token = await request<{
        access_token?: string;
        token_type?: string;
      }>("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        secrets: secretCredentials("youtube", c),
        body: new URLSearchParams({
          client_id: c.clientId,
          client_secret: c.clientSecret,
          refresh_token: c.refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      }).catch((error) => {
        throw error instanceof ProviderError && error.status === 400
          ? new ProviderError(error.message, 401, error.retryAfter)
          : error;
      });
      if (
        typeof token?.access_token !== "string" ||
        !/^[\x21-\x7E]{1,4096}$/.test(token.access_token) ||
        token.token_type?.toLowerCase() !== "bearer"
      )
        throw new ProviderError(serverMessages.providerInvalidResponse);
      accessToken = token.access_token;
      snapshot.refreshedCredentials = { ownerAccessToken: accessToken };
    }
    if (!accessToken)
      throw new ProviderError(
        serverMessages.ownerRefreshCredentialsRequired,
        401,
      );
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: YOUTUBE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)!.value;
    const end = offsetDay(
      `${part("year")}-${part("month")}-${part("day")}`,
      -1,
    );
    const start = offsetDay(end, -364);
    const fetchReport = async (from: string, to: string, daily = false) => {
      const query = new URLSearchParams({
        ids: `channel==${c.channelId}`,
        startDate: from,
        endDate: to,
        metrics: Object.values(YOUTUBE_OWNER_METRICS).join(","),
        ...(daily
          ? { dimensions: "day", sort: "day", maxResults: "400" }
          : { maxResults: "1" }),
      });
      return youtubeReport(
        await request(
          `https://youtubeanalytics.googleapis.com/v2/reports?${query}`,
          { token: accessToken },
        ),
        daily,
        from,
        to,
      );
    };
    const daily = await fetchReport(start, end, true);
    if (!daily.length) {
      state.status = "no_data";
      return;
    }
    const through = daily
      .map((row) => row.day)
      .sort()
      .at(-1)!;
    const reading = (
      periodDays: number,
      periodStart: string,
      periodEnd: string,
      metrics: OwnerInsightReading["metrics"],
    ): OwnerInsightReading => ({
      platform: "youtube",
      periodDays,
      periodStart,
      periodEnd,
      timeZone: YOUTUBE_TIME_ZONE,
      metrics,
      nativeMetrics: YOUTUBE_OWNER_METRICS,
    });
    snapshot.ownerReadings.push(
      ...daily.map((row) => reading(1, row.day, row.day, row.metrics)),
    );
    state.status = "ready";
    state.periodErrors = {};

    for (const period of OWNER_PERIODS) {
      const from = offsetDay(through, 1 - period);
      try {
        const rows = await fetchReport(from, through);
        if (!rows.length) {
          state.periodErrors[period] = { status: "no_data" };
          continue;
        }
        snapshot.ownerReadings.push(
          reading(period, from, through, rows[0].metrics),
        );
        state.availablePeriods.push(period);
      } catch (error) {
        const detail = failure(error);
        state.periodErrors[period] = detail;
        snapshot.partial = true;
        if (detail.status === "rate_limited") {
          state.retryAfterAt = new Date(
            now.getTime() +
              Math.max(
                60,
                error instanceof ProviderError ? (error.retryAfter ?? 60) : 60,
              ) *
                1000,
          ).toISOString();
          for (const remaining of OWNER_PERIODS.slice(
            OWNER_PERIODS.indexOf(period) + 1,
          ))
            state.periodErrors[remaining] = detail;
          break;
        }
        if (
          detail.status === "reconnect" ||
          detail.status === "permission_required"
        ) {
          for (const remaining of OWNER_PERIODS.slice(
            OWNER_PERIODS.indexOf(period) + 1,
          ))
            state.periodErrors[remaining] = detail;
          break;
        }
      }
    }
  } catch (error) {
    Object.assign(state, failure(error));
    snapshot.partial = true;
    if (state.status === "rate_limited")
      state.retryAfterAt = new Date(
        now.getTime() +
          Math.max(
            60,
            error instanceof ProviderError ? (error.retryAfter ?? 60) : 60,
          ) *
            1000,
      ).toISOString();
  }
}

interface TikTokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string };
}

async function tiktok<T>(
  url: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const result = await request<TikTokEnvelope<T>>(url, {
    token,
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (result.error?.code && result.error.code !== "ok")
    throw new ProviderError(
      result.error.message || result.error.code,
      result.error.code === "rate_limit_exceeded"
        ? 429
        : /access_token|scope_not_authorized/.test(result.error.code)
          ? 401
          : undefined,
    );
  if (!result.data)
    throw new ProviderError(serverMessages.providerInvalidResponse);
  return result.data as T;
}

async function tiktokSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "accessToken");
  const info = await tiktok<{
    user?: {
      open_id?: string;
      display_name?: string;
      follower_count?: number;
      video_count?: number;
    };
  }>(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,video_count",
    c.accessToken,
  );
  if (!info.user?.open_id)
    throw new ProviderError(serverMessages.providerAccountNotFound);
  const snapshot: SocialSnapshot = {
    accountName: info.user.display_name,
    accounts: { tiktok: info.user.open_id },
    metrics: [
      {
        platform: "tiktok",
        metricType: "followers",
        value: n(info.user.follower_count),
      },
      {
        platform: "tiktok",
        metricType: "posts",
        value: n(info.user.video_count),
      },
    ],
    posts: [],
  };
  let cursor: number | undefined;
  for (let page = 0; page < 10; page++) {
    const list = await tiktok<{
      cursor?: number;
      has_more?: boolean;
      videos?: Array<{
        id: string;
        title?: string;
        video_description?: string;
        create_time?: number;
        cover_image_url?: string;
        share_url?: string;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
        view_count?: number;
      }>;
    }>(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,like_count,comment_count,share_count,view_count",
      c.accessToken,
      { max_count: 20, ...(cursor == null ? {} : { cursor }) },
    );
    if (!Array.isArray(list?.videos))
      throw new ProviderError(serverMessages.providerInvalidResponse);
    snapshot.posts.push(
      ...list.videos.map((video): FetchedPost => ({
        platform: "tiktok",
        externalId: video.id,
        caption: video.title || video.video_description || null,
        mediaType: "video",
        permalink: video.share_url ?? null,
        thumbnailUrl: video.cover_image_url ?? null,
        publishedAt: new Date(
          video.create_time == null ? NaN : video.create_time * 1000,
        ),
        likes: n(video.like_count),
        comments: n(video.comment_count),
        shares: n(video.share_count),
        views: n(video.view_count),
      })),
    );
    if (!list.has_more) break;
    if (page === 9 || list.cursor == null || list.cursor === cursor) {
      snapshot.partial = true;
      break;
    }
    cursor = list.cursor;
  }
  return snapshot;
}

async function xSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "username", "bearerToken");
  const username = c.username.replace(/^@/, "");
  const user = await request<{
    data?: {
      id: string;
      name?: string;
      public_metrics?: { followers_count?: number; tweet_count?: number };
    };
  }>(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics`,
    { token: c.bearerToken },
  );
  if (!user.data)
    throw new ProviderError(serverMessages.providerAccountNotFound);
  const snapshot: SocialSnapshot = {
    accountName: user.data.name,
    accounts: { x: user.data.id },
    metrics: [
      {
        platform: "x",
        metricType: "followers",
        value: n(user.data.public_metrics?.followers_count),
      },
      {
        platform: "x",
        metricType: "posts",
        value: n(user.data.public_metrics?.tweet_count),
      },
    ],
    posts: [],
  };
  let token: string | undefined;
  for (let page = 0; page < 10; page++) {
    const tweets = await request<{
      meta?: { next_token?: string; result_count?: number };
      data?: Array<{
        id: string;
        text?: string;
        created_at?: string;
        public_metrics?: {
          like_count?: number;
          reply_count?: number;
          retweet_count?: number;
          quote_count?: number;
          impression_count?: number;
          bookmark_count?: number;
        };
      }>;
    }>(
      `https://api.x.com/2/users/${encodeURIComponent(user.data.id)}/tweets?max_results=100&tweet.fields=created_at,public_metrics${token ? `&pagination_token=${encodeURIComponent(token)}` : ""}`,
      { token: c.bearerToken },
    );
    if (!Array.isArray(tweets.data) && tweets.meta?.result_count !== 0)
      throw new ProviderError(serverMessages.providerInvalidResponse);
    snapshot.posts.push(
      ...(tweets.data ?? []).map((tweet): FetchedPost => ({
        platform: "x",
        externalId: tweet.id,
        caption: tweet.text ?? null,
        mediaType: "text",
        permalink: `https://x.com/${username}/status/${tweet.id}`,
        publishedAt: new Date(tweet.created_at ?? ""),
        likes: n(tweet.public_metrics?.like_count),
        comments: n(tweet.public_metrics?.reply_count),
        shares:
          tweet.public_metrics?.retweet_count == null ||
          tweet.public_metrics?.quote_count == null
            ? null
            : n(
                tweet.public_metrics.retweet_count +
                  tweet.public_metrics.quote_count,
              ),
        views: n(tweet.public_metrics?.impression_count),
        saves: n(tweet.public_metrics?.bookmark_count),
      })),
    );
    const next = tweets.meta?.next_token;
    if (!next) break;
    if (page === 9 || next === token) {
      snapshot.partial = true;
      break;
    }
    token = next;
  }
  return snapshot;
}

const linkedinHeaders = {
  "LinkedIn-Version": "202609",
  "X-Restli-Protocol-Version": "2.0.0",
};

async function linkedinSnapshot(c: Credentials): Promise<SocialSnapshot> {
  need(c, "organizationId", "accessToken");
  const id = encodeURIComponent(c.organizationId);
  const org = await request<{ localizedName?: string }>(
    `https://api.linkedin.com/rest/organizations/${id}`,
    { token: c.accessToken, headers: linkedinHeaders },
  );
  const size = await request<{ firstDegreeSize?: number }>(
    `https://api.linkedin.com/rest/networkSizes/urn%3Ali%3Aorganization%3A${id}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
    { token: c.accessToken, headers: linkedinHeaders },
  );
  return {
    accountName: org.localizedName,
    accounts: { linkedin: c.organizationId },
    metrics: [
      {
        platform: "linkedin",
        metricType: "followers",
        value: n(size.firstDegreeSize),
      },
    ],
    posts: [],
  };
}

const SNAPSHOTS: Partial<
  Record<
    IntegrationProviderId,
    (c: Credentials, now: Date) => Promise<SocialSnapshot>
  >
> = {
  meta: metaSnapshot,
  youtube: youtubeSnapshot,
  tiktok: tiktokSnapshot,
  x: xSnapshot,
  linkedin: linkedinSnapshot,
};

export async function fetchSocialSnapshot(
  provider: IntegrationProviderId,
  credentials: Credentials,
  now = new Date(),
): Promise<SocialSnapshot> {
  const fetcher = SNAPSHOTS[provider];
  if (!fetcher)
    throw new ProviderError("This integration has no social data to sync");
  try {
    const snapshot = await fetcher(credentials, now);
    snapshot.metrics = snapshot.metrics.filter(
      (metric) => metric.value != null,
    );
    snapshot.posts = Array.from(
      new Map(
        snapshot.posts
          .filter(
            (post) =>
              !!post.externalId && Number.isFinite(post.publishedAt.getTime()),
          )
          .map((post) => [`${post.platform}:${post.externalId}`, post]),
      ).values(),
    );
    return snapshot;
  } catch (error) {
    if (error instanceof ProviderError)
      throw new ProviderError(
        safeProviderMessage(
          error.message,
          secretCredentials(provider, credentials),
        ),
        error.status,
        error.retryAfter,
      );
    throw new ProviderError(serverMessages.providerInvalidResponse);
  }
}

async function checkWhatsApp(c: Credentials): Promise<ConnectionCheck> {
  need(c, "phoneId", "token");
  const phone = await request<{
    display_phone_number?: string;
    verified_name?: string;
  }>(
    `${GRAPH}/${encodeURIComponent(c.phoneId)}?fields=display_phone_number,verified_name`,
    { token: c.token },
  );
  return {
    ok: true,
    accountName:
      [phone.verified_name, phone.display_phone_number]
        .filter(Boolean)
        .join(" · ") || undefined,
  };
}

async function checkResend(c: Credentials): Promise<ConnectionCheck> {
  need(c, "apiKey", "fromEmail");
  const domains = await request<{
    data?: Array<{ name: string; status: string }>;
  }>("https://api.resend.com/domains", { token: c.apiKey });
  const sender = c.fromEmail.split("@")[1]?.toLowerCase();
  const domain = (domains.data ?? []).find(
    (d) => d.name.toLowerCase() === sender,
  );
  if (!domain)
    return {
      ok: false,
      error: formatMessage(serverTemplates.senderDomainNotAdded, {
        0: sender ?? "",
      }),
    };
  if (domain.status !== "verified")
    return {
      ok: false,
      accountName: domain.name,
      error: formatMessage(serverTemplates.senderDomainStatus, {
        0: domain.name,
        1: domain.status,
      }),
    };
  return { ok: true, accountName: domain.name };
}

async function checkSocialConnection(
  provider: IntegrationProviderId,
  c: Credentials,
): Promise<ConnectionCheck> {
  if (provider === "meta") {
    need(c, "pageId", "accessToken");
    const page = await request<{ name?: string }>(
      `${GRAPH}/${encodeURIComponent(c.pageId)}?fields=name`,
      { token: c.accessToken },
    );
    if (!page?.name)
      throw new ProviderError(serverMessages.providerAccountNotFound);
    return { ok: true, accountName: page.name };
  }
  if (provider === "youtube") {
    need(c, "channelId", "apiKey");
    const result = await request<{
      items?: Array<{ snippet?: { title?: string } }>;
    }>(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(c.channelId)}`,
      { headers: { "X-Goog-Api-Key": c.apiKey } },
    );
    const channel = result?.items?.[0];
    if (!channel)
      throw new ProviderError(serverMessages.providerChannelNotFound);
    return { ok: true, accountName: channel.snippet?.title };
  }
  if (provider === "tiktok") {
    need(c, "accessToken");
    const info = await tiktok<{
      user?: { open_id?: string; display_name?: string };
    }>(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
      c.accessToken,
    );
    if (!info.user?.open_id)
      throw new ProviderError(serverMessages.providerAccountNotFound);
    return { ok: true, accountName: info.user.display_name };
  }
  if (provider === "x") {
    need(c, "username", "bearerToken");
    const result = await request<{ data?: { id: string; name?: string } }>(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(c.username.replace(/^@/, ""))}`,
      { token: c.bearerToken },
    );
    if (!result?.data?.id)
      throw new ProviderError(serverMessages.providerAccountNotFound);
    return { ok: true, accountName: result.data.name };
  }
  if (provider !== "linkedin")
    throw new ProviderError(serverMessages.unknownIntegration);
  need(c, "organizationId", "accessToken");
  const org = await request<{ localizedName?: string }>(
    `https://api.linkedin.com/rest/organizations/${encodeURIComponent(c.organizationId)}`,
    { token: c.accessToken, headers: linkedinHeaders },
  );
  if (!org?.localizedName)
    throw new ProviderError(serverMessages.providerAccountNotFound);
  return { ok: true, accountName: org.localizedName };
}

export async function checkConnection(
  provider: IntegrationProviderId,
  credentials: Credentials,
): Promise<ConnectionCheck> {
  try {
    if (provider === "whatsapp") return await checkWhatsApp(credentials);
    if (provider === "resend") return await checkResend(credentials);
    if (provider === "google_signin" || provider === "apple_signin") {
      const check = checkSignInCredentials(
        provider === "google_signin" ? "google" : "apple",
        credentials,
      );
      if (!check.ok) return check;
      const issuer =
        provider === "google_signin"
          ? "https://accounts.google.com"
          : "https://appleid.apple.com";
      const discovery = await request<{ issuer?: string }>(
        `${issuer}/.well-known/openid-configuration`,
        {},
      );
      if (discovery.issuer !== issuer)
        throw new ProviderError(serverMessages.providerInvalidResponse);
      return { ok: true, validation: "format" };
    }
    if (isPaymentGateway(provider))
      return await paymentGateway(provider).check(credentials);
    if (isApiCourier(provider))
      return await courierAdapter(provider).check(credentials);
    return await checkSocialConnection(provider, credentials);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ProviderError ||
        error instanceof GatewayError ||
        error instanceof CourierError
          ? safeProviderMessage(
              error.message,
              secretCredentials(provider, credentials),
            )
          : serverMessages.providerConnectionFailed,
    };
  }
}
