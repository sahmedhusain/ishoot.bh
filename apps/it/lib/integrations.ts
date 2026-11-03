import { getIntegration, updateIntegrationStatus } from "@platform/api-client";
import { serverMessages, serverTemplates, formatMessage } from "@platform/locales";
import { integrationProvider } from "./config/constants/integrations";
import { checkConnection, fetchSocialSnapshot } from "./integrations/providers";

/** Checks the stored credentials against the provider and records the result. */
export async function testIntegration(providerId: string) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  const record = await getIntegration(provider.id);
  if (!record?.credentials || !Object.keys(record.credentials).length) {
    throw new Error(serverMessages.saveTheCredentialsFirst);
  }
  const result = await checkConnection(provider.id, record.credentials);
  await updateIntegrationStatus(provider.id, {
    healthStatus: result.ok
      ? result.validation === "format"
        ? "configured"
        : "healthy"
      : "error",
    lastError: result.ok ? null : (result.error ?? "Connection check failed"),
    accountName: result.accountName ?? record.accountName,
    lastCheckedAt: new Date().toISOString(),
  });
  return result;
}

/** Pulls follower counts and recent posts for one social integration. */
export async function syncSocialIntegration(providerId: string, now = new Date()) {
  const provider = integrationProvider(providerId);
  if (!provider || provider.kind !== "social") {
    throw new Error(serverMessages.thisIntegrationHasNoSocialDataTo);
  }
  const record = await getIntegration(provider.id);
  if (!record?.isActive || !record.credentials || !Object.keys(record.credentials).length) {
    throw new Error(serverMessages.turnThisIntegrationOnFirst);
  }
  const retryAfterAt = (record.config as Record<string, unknown> | null)?.retryAfterAt;
  if (typeof retryAfterAt === "string" && new Date(retryAfterAt) > now) {
    throw new Error(
      formatMessage(serverTemplates.providerSyncWaiting, {
        time: retryAfterAt,
      }),
    );
  }
  try {
    const snapshot = await fetchSocialSnapshot(provider.id, record.credentials, now);
    await updateIntegrationStatus(provider.id, {
      healthStatus: "healthy",
      lastError: null,
      lastCheckedAt: now.toISOString(),
      lastSyncedAt: now.toISOString(),
      accountName: snapshot.accountName ?? record.accountName,
    });
    return { ok: true, snapshot };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await updateIntegrationStatus(provider.id, {
      healthStatus: "error",
      lastError: error,
      lastCheckedAt: now.toISOString(),
    });
    throw e;
  }
}
