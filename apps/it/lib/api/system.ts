

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
export type Site = components["schemas"]["Site"];
export type SiteCode = components["schemas"]["SiteCode"];
export type SiteDomains = components["schemas"]["SiteDomains"];
export type SiteDomainsInput = components["schemas"]["SiteDomainsInput"];

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const system = () => (client ??= serviceClient<paths>());

export const listModules = async (): Promise<ModuleState[]> =>
  (await unwrap(system().GET("/v1/system/modules"))).items;

export const setModule = (key: string, enabled: boolean, actorId: string) =>
  unwrapEmpty(
    system().PUT("/v1/system/modules/{key}", {
      params: { path: { key } },
      body: { enabled, actorId },
    }),
  );

export const listModulesForIT = async (token: string) =>
  (await unwrap(userClient<paths>(token).GET("/v1/system/desk/modules")))
    .items;

export const setModuleForIT = (token: string, key: string, enabled: boolean) =>
  unwrapEmpty(
    userClient<paths>(token).PUT("/v1/system/desk/modules/{key}", {
      params: { path: { key } },
      body: { enabled },
    }),
  );

export const listIntegrations = async (): Promise<ServiceIntegration[]> =>
  (await unwrap(system().GET("/v1/system/integrations"))).items;

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

export const unlinkIntegration = (provider: string) =>
  unwrapEmpty(
    system().DELETE("/v1/system/integrations/{provider}", {
      params: { path: { provider } },
    }),
  );

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

export const listIntegrationsForIT = async (
  token: string,
): Promise<DeskIntegration[]> =>
  (await unwrap(userClient<paths>(token).GET("/v1/system/desk/integrations")))
    .items;

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

export const unlinkIntegrationForIT = (token: string, provider: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE(
      "/v1/system/desk/integrations/{provider}",
      {
        params: { path: { provider } },
      },
    ),
  );

export const getSite = (): Promise<Site> =>
  unwrap(system().GET("/v1/system/site"));

export const setSiteDomains = (input: SiteDomainsInput, actorId: string) =>
  unwrap(
    system().PUT("/v1/system/site/domains", { body: { ...input, actorId } }),
  );

export const getSiteDomainsForIT = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/system/desk/site/domains"));

export const setSiteDomainsForIT = (token: string, input: SiteDomainsInput) =>
  unwrap(
    userClient<paths>(token).PUT("/v1/system/desk/site/domains", {
      body: input,
    }),
  );

export const getSiteCodeForIT = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/system/desk/site/code"));

export const setSiteCodeForIT = (token: string, code: SiteCode) =>
  unwrap(
    userClient<paths>(token).PUT("/v1/system/desk/site/code", { body: code }),
  );
