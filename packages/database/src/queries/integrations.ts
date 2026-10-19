import { serverTemplates, formatMessage, serverMessages } from "@platform/locales";

import { db } from "../db";
import type { Prisma } from "@prisma/client";
import {
  INTEGRATION_PROVIDERS,
  integrationProvider,
  type IntegrationProviderId,
} from "../constants/integrations";
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from "../services/integration-credentials";
import { checkConnection, fetchSocialSnapshot, sendWhatsAppText, ProviderError, type Credentials } from "../integrations/providers";

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
const LEGACY_KEYS: Partial<Record<IntegrationProviderId, Record<string, string>>> = {
  meta: { accountId: "instagramAccountId", token: "accessToken" },
};

function readCredentials(provider: IntegrationProviderId, encrypted: string | null): Credentials {
  const stored = (encrypted && decryptIntegrationCredentials(encrypted)) || {};
  const renames = LEGACY_KEYS[provider] ?? {};
  return Object.fromEntries(Object.entries(stored).map(([key, value]) => [renames[key] ?? key, value]));
}

const secretHint = (value: string) => (value.length > 8 ? `…${value.slice(-4)}` : "");

export async function listIntegrationsForAdmin(): Promise<IntegrationAdminView[]> {
  const records = await db.integrationSetting.findMany();
  return INTEGRATION_PROVIDERS.map((provider) => {
    const record = records.find((r) => r.provider === provider.id);
    const credentials = readCredentials(provider.id, record?.credentials ?? null);
    const values: Record<string, string> = {};
    const secrets: Record<string, { set: boolean; hint: string }> = {};
    for (const field of provider.fields) {
      const value = credentials[field.key] ?? "";
      if (field.secret) secrets[field.key] = { set: !!value, hint: secretHint(value) };
      else values[field.key] = value;
    }
    return {
      provider: provider.id,
      isActive: record?.isActive ?? false,
      healthStatus: record?.healthStatus ?? "unknown",
      accountName: record?.accountName ?? null,
      lastError: record?.lastError ?? null,
      lastCheckedAt: record?.lastCheckedAt?.toISOString() ?? null,
      lastSyncedAt: record?.lastSyncedAt?.toISOString() ?? null,
      values,
      secrets,
      config: (record?.config as Record<string, unknown> | null) ?? {},
    };
  });
}

/** Stored credentials for server-side use (sending, syncing). Null when the integration is off. */
export async function getActiveIntegrationCredentials(provider: IntegrationProviderId): Promise<Credentials | null> {
  const record = await db.integrationSetting.findUnique({ where: { provider } });
  if (!record?.isActive || !record.credentials) return null;
  return readCredentials(provider, record.credentials);
}

export interface SaveIntegrationInput {
  isActive: boolean;
  /** Field values; a blank secret keeps the stored one. */
  values: Record<string, string>;
  config?: Record<string, unknown>;
}

export async function saveIntegrationSettings(providerId: string, input: SaveIntegrationInput, actorId: string) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  const existing = await db.integrationSetting.findUnique({ where: { provider: provider.id } });
  const current = readCredentials(provider.id, existing?.credentials ?? null);
  const next: Credentials = {};
  for (const field of provider.fields) {
    const incoming = (input.values[field.key] ?? "").trim();
    if (incoming.length > 2000) throw new Error(serverMessages.aValueIsTooLong);
    const value = field.secret && !incoming ? current[field.key] ?? "" : incoming;
    if (value) next[field.key] = value;
  }
  if (provider.id === "resend" && next.fromEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next.fromEmail))
    throw new Error(serverMessages.enterAValidSenderEMail);
  if (input.isActive) {
    const missing = provider.fields.filter((field) => field.required && !next[field.key]);
    if (missing.length) throw new Error(formatMessage(serverTemplates.fillIn0BeforeTurningThisOn, { 0: missing.map((field) => field.key).join(", ") }));
  }
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  const data = {
    isActive: input.isActive,
    credentials: Object.keys(next).length ? encryptIntegrationCredentials(next) : null,
    config: JSON.parse(JSON.stringify(input.config ?? existing?.config ?? {})) as Prisma.InputJsonObject,
    updatedById: actorId,
    // New credentials have not been proven yet.
    ...(changed ? { healthStatus: "unknown", lastError: null, accountName: null } : {}),
  };
  await db.integrationSetting.upsert({
    where: { provider: provider.id },
    update: data,
    create: { provider: provider.id, ...data },
  });
}

export async function unlinkIntegrationSettings(providerId: string, actorId: string) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  await db.integrationSetting.upsert({
    where: { provider: provider.id },
    update: { isActive: false, credentials: null, healthStatus: "unknown", lastError: null, accountName: null, updatedById: actorId },
    create: { provider: provider.id, isActive: false, updatedById: actorId },
  });
}

/** Checks the stored credentials against the provider and records the result. */
export async function testIntegration(providerId: string) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  const record = await db.integrationSetting.findUnique({ where: { provider: provider.id } });
  if (!record?.credentials) throw new Error(serverMessages.saveTheCredentialsFirst);
  const result = await checkConnection(provider.id, readCredentials(provider.id, record.credentials));
  await db.integrationSetting.update({
    where: { provider: provider.id },
    data: {
      healthStatus: result.ok ? "healthy" : "error",
      lastError: result.ok ? null : result.error ?? "Connection check failed",
      accountName: result.accountName ?? record.accountName,
      lastCheckedAt: new Date(),
    },
  });
  return result;
}

/** Pulls follower counts and recent posts for one social integration into SocialMetric/SocialPost. */
export async function syncSocialIntegration(providerId: string, now = new Date()) {
  const provider = integrationProvider(providerId);
  if (!provider || provider.kind !== "social") throw new Error(serverMessages.thisIntegrationHasNoSocialDataTo);
  const record = await db.integrationSetting.findUnique({ where: { provider: provider.id } });
  if (!record?.isActive || !record.credentials) throw new Error(serverMessages.turnThisIntegrationOnFirst);
  try {
    const snapshot = await fetchSocialSnapshot(provider.id, readCredentials(provider.id, record.credentials));
    for (const post of snapshot.posts) {
      if (Number.isNaN(post.publishedAt.getTime())) continue;
      const counts = {
        likes: post.likes ?? 0, comments: post.comments ?? 0, shares: post.shares ?? 0,
        views: post.views ?? 0, reach: post.reach ?? 0, saves: post.saves ?? 0,
      };
      const fields = {
        caption: post.caption?.slice(0, 5000) ?? null,
        mediaType: post.mediaType ?? null,
        permalink: post.permalink ?? null,
        thumbnailUrl: post.thumbnailUrl ?? null,
        publishedAt: post.publishedAt,
        fetchedAt: now,
        ...counts,
      };
      await db.socialPost.upsert({
        where: { platform_externalId: { platform: post.platform, externalId: post.externalId } },
        update: fields,
        create: { platform: post.platform, externalId: post.externalId, ...fields },
      });
    }
    if (snapshot.metrics.length) {
      await db.socialMetric.createMany({
        data: snapshot.metrics.map((metric) => ({ platform: metric.platform, metricType: metric.metricType, value: metric.value, recordedAt: now })),
      });
    }
    await db.integrationSetting.update({
      where: { provider: provider.id },
      data: { healthStatus: "healthy", lastError: null, accountName: snapshot.accountName ?? record.accountName, lastSyncedAt: now, lastCheckedAt: now },
    });
    return { posts: snapshot.posts.length, metrics: snapshot.metrics.length };
  } catch (error) {
    const message = error instanceof ProviderError ? error.message : "Sync failed";
    await db.integrationSetting.update({
      where: { provider: provider.id },
      data: { healthStatus: "error", lastError: message, lastCheckedAt: now },
    });
    // Mark the latest numbers as stale so dashboards do not present them as current.
    await db.socialMetric.updateMany({ where: { platform: { in: provider.platforms } }, data: { isStale: true } });
    throw new Error(message);
  }
}

/** Worker entry point: syncs every active social integration not synced in the last `maxAgeHours`. */
export async function syncDueSocialIntegrations(maxAgeHours = 6, now = new Date()) {
  const due = await db.integrationSetting.findMany({
    where: {
      isActive: true,
      provider: { in: INTEGRATION_PROVIDERS.filter((p) => p.kind === "social").map((p) => p.id) },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(now.getTime() - maxAgeHours * 3_600_000) } }],
    },
    select: { provider: true },
  });
  let synced = 0;
  let failed = 0;
  for (const { provider } of due) {
    try {
      await syncSocialIntegration(provider, now);
      synced++;
    } catch {
      failed++;
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
    throw new Error(error instanceof ProviderError ? error.message : "WhatsApp send failed");
  }
}
