// The system service (backend/services/system): installation-wide settings. Modules and integrations are
// read by every app; IT staff manage them with their own token, and backend services use service tokens.
import { apiError } from "./errors";
import type { components, paths } from "./generated/system";
import { serviceClient, unwrap, unwrapEmpty, userClient } from "./http";

export type ModuleState = components["schemas"]["Module"];
export type DeskIntegration = components["schemas"]["DeskIntegration"];
export type ServiceIntegration = components["schemas"]["ServiceIntegration"];
export type SaveIntegrationServiceInput =
  components["schemas"]["SaveIntegrationServiceInput"];
export type SaveIntegrationITInput =
  components["schemas"]["SaveIntegrationITInput"];
export type UpdateIntegrationStatusInput =
  components["schemas"]["UpdateIntegrationStatusInput"];
export type SecretHint = components["schemas"]["SecretHint"];

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const system = () => (client ??= serviceClient<paths>());

/** Every catalogue module with whether it is on (a module nobody switched follows its default). */
export const listModules = async (): Promise<ModuleState[]> =>
  (await unwrap(system().GET("/v1/system/modules"))).items;

/** Switches a module for the person this app acts for. */
export const setModule = (key: string, enabled: boolean, actorId: string) =>
  unwrapEmpty(
    system().PUT("/v1/system/modules/{key}", {
      params: { path: { key } },
      body: { enabled, actorId },
    }),
  );

/** The modules, read by an IT account (modules:read). */
export const listModulesForIT = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/system/desk/modules")))
    .items;

/** Switches a module as an IT account (modules:edit). */
export const setModuleForIT = (token: string, key: string, enabled: boolean) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/system/desk/modules/{key}", {
      params: { path: { key } },
      body: { enabled },
    }),
  );

/** Stored integration settings for service callers (credentials decrypted). */
export const listIntegrations = async (): Promise<ServiceIntegration[]> =>
  (await unwrap(system().GET("/v1/system/integrations"))).items;

/** Stored integration settings for one provider, or null when not found. */
export const getIntegration = async (
  provider: string,
): Promise<ServiceIntegration | null> => {
  const { data, error, response } = await system().GET(
    "/v1/system/integrations/{provider}",
    {
      params: { path: { provider } },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok || !data) throw await apiError(response, error);
  return data;
};

/** Saves or turns off an integration on behalf of a service actor. */
export const setIntegration = (
  provider: string,
  input: SaveIntegrationServiceInput,
) =>
  unwrapEmpty(
    system().PUT("/v1/system/integrations/{provider}", {
      params: { path: { provider } },
      body: input,
    }),
  );

/** Unlinks (deactivates and clears credentials of) an integration. */
export const unlinkIntegration = (provider: string) =>
  unwrapEmpty(
    system().DELETE("/v1/system/integrations/{provider}", {
      params: { path: { provider } },
    }),
  );

/** Updates status, health, sync times, config, or refreshed credentials for an integration. */
export const updateIntegrationStatus = (
  provider: string,
  input: UpdateIntegrationStatusInput,
) =>
  unwrapEmpty(
    system().PUT("/v1/system/integrations/{provider}/status", {
      params: { path: { provider } },
      body: input,
    }),
  );

/** Desk view of all integrations for IT staff. */
export const listIntegrationsForIT = async (
  token: string,
): Promise<DeskIntegration[]> =>
  (await unwrap(userClient<paths>(token).GET("/v1/system/desk/integrations")))
    .items;

/** Saves or turns off an integration as IT staff. */
export const setIntegrationForIT = (
  token: string,
  provider: string,
  input: SaveIntegrationITInput,
) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/system/desk/integrations/{provider}", {
      params: { path: { provider } },
      body: input,
    }),
  );

/** Unlinks an integration as IT staff. */
export const unlinkIntegrationForIT = (token: string, provider: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE(
      "/v1/system/desk/integrations/{provider}",
      {
        params: { path: { provider } },
      },
    ),
  );

