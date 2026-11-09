import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";
import {
  getIntegration,
  listIntegrations,
  setIntegration,
  unlinkIntegration,
  updateIntegrationStatus,
  type ServiceIntegration,
} from "@platform/api-client";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_ENVIRONMENTS,
  PAYTABS_REGIONS,
  integrationProvider,
  type IntegrationProviderId,
} from "../constants/integrations";
import { checkSignInCredentials } from "../services/oauth-signin";
import {
  checkConnection,
  fetchSocialSnapshot,
  ProviderError,
  type Credentials,
} from "../integrations/providers";

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

const secretHint = (value: string) =>
  value.length > 8 ? `…${value.slice(-4)}` : "";

export async function listIntegrationsForAdmin(): Promise<
  IntegrationAdminView[]
> {
  const records = await listIntegrations();
  return INTEGRATION_PROVIDERS.map((provider) => {
    const record = records.find((r) => r.provider === provider.id);
    const credentials = record?.credentials ?? {};
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
      lastCheckedAt: record?.lastCheckedAt ?? null,
      lastSyncedAt: record?.lastSyncedAt ?? null,
      values,
      secrets,
      config: (record?.config as Record<string, unknown> | null) ?? {},
    };
  });
}

export async function getActiveIntegrationCredentials(
  provider: IntegrationProviderId,
): Promise<Credentials | null> {
  const record = await getIntegration(provider);
  if (
    !record?.isActive ||
    !record.credentials ||
    !Object.keys(record.credentials).length
  )
    return null;
  return record.credentials;
}

export async function getIntegrationRecord(
  provider: string,
): Promise<ServiceIntegration | null> {
  return await getIntegration(provider);
}

export interface SaveIntegrationInput {
  isActive: boolean;
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
  const existing = await getIntegration(provider.id);
  const current = existing?.credentials ?? {};
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
  if (
    provider.id === "paytabs" && next.region
  ) {
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
  const config = {
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
  };
  await setIntegration(provider.id, {
    isActive: input.isActive,
    values: next,
    config,
    actorId,
  });
}

export async function unlinkIntegrationSettings(
  providerId: string,
  _actorId?: string,
) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  await unlinkIntegration(provider.id);
}

export async function testIntegration(providerId: string) {
  const provider = integrationProvider(providerId);
  if (!provider) throw new Error(serverMessages.unknownIntegration);
  const record = await getIntegration(provider.id);
  if (!record?.credentials || !Object.keys(record.credentials).length)
    throw new Error(serverMessages.saveTheCredentialsFirst);
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

export async function syncSocialIntegration(
  providerId: string,
  now = new Date(),
) {
  throw new Error("syncSocialIntegration is now handled by the Go backend; API endpoint required");
}

export async function syncDueSocialIntegrations(
  maxAgeHours = 6,
  now = new Date(),
) {
  const all = await listIntegrations();
  const due = all.filter((r) => {
    if (!r.isActive) return false;
    const provider = integrationProvider(r.provider);
    if (!provider || provider.kind !== "social") return false;
    const lastSynced = r.lastSyncedAt ? new Date(r.lastSyncedAt).getTime() : 0;
    if (r.lastSyncedAt && now.getTime() - lastSynced < maxAgeHours * 3_600_000) return false;
    return true;
  });
  let synced = 0;
  let failed = 0;
  for (const { provider } of due) {
    try {
      await syncSocialIntegration(provider, now);
      synced++;
    } catch (error) {
      failed++;
    }
  }
  return { synced, failed };
}

export async function isCalendarSyncEnabled(): Promise<boolean> {
  const record = await getIntegration("google_calendar");
  return record ? record.isActive : true;
}

export async function setCalendarSyncEnabled(
  enabled: boolean,
  actorId: string,
): Promise<void> {
  await setIntegration("google_calendar", {
    isActive: enabled,
    actorId,
  });
}