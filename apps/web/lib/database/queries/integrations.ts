import { getIntegration } from "@platform/api-client";
import type { IntegrationProviderId } from "../constants/integrations";
import type { Credentials } from "../integrations/providers";

/** Stored credentials for server-side use (sending, syncing). Null when the integration is off. */
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
