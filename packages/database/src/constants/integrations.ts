// Integration catalog shared by Settings → Integrations, the sync worker and analytics.
// Runtime-free so client components can import it. Secret fields are never sent to the browser.

export type IntegrationKind = "social" | "messaging" | "email" | "sign_in" | "payments" | "couriers";

export interface IntegrationField {
  key: string;
  secret?: boolean;
  required?: boolean;
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

export const INTEGRATION_PROVIDER_IDS = ["meta", "whatsapp", "youtube", "tiktok", "x", "linkedin", "resend", "google_signin", "apple_signin", "stripe", "tap", "paypal", "checkout_com", "paytabs", "moyasar", "hyperpay", "aramex", "dhl_express", "smsa"] as const;
export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export const INTEGRATION_PROVIDERS: readonly IntegrationProvider[] = [
  {
    id: "meta",
    kind: "social",
    platforms: ["facebook", "instagram"],
    fields: [
      { key: "pageId", required: true },
      { key: "instagramAccountId" },
      { key: "accessToken", secret: true, required: true },
    ],
    docsUrl: "https://developers.facebook.com/docs/pages-api/getting-started",
  },
  {
    id: "whatsapp",
    kind: "messaging",
    platforms: [],
    fields: [
      { key: "phoneId", required: true },
      { key: "businessId" },
      { key: "token", secret: true, required: true },
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
  },
  {
    id: "youtube",
    kind: "social",
    platforms: ["youtube"],
    fields: [
      { key: "channelId", required: true },
      { key: "apiKey", secret: true, required: true },
    ],
    docsUrl: "https://developers.google.com/youtube/v3/getting-started",
  },
  {
    id: "tiktok",
    kind: "social",
    platforms: ["tiktok"],
    fields: [{ key: "accessToken", secret: true, required: true }],
    docsUrl: "https://developers.tiktok.com/doc/display-api-overview",
  },
  {
    id: "x",
    kind: "social",
    platforms: ["x"],
    fields: [
      { key: "username", required: true },
      { key: "bearerToken", secret: true, required: true },
    ],
    docsUrl: "https://developer.x.com/en/docs/x-api/getting-started/about-x-api",
  },
  {
    id: "linkedin",
    kind: "social",
    platforms: ["linkedin"],
    fields: [
      { key: "organizationId", required: true },
      { key: "accessToken", secret: true, required: true },
    ],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations",
  },
  {
    id: "resend",
    kind: "email",
    platforms: [],
    fields: [
      { key: "apiKey", secret: true, required: true },
      { key: "fromEmail", required: true },
    ],
    docsUrl: "https://resend.com/docs/dashboard/domains/introduction",
  },
  {
    id: "google_signin",
    kind: "sign_in",
    platforms: [],
    fields: [
      { key: "clientId", required: true },
      { key: "clientSecret", secret: true, required: true },
    ],
    docsUrl: "https://developers.google.com/identity/protocols/oauth2/web-server",
  },
  {
    id: "apple_signin",
    kind: "sign_in",
    platforms: [],
    fields: [
      { key: "serviceId", required: true },
      { key: "teamId", required: true },
      { key: "keyId", required: true },
      { key: "privateKey", secret: true, required: true },
    ],
    docsUrl: "https://developer.apple.com/documentation/sign_in_with_apple/configuring_your_environment_for_sign_in_with_apple",
  },
  // Payment gateways: hosted checkout pages or hosted card fields only, so card details never reach this server.
  // Test keys (or environment "test") keep a gateway in its sandbox.
  {
    id: "stripe",
    kind: "payments",
    platforms: [],
    fields: [
      { key: "secretKey", secret: true, required: true },
      { key: "webhookSecret", secret: true, required: true },
    ],
    docsUrl: "https://docs.stripe.com/checkout/quickstart",
  },
  {
    id: "tap",
    kind: "payments",
    platforms: [],
    fields: [{ key: "secretKey", secret: true, required: true }],
    docsUrl: "https://developers.tap.company/docs/charges",
  },
  {
    id: "paypal",
    kind: "payments",
    platforms: [],
    fields: [
      { key: "environment", required: true },
      { key: "clientId", required: true },
      { key: "clientSecret", secret: true, required: true },
      { key: "webhookId", required: true },
    ],
    docsUrl: "https://developer.paypal.com/docs/checkout/standard/integrate/",
  },
  {
    id: "checkout_com",
    kind: "payments",
    platforms: [],
    fields: [
      { key: "environment", required: true },
      { key: "secretKey", secret: true, required: true },
      { key: "processingChannelId", required: true },
      { key: "billingCountry", required: true },
      { key: "webhookSecret", secret: true, required: true },
    ],
    docsUrl: "https://www.checkout.com/docs/payments/accept-payments/accept-a-payment-on-a-hosted-page",
  },
  {
    id: "paytabs",
    kind: "payments",
    platforms: [],
    fields: [
      { key: "region", required: true },
      { key: "profileId", required: true },
      { key: "serverKey", secret: true, required: true },
    ],
    docsUrl: "https://support.paytabs.com/en/support/solutions/articles/60000711358-what-is-paytabs-hosted-payment-page-",
  },
  {
    id: "moyasar",
    kind: "payments",
    platforms: [],
    fields: [
      { key: "secretKey", secret: true, required: true },
      { key: "webhookSecret", secret: true, required: true },
    ],
    docsUrl: "https://docs.moyasar.com/api/invoices/01-create-invoice",
  },
  {
    id: "hyperpay",
    kind: "payments",
    platforms: [],
    fields: [
      { key: "environment", required: true },
      { key: "entityId", required: true },
      { key: "accessToken", secret: true, required: true },
      { key: "brands", required: true },
      { key: "webhookKey", secret: true, required: true },
    ],
    docsUrl: "https://hyperpay.docs.oppwa.com/integrations/widget",
  },
  // Courier agencies with an API: booking returns the tracking number (and a label), and tracking updates come back.
  {
    id: "aramex",
    kind: "couriers",
    platforms: [],
    fields: [
      { key: "environment", required: true },
      { key: "username", required: true },
      { key: "password", secret: true, required: true },
      { key: "accountNumber", required: true },
      { key: "accountPin", secret: true, required: true },
      { key: "accountEntity", required: true },
      { key: "accountCountryCode", required: true },
    ],
    docsUrl: "https://www.aramex.com/us/en/developers-solution-center/aramex-apis",
  },
  {
    id: "dhl_express",
    kind: "couriers",
    platforms: [],
    fields: [
      { key: "environment", required: true },
      { key: "apiKey", required: true },
      { key: "apiSecret", secret: true, required: true },
      { key: "accountNumber", required: true },
    ],
    docsUrl: "https://developer.dhl.com/api-reference/dhl-express-mydhl-api",
  },
  {
    id: "smsa",
    kind: "couriers",
    platforms: [],
    fields: [
      { key: "environment", required: true },
      { key: "apiKey", secret: true, required: true },
    ],
    docsUrl: "https://www.smsaexpress.com/",
  },
];

export const integrationProvider = (id: string) => INTEGRATION_PROVIDERS.find((provider) => provider.id === id);

export const SOCIAL_METRIC_TYPES = ["followers", "posts", "views", "engagement", "reach"] as const;
export type SocialMetricType = (typeof SOCIAL_METRIC_TYPES)[number];

export const SOCIAL_PLAN_STATUSES = ["idea", "draft", "scheduled", "published", "cancelled"] as const;
export type SocialPlanStatus = (typeof SOCIAL_PLAN_STATUSES)[number];

/** Missing readings cannot contribute a fabricated zero to a total. */
export function sumSocialCounts(values: readonly (number | null)[]): number | null {
  if (!values.length || values.some(value => value == null)) return null;
  return values.reduce<number>((sum, value) => sum + value!, 0);
}

/** Exact interactions as a share of a reported denominator; unavailable inputs stay unavailable. */
export function engagementRate(post: { likes: number | null; comments: number | null; shares: number | null; saves: number | null; reach: number | null; views: number | null }): number | null {
  const base = post.reach ?? post.views;
  const interactions = sumSocialCounts([post.likes, post.comments, post.shares, post.saves]);
  if (!base || interactions == null) return null;
  return Math.round((interactions / base) * 10000) / 100;
}
