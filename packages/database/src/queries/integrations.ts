import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";
import { randomUUID } from "node:crypto";

import { db, runAtomicMutation } from "../db";
import type { Prisma } from "@prisma/client";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_ENVIRONMENTS,
  PAYTABS_REGIONS,
  integrationProvider,
  type IntegrationProviderId,
} from "../constants/integrations";
import { checkSignInCredentials } from "../services/oauth-signin";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "../services/integration-credentials";
import {
  checkConnection,
  fetchSocialSnapshot,
  sendWhatsAppText,
  ProviderError,
  type Credentials,
} from "../integrations/providers";

/** What the settings page may see: plain fields in full, secrets only as "set" plus their last characters. */
export interface IntegrationAdminView {
  provider: IntegrationProviderId;
  isActive: boolean;
  healthStatus: string;
  accountName: string | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  values: Record<string, string>;
  secrets: Record<string, { set: boolean; hint: string }>;
  config: Record<string, unknown>;
}

// Older Meta records stored the Instagram account as accountId and the token under token.
const LEGACY_KEYS: Partial<
  Record<IntegrationProviderId, Record<string, string>>
> = {
  meta: { accountId: "instagramAccountId", token: "accessToken" },
};

function readCredentials(
  provider: IntegrationProviderId,
  encrypted: string | null,
): Credentials {
  const stored = (encrypted && decryptIntegrationCredentials(encrypted)) || {};
  const renames = LEGACY_KEYS[provider] ?? {};
  return Object.fromEntries(
    Object.entries(stored).map(([key, value]) => [renames[key] ?? key, value]),
  );
}

const secretHint = (value: string) =>
  value.length > 8 ? `…${value.slice(-4)}` : "";

export async function listIntegrationsForAdmin(): Promise<
  IntegrationAdminView[]
> {
  const records = await db.integrationSetting.findMany();
  return INTEGRATION_PROVIDERS.map((provider) => {
    const record = records.find((r) => r.provider === provider.id);
    const credentials = readCredentials(
      provider.id,
      record?.credentials ?? null,
    );
    const values: Record<string, string> = {};
    const secrets: Record<string, { set: boolean; hint: string }> = {};
    for (const field of provider.fields) {
      const value = credentials[field.key] ?? "";
      if (field.secret)
        secrets[field.key] = { set: !!value, hint: secretHint(value) };
      else values[field.key] = value;
    }
    return {
      provider: provider.id,
      isActive: record?.isActive ?? false,
      healthStatus:
        record?.healthStatus === "healthy" && provider.kind === "sign_in"
          ? "configured"
          : (record?.healthStatus ?? "unknown"),
      accountName: record?.accountName ?? null,
      lastError: record?.lastError
        ? provider.fields
            .filter((field) => field.secret)
            .reduce(
              (message, field) =>
                credentials[field.key]
                  ? message.split(credentials[field.key]).join("[redacted]")
                  : message,
              record.lastError,
            )
        : null,
      lastCheckedAt: record?.lastCheckedAt?.toISOString() ?? null,
      lastSyncedAt: record?.lastSyncedAt?.toISOString() ?? null,
      values,
      secrets,
      config: (record?.config as Record<string, unknown> | null) ?? {},
    };
  });
}

/** Stored credentials for server-side use (sending, syncing). Null when the integration is off. */
export async function getActiveIntegrationCredentials(
  provider: IntegrationProviderId,
): Promise<Credentials | null> {
  const record = await db.integrationSetting.findUnique({
    where: { provider },
  });
  if (!record?.isActive || !record.credentials) return null;
  return readCredentials(provider, record.credentials);
}

export interface SaveIntegrationInput {
  isActive: boolean;
  /** Field values; a blank secret keeps the stored one. */
  values: Record<string, string>;
  config?: Record<string, unknown>;
}

export async function saveIntegrationSettings(
  providerId: string,
  input: SaveIntegrationInput,
  actorId: string,
) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  const existing = await db.integrationSetting.findUnique({
    where: { provider: provider.id },
  });
  const current = readCredentials(provider.id, existing?.credentials ?? null);
  const next: Credentials = {};
  for (const field of provider.fields) {
    const incoming = (input.values[field.key] ?? "").trim();
    if (incoming.length > (field.maxLength ?? 2000))
      throw new Error(serverMessages.aValueIsTooLong);
    const value =
      field.secret && !incoming ? (current[field.key] ?? "") : incoming;
    if (value) next[field.key] = value;
  }
  if (next.environment) {
    next.environment = next.environment.toLowerCase();
    if (
      !(INTEGRATION_ENVIRONMENTS as readonly string[]).includes(
        next.environment,
      )
    )
      throw new Error(serverMessages.integrationEnvironmentInvalid);
  }
  if (provider.id === "paytabs" && next.region) {
    next.region = next.region.toUpperCase();
    if (!Object.keys(PAYTABS_REGIONS).includes(next.region))
      throw new Error(serverMessages.integrationRegionInvalid);
  }
  if (
    provider.id === "checkout_com" &&
    next.apiPrefix &&
    !/^[a-z0-9]+$/.test(next.apiPrefix)
  )
    throw new Error(serverMessages.paymentApiPrefixInvalid);
  if (
    provider.id === "resend" &&
    next.fromEmail &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.fromEmail)
  )
    throw new Error(serverMessages.enterAValidSenderEMail);
  if (input.isActive) {
    const missing = provider.fields.filter(
      (field) => field.required && !next[field.key],
    );
    if (missing.length)
      throw new Error(
        formatMessage(serverTemplates.fillIn0BeforeTurningThisOn, {
          0: missing.map((field) => field.key).join(", "),
        }),
      );
  }
  if (
    input.isActive &&
    provider.id === "youtube" &&
    [next.clientId, next.clientSecret, next.refreshToken].some(Boolean) &&
    ![next.clientId, next.clientSecret, next.refreshToken].every(Boolean)
  )
    throw new Error(serverMessages.ownerRefreshCredentialsRequired);
  if (
    input.isActive &&
    (provider.id === "google_signin" || provider.id === "apple_signin")
  ) {
    const check = checkSignInCredentials(
      provider.id === "google_signin" ? "google" : "apple",
      next,
    );
    if (!check.ok)
      throw new Error(check.error ?? serverMessages.providerConnectionFailed);
  }
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  const data = {
    isActive: input.isActive,
    credentials: Object.keys(next).length
      ? encryptIntegrationCredentials(next)
      : null,
    config: JSON.parse(
      JSON.stringify({
        ...((existing?.config as Record<string, unknown>) ?? {}),
        ...input.config,
        availableMetrics: changed
          ? {}
          : ((existing?.config as Record<string, unknown> | null)
              ?.availableMetrics ?? {}),
        socialAccounts: changed
          ? {}
          : ((existing?.config as Record<string, unknown> | null)
              ?.socialAccounts ?? {}),
        ownerInsights: changed
          ? {}
          : ((existing?.config as Record<string, unknown> | null)
              ?.ownerInsights ?? {}),
        configuredPlatforms: provider.platforms.filter(
          (platform) => platform !== "instagram" || !!next.instagramAccountId,
        ),
        needsReconnect: changed
          ? false
          : ((existing?.config as Record<string, unknown> | null)
              ?.needsReconnect ?? false),
        retryAfterAt: changed
          ? null
          : ((existing?.config as Record<string, unknown> | null)
              ?.retryAfterAt ?? null),
        lastSyncPartial: changed
          ? false
          : ((existing?.config as Record<string, unknown> | null)
              ?.lastSyncPartial ?? false),
      }),
    ) as Prisma.InputJsonObject,
    updatedById: actorId,
    syncLeaseToken: null,
    syncLeaseUntil: null,
    // New credentials have not been proven yet.
    ...(changed
      ? { healthStatus: "unknown", lastError: null, accountName: null }
      : {}),
  };
  await db.integrationSetting.upsert({
    where: { provider: provider.id },
    update: data,
    create: { provider: provider.id, ...data },
  });
}

export async function unlinkIntegrationSettings(
  providerId: string,
  actorId: string,
) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  await db.integrationSetting.upsert({
    where: { provider: provider.id },
    update: {
      isActive: false,
      credentials: null,
      lastSyncedAt: null,
      config: {},
      healthStatus: "unknown",
      lastError: null,
      accountName: null,
      updatedById: actorId,
      syncLeaseToken: null,
      syncLeaseUntil: null,
    },
    create: { provider: provider.id, isActive: false, updatedById: actorId },
  });
}

/** Checks the stored credentials against the provider and records the result. */
export async function testIntegration(providerId: string) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  const record = await db.integrationSetting.findUnique({
    where: { provider: provider.id },
  });
  if (!record?.credentials)
    throw new Error(serverMessages.saveTheCredentialsFirst);
  const result = await checkConnection(
    provider.id,
    readCredentials(provider.id, record.credentials),
  );
  const stored = await db.integrationSetting.updateMany({
    where: {
      provider: provider.id,
      credentials: record.credentials,
      isActive: record.isActive,
    },
    data: {
      healthStatus: result.ok
        ? result.validation === "format"
          ? "configured"
          : "healthy"
        : "error",
      lastError: result.ok ? null : (result.error ?? "Connection check failed"),
      accountName: result.accountName ?? record.accountName,
      lastCheckedAt: new Date(),
    },
  });
  if (!stored.count)
    throw new Error(serverMessages.socialSyncConfigurationChanged);
  return result;
}

/** Pulls follower counts and recent posts for one social integration into SocialMetric/SocialPost. */
export async function syncSocialIntegration(
  providerId: string,
  now = new Date(),
) {
  const provider = integrationProvider(providerId);
  if (!provider || provider.kind !== "social")
    throw new Error(serverMessages.thisIntegrationHasNoSocialDataTo);
  const record = await db.integrationSetting.findUnique({
    where: { provider: provider.id },
  });
  if (!record?.isActive || !record.credentials)
    throw new Error(serverMessages.turnThisIntegrationOnFirst);
  const retryAfterAt = (record.config as Record<string, unknown> | null)
    ?.retryAfterAt;
  if (typeof retryAfterAt === "string" && new Date(retryAfterAt) > now)
    throw new Error(
      formatMessage(serverTemplates.providerSyncWaiting, {
        time: retryAfterAt,
      }),
    );
  const leaseToken = randomUUID();
  const claimed = await db.integrationSetting.updateMany({
    where: {
      provider: provider.id,
      isActive: true,
      credentials: record.credentials,
      OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lte: now } }],
    },
    data: {
      syncLeaseToken: leaseToken,
      syncLeaseUntil: new Date(now.getTime() + 600_000),
    },
  });
  if (!claimed.count)
    throw new ProviderError(serverMessages.socialSyncInProgress, 409);
  try {
    const credentials = readCredentials(provider.id, record.credentials);
    const snapshot = await fetchSocialSnapshot(provider.id, credentials, now);
    const config = (record.config as Record<string, unknown> | null) ?? {};
    await runAtomicMutation(async () => {
      const stored = await db.integrationSetting.updateMany({
        where: {
          provider: provider.id,
          isActive: true,
          credentials: record.credentials,
          syncLeaseToken: leaseToken,
        },
        data: {
          healthStatus: "healthy",
          lastError: null,
          accountName: snapshot.accountName ?? record.accountName,
          lastSyncedAt: now,
          lastCheckedAt: now,
          syncLeaseToken: null,
          syncLeaseUntil: null,
          ...(snapshot.refreshedCredentials
            ? {
                credentials: encryptIntegrationCredentials({
                  ...credentials,
                  ...snapshot.refreshedCredentials,
                }),
              }
            : {}),
          config: JSON.parse(
            JSON.stringify({
              ...config,
              socialAccounts: snapshot.accounts,
              availableMetrics: Object.fromEntries(
                Object.keys(snapshot.accounts).map((platform) => [
                  platform,
                  snapshot.metrics
                    .filter(
                      (metric) =>
                        metric.platform === platform && metric.value != null,
                    )
                    .map((metric) => metric.metricType),
                ]),
              ),
              ownerInsights: snapshot.ownerInsights ?? {},
              needsReconnect: false,
              retryAfterAt:
                Object.values(snapshot.ownerInsights ?? {})
                  .map((owner) => owner?.retryAfterAt)
                  .filter((time): time is string => !!time)
                  .sort()
                  .at(-1) ?? null,
              lastSyncPartial: snapshot.partial ?? false,
            }),
          ) as Prisma.InputJsonObject,
        },
      });
      if (!stored.count)
        throw new ProviderError(
          serverMessages.socialSyncConfigurationChanged,
          409,
        );
      for (const post of snapshot.posts) {
        const sourceAccountId = snapshot.accounts[post.platform];
        if (!sourceAccountId || !Number.isFinite(post.publishedAt.getTime()))
          continue;
        const counts = {
          likes: post.likes ?? null,
          comments: post.comments ?? null,
          shares: post.shares ?? null,
          views: post.views ?? null,
          reach: post.reach ?? null,
          saves: post.saves ?? null,
        };
        const fields = {
          sourceProvider: provider.id,
          sourceAccountId,
          caption: post.caption?.slice(0, 5000) ?? null,
          mediaType: post.mediaType ?? null,
          permalink: post.permalink ?? null,
          thumbnailUrl: post.thumbnailUrl ?? null,
          publishedAt: post.publishedAt,
          fetchedAt: now,
          ...counts,
        };
        const stored = await db.socialPost.upsert({
          where: {
            platform_externalId: {
              platform: post.platform,
              externalId: post.externalId,
            },
          },
          update: fields,
          create: {
            platform: post.platform,
            externalId: post.externalId,
            ...fields,
          },
        });
        await db.socialPostSnapshot.upsert({
          where: { postId_recordedAt: { postId: stored.id, recordedAt: now } },
          update: {},
          create: {
            postId: stored.id,
            sourceAccountId,
            recordedAt: now,
            counters: counts,
          },
        });
      }
      const readings = snapshot.metrics.flatMap((metric) =>
        metric.value == null || !snapshot.accounts[metric.platform]
          ? []
          : [
              {
                platform: metric.platform,
                metricType: metric.metricType,
                value: metric.value,
                recordedAt: now,
                sourceProvider: provider.id,
                sourceAccountId: snapshot.accounts[metric.platform]!,
              },
            ],
      );
      if (readings.length) await db.socialMetric.createMany({ data: readings });
      const insights = (snapshot.ownerReadings ?? []).flatMap((reading) =>
        snapshot.accounts[reading.platform]
          ? [
              {
                ...reading,
                sourceProvider: provider.id,
                sourceAccountId: snapshot.accounts[reading.platform]!,
                recordedAt: now.toISOString(),
              },
            ]
          : [],
      );
      // One bounded write keeps a year of daily observations inside the transaction timeout.
      if (insights.length)
        await db.$executeRaw`
        INSERT INTO "SocialInsightSnapshot" ("id", "platform", "sourceProvider", "sourceAccountId", "periodDays", "periodStart", "periodEnd", "timeZone", "metrics", "nativeMetrics", "recordedAt")
        SELECT gen_random_uuid()::text, x.platform, x."sourceProvider", x."sourceAccountId", x."periodDays", x."periodStart", x."periodEnd", x."timeZone", x.metrics, x."nativeMetrics", x."recordedAt"
        FROM jsonb_to_recordset(${JSON.stringify(insights)}::jsonb) AS x(platform text, "sourceProvider" text, "sourceAccountId" text, "periodDays" integer, "periodStart" date, "periodEnd" date, "timeZone" text, metrics jsonb, "nativeMetrics" jsonb, "recordedAt" timestamp(3))
        ON CONFLICT ("platform", "sourceProvider", "sourceAccountId", "periodDays", "periodStart", "periodEnd") DO UPDATE
        SET "metrics" = EXCLUDED."metrics", "nativeMetrics" = EXCLUDED."nativeMetrics", "timeZone" = EXCLUDED."timeZone", "recordedAt" = EXCLUDED."recordedAt"
      `;
    });
    return { posts: snapshot.posts.length, metrics: snapshot.metrics.length };
  } catch (error) {
    const message =
      error instanceof ProviderError
        ? error.message
        : serverMessages.socialSyncFailed;
    await runAtomicMutation(async () => {
      const failed = await db.integrationSetting.updateMany({
        where: {
          provider: provider.id,
          credentials: record.credentials,
          syncLeaseToken: leaseToken,
        },
        data: {
          healthStatus: "error",
          lastError: message,
          lastCheckedAt: now,
          config: {
            ...((record.config as Record<string, unknown> | null) ?? {}),
            needsReconnect:
              error instanceof ProviderError && error.status === 401,
            retryAfterAt:
              error instanceof ProviderError && error.status === 429
                ? new Date(
                    now.getTime() + Math.max(60, error.retryAfter ?? 60) * 1000,
                  ).toISOString()
                : null,
          } as Prisma.InputJsonObject,
          syncLeaseToken: null,
          syncLeaseUntil: null,
        },
      });
      // Mark the latest numbers as stale so dashboards do not present them as current.
      if (failed.count)
        await db.socialMetric.updateMany({
          where: {
            sourceProvider: provider.id,
            platform: { in: provider.platforms },
          },
          data: { isStale: true },
        });
    });
    throw error instanceof ProviderError ? error : new Error(message);
  }
}

/** Worker entry point: syncs every active social integration not synced in the last `maxAgeHours`. */
export async function syncDueSocialIntegrations(
  maxAgeHours = 6,
  now = new Date(),
) {
  const due = await db.integrationSetting.findMany({
    where: {
      isActive: true,
      provider: {
        in: INTEGRATION_PROVIDERS.filter((p) => p.kind === "social").map(
          (p) => p.id,
        ),
      },
      OR: [
        { lastSyncedAt: null },
        {
          lastSyncedAt: {
            lt: new Date(now.getTime() - maxAgeHours * 3_600_000),
          },
        },
      ],
      AND: [
        {
          OR: [
            { lastCheckedAt: null },
            { lastCheckedAt: { lt: new Date(now.getTime() - 300_000) } },
          ],
        },
      ],
    },
    select: { provider: true, config: true },
  });
  let synced = 0;
  let failed = 0;
  for (const { provider, config } of due) {
    const retryAfterAt = (config as Record<string, unknown> | null)
      ?.retryAfterAt;
    if (typeof retryAfterAt === "string" && new Date(retryAfterAt) > now)
      continue;
    if ((config as Record<string, unknown> | null)?.needsReconnect === true)
      continue;
    try {
      await syncSocialIntegration(provider, now);
      synced++;
    } catch (error) {
      if (!(error instanceof ProviderError && error.status === 409)) failed++;
    }
  }
  return { synced, failed };
}

export async function sendWhatsAppTestMessage(to: string, body: string) {
  const credentials = await getActiveIntegrationCredentials("whatsapp");
  if (!credentials) throw new Error(serverMessages.turnWhatsappOnFirst);
  try {
    return await sendWhatsAppText(credentials, to, body);
  } catch (error) {
    throw new Error(
      error instanceof ProviderError ? error.message : "WhatsApp send failed",
    );
  }
}
