import path from "node:path";
import {
  getIntegration,
  listIntegrations,
  setIntegration as save,
  unlinkIntegration as unlink,
  updateIntegrationStatus as updateStatus,
  type ServiceIntegration,
} from "../../../lib/api/system";

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

const ACTOR = "e2e";

export async function integrations(): Promise<ServiceIntegration[]> {
  return await listIntegrations();
}

export async function getIntegrationSetting(
  provider: string,
): Promise<ServiceIntegration | null> {
  return await getIntegration(provider);
}

export const setIntegration = (
  provider: string,
  isActive: boolean,
  values: Record<string, string> = {},
  config: Record<string, unknown> = {},
) =>
  save(provider, {
    isActive,
    values,
    config,
    actorId: ACTOR,
  });

export const unlinkIntegration = (provider: string) => unlink(provider);

export const updateIntegrationStatus = (
  provider: string,
  input: Parameters<typeof updateStatus>[1],
) => updateStatus(provider, input);
