// The system service (backend/services/system): installation-wide settings. Modules are read by every app; the
// admin's setup wizard switches them for the person it acts for, and IT staff switch them with their own token.
import type { components, paths } from "./generated/system";
import { serviceClient, unwrap, unwrapEmpty, userClient } from "./http";

export type ModuleState = components["schemas"]["Module"];

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
