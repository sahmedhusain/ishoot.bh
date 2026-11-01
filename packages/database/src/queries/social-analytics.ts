import { serverMessages } from "@platform/locales";
import { listIntegrations } from "@platform/api-client";
import { db } from "../db";
import {
  INTEGRATION_PROVIDERS,
  SOCIAL_PLAN_STATUSES,
  SOCIAL_PLATFORM_IDS,
  SOCIAL_OWNER_METRIC_IDS,
  engagementRate,
  sumSocialCounts,
  type SocialPlanStatus,
  type SocialPlatformId,
  type SocialOwnerMetricId,
} from "../constants/integrations";
import type { OwnerInsightStatus } from "../integrations/providers";

export interface SocialAccountSummary {
  platform: SocialPlatformId;
  connected: boolean;
  followers: number | null;
  followersChange: number | null;
  isStale: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  needsReconnect: boolean;
}

export interface SocialPostView {
  id: string;
  platform: SocialPlatformId;
  caption: string | null;
  mediaType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  saves: number | null;
  interactions: number | null;
  engagementRate: number | null;
}

export interface SocialAnalytics {
  periodDays: number;
  partial: boolean;
  accounts: SocialAccountSummary[];
  ownerInsights: Array<{
    platform: SocialPlatformId;
    status: OwnerInsightStatus;
    error: string | null;
    checkedAt: string | null;
    retryAfterAt: string | null;
    snapshot: {
      periodStart: string;
      periodEnd: string;
      timeZone: string;
      recordedAt: string;
      metrics: Partial<Record<SocialOwnerMetricId, number>>;
    } | null;
  }>;
  totals: {
    posts: number;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    views: number | null;
    interactions: number | null;
    avgEngagementRate: number | null;
  };
  previousTotals: {
    posts: number;
    interactions: number | null;
    views: number | null;
  };
  /** One point per day of the period: interactions on posts published that day. */
  daily: Array<{
    date: string;
    posts: number;
    interactions: number | null;
    views: number | null;
  }>;
  byPlatform: Array<{
    platform: SocialPlatformId;
    posts: number;
    interactions: number | null;
    views: number | null;
  }>;
  topPosts: SocialPostView[];
  recentPosts: SocialPostView[];
}

const DAY = 86_400_000;
const interactionsOf = (p: {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}) => sumSocialCounts([p.likes, p.comments, p.shares, p.saves]);

function toView(post: {
  id: string;
  platform: string;
  caption: string | null;
  mediaType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  saves: number | null;
}): SocialPostView {
  return {
    id: post.id,
    platform: post.platform as SocialPlatformId,
    caption: post.caption,
    mediaType: post.mediaType,
    permalink: post.permalink,
    thumbnailUrl: post.thumbnailUrl,
    publishedAt: post.publishedAt.toISOString(),
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    views: post.views,
    saves: post.saves,
    interactions: interactionsOf(post),
    engagementRate: engagementRate(post),
  };
}

export async function getSocialAnalytics(
  options: { days?: number; platform?: string | null; now?: Date } = {},
): Promise<SocialAnalytics> {
  const periodDays = [7, 30, 90, 365].includes(options.days ?? 30)
    ? (options.days ?? 30)
    : 30;
  const now = options.now ?? new Date();
  // UTC calendar days, including today. The UI names the timezone explicitly.
  const until = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const since = new Date(until.getTime() - periodDays * DAY);
  const previousSince = new Date(since.getTime() - periodDays * DAY);
  const platform = (SOCIAL_PLATFORM_IDS as readonly string[]).includes(
    options.platform ?? "",
  )
    ? (options.platform as SocialPlatformId)
    : null;
  const integrations = await listIntegrations();
  const sources = SOCIAL_PLATFORM_IDS.filter(
    (id) => !platform || platform === id,
  ).map((id) => {
    const provider = INTEGRATION_PROVIDERS.find((p) =>
      p.platforms.includes(id),
    )!;
    const integration = integrations.find((i) => i.provider === provider.id);
    const config =
      (integration?.config as Record<string, unknown> | null) ?? {};
    const accountId = (
      config.socialAccounts as Record<string, unknown> | undefined
    )?.[id];
    const configured =
      id !== "instagram" ||
      (Array.isArray(config.configuredPlatforms) &&
        config.configuredPlatforms.includes(id)) ||
      typeof accountId === "string";
    return {
      platform: id,
      provider: provider.id,
      accountId: typeof accountId === "string" ? accountId : null,
      connected: !!integration?.isActive && configured,
      integration,
      config,
    };
  });
  const trusted = sources
    .filter((source) => source.connected && source.accountId)
    .map((source) => ({
      platform: source.platform,
      sourceProvider: source.provider,
      sourceAccountId: source.accountId!,
    }));
  const [posts, previous, readings, ownerInsights] = await Promise.all([
    db.socialPost.findMany({
      where: { OR: trusted, publishedAt: { gte: since, lte: now } },
      orderBy: { publishedAt: "desc" },
    }),
    db.socialPost.findMany({
      where: { OR: trusted, publishedAt: { gte: previousSince, lt: since } },
      select: {
        likes: true,
        comments: true,
        shares: true,
        saves: true,
        views: true,
      },
    }),
    Promise.all(
      sources.map(async (source) => {
        const available = (
          source.config.availableMetrics as Record<string, unknown> | undefined
        )?.[source.platform];
        if (
          !source.connected ||
          !source.accountId ||
          !Array.isArray(available) ||
          !available.includes("followers")
        )
          return { latest: null, baseline: null };
        const where = {
          platform: source.platform,
          sourceProvider: source.provider,
          sourceAccountId: source.accountId,
          metricType: "followers",
        };
        const [latest, baseline] = await Promise.all([
          db.socialMetric.findFirst({
            where: { ...where, recordedAt: { lte: now } },
            orderBy: { recordedAt: "desc" },
          }),
          db.socialMetric.findFirst({
            where: { ...where, recordedAt: { lte: since } },
            orderBy: { recordedAt: "desc" },
          }),
        ]);
        return { latest, baseline };
      }),
    ),
    Promise.all(
      sources
        .filter(
          (source) =>
            source.connected &&
            source.accountId &&
            source.platform === "youtube",
        )
        .map(async (source) => {
          const owners = source.config.ownerInsights as
            Record<string, unknown> | undefined;
          const owner = (owners?.[source.platform] ?? {}) as Record<
            string,
            unknown
          >;
          const validStatuses: OwnerInsightStatus[] = [
            "auth_required",
            "ready",
            "no_data",
            "permission_required",
            "reconnect",
            "rate_limited",
            "error",
          ];
          let status: OwnerInsightStatus = validStatuses.includes(
            owner.status as OwnerInsightStatus,
          )
            ? (owner.status as OwnerInsightStatus)
            : "auth_required";
          let error = typeof owner.error === "string" ? owner.error : null;
          let snapshot = null;
          const available =
            Array.isArray(owner.availablePeriods) &&
            owner.availablePeriods.includes(periodDays);
          if (
            status === "ready" &&
            available &&
            source.integration?.lastSyncedAt
          ) {
            const stored = await db.socialInsightSnapshot.findFirst({
              where: {
                platform: source.platform,
                sourceProvider: source.provider,
                sourceAccountId: source.accountId!,
                periodDays,
                recordedAt: source.integration.lastSyncedAt,
              },
              orderBy: { recordedAt: "desc" },
            });
            if (stored) {
              const values = stored.metrics as Record<string, unknown>;
              const metrics = Object.fromEntries(
                SOCIAL_OWNER_METRIC_IDS.flatMap((key) =>
                  typeof values?.[key] === "number" &&
                  Number.isSafeInteger(values[key]) &&
                  (values[key] as number) >= 0
                    ? [[key, values[key]]]
                    : [],
                ),
              ) as Partial<Record<SocialOwnerMetricId, number>>;
              if (Object.keys(metrics).length)
                snapshot = {
                  periodStart: stored.periodStart.toISOString().slice(0, 10),
                  periodEnd: stored.periodEnd.toISOString().slice(0, 10),
                  timeZone: stored.timeZone,
                  recordedAt: stored.recordedAt.toISOString(),
                  metrics,
                };
            }
            if (!snapshot) status = "no_data";
          } else if (status === "ready") {
            const detail = (
              owner.periodErrors as
                Record<string, { status?: string; error?: string }> | undefined
            )?.[periodDays];
            status = validStatuses.includes(
              detail?.status as OwnerInsightStatus,
            )
              ? (detail!.status as OwnerInsightStatus)
              : "no_data";
            error = typeof detail?.error === "string" ? detail.error : null;
          }
          return {
            platform: source.platform,
            status,
            error,
            checkedAt:
              status === "auth_required"
                ? null
                : (source.integration?.lastSyncedAt ?? null),
            retryAfterAt:
              typeof owner.retryAfterAt === "string" &&
              Number.isFinite(Date.parse(owner.retryAfterAt))
                ? owner.retryAfterAt
                : null,
            snapshot,
          };
        }),
    ),
  ]);
  const accounts: SocialAccountSummary[] = sources.map((source, i) => {
    const { latest, baseline } = readings[i];
    return {
      platform: source.platform,
      connected: source.connected,
      followers: latest?.value ?? null,
      followersChange:
        latest && baseline ? latest.value - baseline.value : null,
      isStale:
        !!latest &&
        (latest.isStale ||
          now.getTime() - latest.recordedAt.getTime() > 6 * 3_600_000),
      lastSyncedAt: source.connected
        ? (source.integration?.lastSyncedAt ?? null)
        : null,
      lastError: source.connected
        ? (source.integration?.lastError ?? null)
        : null,
      needsReconnect: source.connected && source.config.needsReconnect === true,
    };
  });
  const views = posts.map(toView);
  const sum = (
    key: "likes" | "comments" | "shares" | "views" | "interactions",
  ) => sumSocialCounts(views.map((post) => post[key]));
  const rates = views
    .map((post) => post.engagementRate)
    .filter((rate): rate is number => rate != null);
  const daily = Array.from({ length: periodDays }, (_, i) => {
    const key = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    const onDay = views.filter((post) => post.publishedAt.slice(0, 10) === key);
    return {
      date: key,
      posts: onDay.length,
      interactions: sumSocialCounts(onDay.map((post) => post.interactions)),
      views: sumSocialCounts(onDay.map((post) => post.views)),
    };
  });
  return {
    periodDays,
    partial: sources.some(
      (source) => source.connected && source.config.lastSyncPartial === true,
    ),
    accounts,
    ownerInsights,
    totals: {
      posts: views.length,
      likes: sum("likes"),
      comments: sum("comments"),
      shares: sum("shares"),
      views: sum("views"),
      interactions: sum("interactions"),
      avgEngagementRate: rates.length
        ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) /
          100
        : null,
    },
    previousTotals: {
      posts: previous.length,
      interactions: sumSocialCounts(previous.map(interactionsOf)),
      views: sumSocialCounts(previous.map((post) => post.views)),
    },
    daily,
    byPlatform: sources
      .map(({ platform: id }) => {
        const mine = views.filter((post) => post.platform === id);
        return {
          platform: id,
          posts: mine.length,
          interactions: sumSocialCounts(mine.map((post) => post.interactions)),
          views: sumSocialCounts(mine.map((post) => post.views)),
        };
      })
      .filter((row) => row.posts > 0),
    topPosts: [...views]
      .sort(
        (a, b) =>
          (b.interactions ?? -1) - (a.interactions ?? -1) ||
          (b.views ?? -1) - (a.views ?? -1),
      )
      .slice(0, 10),
    recentPosts: views.slice(0, 50),
  };
}

// ---------- Content plan ----------

export interface SocialPlanInput {
  title: string;
  caption?: string | null;
  platforms: string[];
  mediaUrl?: string | null;
  scheduledFor?: string | null;
  status: string;
  publishedUrl?: string | null;
  assigneeId?: string | null;
}

export interface SocialPlanView {
  id: string;
  title: string;
  caption: string | null;
  platforms: SocialPlatformId[];
  mediaUrl: string | null;
  scheduledFor: string | null;
  status: SocialPlanStatus;
  publishedUrl: string | null;
  assignee: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
  updatedAt: string;
}

function validatePlan(input: SocialPlanInput) {
  const title = input.title?.trim();
  if (!title || title.length > 200)
    throw new Error(serverMessages.giveThePostATitleUpTo);
  if ((input.caption ?? "").length > 5000)
    throw new Error(serverMessages.theCaptionIsTooLong);
  const platforms = Array.from(new Set(input.platforms));
  if (
    !platforms.length ||
    platforms.some(
      (p) => !(SOCIAL_PLATFORM_IDS as readonly string[]).includes(p),
    )
  )
    throw new Error(serverMessages.chooseAtLeastOnePlatform);
  if (!(SOCIAL_PLAN_STATUSES as readonly string[]).includes(input.status))
    throw new Error(serverMessages.invalidStatus);
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime()))
    throw new Error(serverMessages.invalidDate);
  if (input.status === "scheduled" && !scheduledFor)
    throw new Error(serverMessages.pickADateToScheduleThePost);
  for (const url of [input.mediaUrl, input.publishedUrl]) {
    if (url && !/^(https?:\/\/|\/)/.test(url))
      throw new Error(serverMessages.linksMustStartWithHttpsOr);
  }
  return {
    title,
    caption: input.caption?.trim() || null,
    platforms,
    mediaUrl: input.mediaUrl?.trim() || null,
    scheduledFor,
    status: input.status,
    publishedUrl: input.publishedUrl?.trim() || null,
    assigneeId: input.assigneeId || null,
  };
}

const planInclude = {
  assignee: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

function planView(
  plan: Awaited<
    ReturnType<
      typeof db.socialContentPlan.findFirstOrThrow<{
        include: typeof planInclude;
      }>
    >
  >,
): SocialPlanView {
  return {
    id: plan.id,
    title: plan.title,
    caption: plan.caption,
    platforms: plan.platforms as SocialPlatformId[],
    mediaUrl: plan.mediaUrl,
    scheduledFor: plan.scheduledFor?.toISOString() ?? null,
    status: plan.status as SocialPlanStatus,
    publishedUrl: plan.publishedUrl,
    assignee: plan.assignee,
    createdBy: plan.createdBy,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function listSocialPlans(): Promise<SocialPlanView[]> {
  const plans = await db.socialContentPlan.findMany({
    include: planInclude,
    orderBy: [
      { scheduledFor: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 300,
  });
  return plans.map(planView);
}

export async function createSocialPlan(
  input: SocialPlanInput,
  actorId: string,
): Promise<SocialPlanView> {
  const data = validatePlan(input);
  return planView(
    await db.socialContentPlan.create({
      data: { ...data, createdById: actorId },
      include: planInclude,
    }),
  );
}

export async function updateSocialPlan(
  id: string,
  input: SocialPlanInput,
): Promise<SocialPlanView> {
  const data = validatePlan(input);
  return planView(
    await db.socialContentPlan.update({
      where: { id },
      data,
      include: planInclude,
    }),
  );
}

export async function deleteSocialPlan(id: string) {
  await db.socialContentPlan.delete({ where: { id } });
}
