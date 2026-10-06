// Integration catalog shared by Settings → Integrations, the sync worker and analytics.
// Runtime-free so client components can import it. Secret fields are never sent to the browser.

export type IntegrationKind = "social" | "messaging" | "email";

export interface IntegrationField {
  key: string;
  secret?: boolean;
  required?: boolean;
  /** Example shown as the input placeholder. */
  placeholder?: string;
}

export interface IntegrationProvider {
  id: IntegrationProviderId;
  kind: IntegrationKind;
  /** Social platforms whose posts and metrics this provider syncs. */
  platforms: SocialPlatformId[];
  fields: IntegrationField[];
  docsUrl: string;
}

export const SOCIAL_PLATFORM_IDS = ["facebook", "instagram", "youtube", "tiktok", "x", "linkedin"] as const;
export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

export const INTEGRATION_PROVIDER_IDS = ["meta", "whatsapp", "youtube", "tiktok", "x", "linkedin", "resend"] as const;
export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export const INTEGRATION_PROVIDERS: readonly IntegrationProvider[] = [
  {
    id: "meta",
    kind: "social",
    platforms: ["facebook", "instagram"],
    fields: [
      { key: "pageId", required: true, placeholder: "104857392846" },
      { key: "instagramAccountId", placeholder: "17841400000000000" },
      { key: "accessToken", secret: true, required: true, placeholder: "EAAG…" },
    ],
    docsUrl: "https://developers.facebook.com/docs/pages-api/getting-started",
  },
  {
    id: "whatsapp",
    kind: "messaging",
    platforms: [],
    fields: [
      { key: "phoneId", required: true, placeholder: "109876543210987" },
      { key: "businessId", placeholder: "102938475610293" },
      { key: "token", secret: true, required: true, placeholder: "EAAG…" },
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
  },
  {
    id: "youtube",
    kind: "social",
    platforms: ["youtube"],
    fields: [
      { key: "channelId", required: true, placeholder: "UC…" },
      { key: "apiKey", secret: true, required: true, placeholder: "AIza…" },
    ],
    docsUrl: "https://developers.google.com/youtube/v3/getting-started",
  },
  {
    id: "tiktok",
    kind: "social",
    platforms: ["tiktok"],
    fields: [{ key: "accessToken", secret: true, required: true, placeholder: "act.…" }],
    docsUrl: "https://developers.tiktok.com/doc/display-api-overview",
  },
  {
    id: "x",
    kind: "social",
    platforms: ["x"],
    fields: [
      { key: "username", required: true, placeholder: "ishootbh" },
      { key: "bearerToken", secret: true, required: true, placeholder: "AAAA…" },
    ],
    docsUrl: "https://developer.x.com/en/docs/x-api/getting-started/about-x-api",
  },
  {
    id: "linkedin",
    kind: "social",
    platforms: ["linkedin"],
    fields: [
      { key: "organizationId", required: true, placeholder: "12345678" },
      { key: "accessToken", secret: true, required: true, placeholder: "AQV…" },
    ],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations",
  },
  {
    id: "resend",
    kind: "email",
    platforms: [],
    fields: [
      { key: "apiKey", secret: true, required: true, placeholder: "re_…" },
      { key: "fromEmail", required: true, placeholder: "billing@ishoot.bh" },
    ],
    docsUrl: "https://resend.com/docs/dashboard/domains/introduction",
  },
];

export const integrationProvider = (id: string) => INTEGRATION_PROVIDERS.find((provider) => provider.id === id);

export const SOCIAL_METRIC_TYPES = ["followers", "posts", "views", "engagement", "reach"] as const;
export type SocialMetricType = (typeof SOCIAL_METRIC_TYPES)[number];

export const SOCIAL_PLAN_STATUSES = ["idea", "draft", "scheduled", "published", "cancelled"] as const;
export type SocialPlanStatus = (typeof SOCIAL_PLAN_STATUSES)[number];

/** Likes + comments + shares + saves, as a share of reach (or views when reach is unknown). */
export function engagementRate(post: { likes: number; comments: number; shares: number; saves: number; reach: number; views: number }): number | null {
  const base = post.reach || post.views;
  if (!base) return null;
  return Math.round(((post.likes + post.comments + post.shares + post.saves) / base) * 10000) / 100;
}
