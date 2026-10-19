import { serverMessages } from "@ishoot/locales";
import { db } from "../db";
import {
  INTEGRATION_PROVIDERS,
  SOCIAL_PLAN_STATUSES,
  SOCIAL_PLATFORM_IDS,
  engagementRate,
  type SocialPlanStatus,
  type SocialPlatformId,
} from "../constants/integrations";

export interface SocialAccountSummary {
  platform: SocialPlatformId;
  connected: boolean;
  followers: number | null;
  followersChange: number | null;
  isStale: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface SocialPostView {
  id: string;
  platform: SocialPlatformId;
  caption: string | null;
  mediaType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  interactions: number;
  engagementRate: number | null;
}

export interface SocialAnalytics {
  periodDays: number;
  accounts: SocialAccountSummary[];
  totals: { posts: number; likes: number; comments: number; shares: number; views: number; interactions: number; avgEngagementRate: number | null };
  previousTotals: { posts: number; interactions: number; views: number };
  /** One point per day of the period: interactions on posts published that day. */
  daily: Array<{ date: string; posts: number; interactions: number; views: number }>;
  byPlatform: Array<{ platform: SocialPlatformId; posts: number; interactions: number; views: number }>;
  topPosts: SocialPostView[];
  recentPosts: SocialPostView[];
}

const DAY = 86_400_000;
const interactionsOf = (p: { likes: number; comments: number; shares: number; saves: number }) => p.likes + p.comments + p.shares + p.saves;

function toView(post: {
  id: string; platform: string; caption: string | null; mediaType: string | null; permalink: string | null; thumbnailUrl: string | null;
  publishedAt: Date; likes: number; comments: number; shares: number; views: number; reach: number; saves: number;
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

export async function getSocialAnalytics(options: { days?: number; platform?: string | null; now?: Date } = {}): Promise<SocialAnalytics> {
  const periodDays = [7, 30, 90, 365].includes(options.days ?? 30) ? options.days ?? 30 : 30;
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - periodDays * DAY);
  const previousSince = new Date(since.getTime() - periodDays * DAY);
  const platform = (SOCIAL_PLATFORM_IDS as readonly string[]).includes(options.platform ?? "") ? (options.platform as SocialPlatformId) : null;
  const platformWhere = platform ? { platform } : {};

  const [posts, previous, integrations, followerRows] = await Promise.all([
    db.socialPost.findMany({ where: { ...platformWhere, publishedAt: { gte: since, lte: now } }, orderBy: { publishedAt: "desc" } }),
    db.socialPost.findMany({
      where: { ...platformWhere, publishedAt: { gte: previousSince, lt: since } },
      select: { likes: true, comments: true, shares: true, saves: true, views: true },
    }),
    db.integrationSetting.findMany({ select: { provider: true, isActive: true, lastSyncedAt: true, lastError: true } }),
    db.socialMetric.findMany({
      where: { metricType: "followers", recordedAt: { gte: previousSince } },
      orderBy: { recordedAt: "asc" },
      select: { platform: true, value: true, recordedAt: true, isStale: true },
    }),
  ]);
  // Latest follower count ever recorded, even if older than the window.
  const latestFollowers = await db.$queryRaw<Array<{ platform: string; value: number; isStale: boolean }>>`
    SELECT DISTINCT ON ("platform") "platform", "value", "isStale"
    FROM "SocialMetric" WHERE "metricType" = 'followers'
    ORDER BY "platform", "recordedAt" DESC`;

  const accounts: SocialAccountSummary[] = SOCIAL_PLATFORM_IDS.map((id) => {
    const provider = INTEGRATION_PROVIDERS.find((p) => p.platforms.includes(id));
    const integration = integrations.find((i) => i.provider === provider?.id);
    const latest = latestFollowers.find((row) => row.platform === id);
    const history = followerRows.filter((row) => row.platform === id);
    const baseline = history.find((row) => row.recordedAt >= since) ?? history[0];
    return {
      platform: id,
      connected: !!integration?.isActive,
      followers: latest ? Number(latest.value) : null,
      followersChange: latest && baseline ? Number(latest.value) - baseline.value : null,
      isStale: latest?.isStale ?? false,
      lastSyncedAt: integration?.lastSyncedAt?.toISOString() ?? null,
      lastError: integration?.lastError ?? null,
    };
  });

  const views = posts.map(toView);
  const sum = (key: "likes" | "comments" | "shares" | "views" | "interactions") => views.reduce((total, post) => total + post[key], 0);
  const rates = views.map((post) => post.engagementRate).filter((rate): rate is number => rate != null);

  const daily = Array.from({ length: periodDays }, (_, i) => {
    const day = new Date(since.getTime() + (i + 1) * DAY);
    const key = day.toISOString().slice(0, 10);
    const onDay = views.filter((post) => post.publishedAt.slice(0, 10) === key);
    return {
      date: key,
      posts: onDay.length,
      interactions: onDay.reduce((total, post) => total + post.interactions, 0),
      views: onDay.reduce((total, post) => total + post.views, 0),
    };
  });

  return {
    periodDays,
    accounts,
    totals: {
      posts: views.length,
      likes: sum("likes"),
      comments: sum("comments"),
      shares: sum("shares"),
      views: sum("views"),
      interactions: sum("interactions"),
      avgEngagementRate: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100 : null,
    },
    previousTotals: {
      posts: previous.length,
      interactions: previous.reduce((total, post) => total + interactionsOf(post), 0),
      views: previous.reduce((total, post) => total + post.views, 0),
    },
    daily,
    byPlatform: SOCIAL_PLATFORM_IDS.map((id) => {
      const mine = views.filter((post) => post.platform === id);
      return { platform: id, posts: mine.length, interactions: mine.reduce((t, p) => t + p.interactions, 0), views: mine.reduce((t, p) => t + p.views, 0) };
    }).filter((row) => row.posts > 0),
    topPosts: [...views].sort((a, b) => b.interactions - a.interactions || b.views - a.views).slice(0, 10),
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
  if (!title || title.length > 200) throw new Error(serverMessages.giveThePostATitleUpTo);
  if ((input.caption ?? "").length > 5000) throw new Error(serverMessages.theCaptionIsTooLong);
  const platforms = Array.from(new Set(input.platforms));
  if (!platforms.length || platforms.some((p) => !(SOCIAL_PLATFORM_IDS as readonly string[]).includes(p))) throw new Error(serverMessages.chooseAtLeastOnePlatform);
  if (!(SOCIAL_PLAN_STATUSES as readonly string[]).includes(input.status)) throw new Error(serverMessages.invalidStatus);
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) throw new Error(serverMessages.invalidDate);
  if (input.status === "scheduled" && !scheduledFor) throw new Error(serverMessages.pickADateToScheduleThePost);
  for (const url of [input.mediaUrl, input.publishedUrl]) {
    if (url && !/^(https?:\/\/|\/)/.test(url)) throw new Error(serverMessages.linksMustStartWithHttpsOr);
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

function planView(plan: Awaited<ReturnType<typeof db.socialContentPlan.findFirstOrThrow<{ include: typeof planInclude }>>>): SocialPlanView {
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
    orderBy: [{ scheduledFor: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 300,
  });
  return plans.map(planView);
}

export async function createSocialPlan(input: SocialPlanInput, actorId: string): Promise<SocialPlanView> {
  const data = validatePlan(input);
  return planView(await db.socialContentPlan.create({ data: { ...data, createdById: actorId }, include: planInclude }));
}

export async function updateSocialPlan(id: string, input: SocialPlanInput): Promise<SocialPlanView> {
  const data = validatePlan(input);
  return planView(await db.socialContentPlan.update({ where: { id }, data, include: planInclude }));
}

export async function deleteSocialPlan(id: string) {
  await db.socialContentPlan.delete({ where: { id } });
}
