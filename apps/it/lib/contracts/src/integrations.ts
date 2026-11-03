// Integration catalogue shared by Settings → Integrations, the sync worker and analytics.
import catalog from "../catalog/integrations.json";

export type IntegrationKind =
  | "social"
  | "messaging"
  | "email"
  | "sign_in"
  | "payments"
  | "couriers";

export interface IntegrationField {
  key: string;
  secret?: boolean;
  required?: boolean;
  maxLength?: number;
}

export type IntegrationProvider = (typeof catalog.providers)[number];
export type IntegrationProviderId = IntegrationProvider["id"];
export type SocialPlatformId = (typeof catalog.socialPlatforms)[number];
export type SocialOwnerMetricId = (typeof catalog.socialOwnerMetrics)[number];

export const INTEGRATION_PROVIDERS: readonly IntegrationProvider[] = catalog.providers;
export const INTEGRATION_ENVIRONMENTS = catalog.environments;
export const PAYTABS_REGIONS: Record<string, string> = catalog.paytabsRegions;
export const SOCIAL_PLATFORM_IDS: readonly SocialPlatformId[] = catalog.socialPlatforms;
export const SOCIAL_OWNER_METRIC_IDS: readonly SocialOwnerMetricId[] = catalog.socialOwnerMetrics;

export const integrationProvider = (id: string) =>
  INTEGRATION_PROVIDERS.find((provider) => provider.id === id);
