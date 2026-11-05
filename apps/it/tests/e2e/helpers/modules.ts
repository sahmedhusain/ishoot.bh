// Switching modules from tests. Modules live in the system service (backend/services/system), shared by every test
// database, so specs restore what they change. The test servers read modules without caching
// (SYSTEM_MODULES_CACHE_MS=0 in playwright.config.ts), so a change shows on the next page load.
import path from "node:path";
import {
  listModules,
  setModule as save,
} from "@platform/api-client/system";
import moduleCatalog from "../../../lib/contracts/catalog/modules.json";

const moduleOnByDefault = (moduleKey: string) =>
  moduleCatalog.modules.find((module) => module.key === moduleKey)
    ?.enabledByDefault ?? true;

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

const ACTOR = "e2e";

export type ModuleState = { moduleKey: string; isEnabled: boolean };

export async function modules(): Promise<ModuleState[]> {
  return (await listModules()).map((m) => ({
    moduleKey: m.key,
    isEnabled: m.enabled,
  }));
}

/** A module's state, or null for a key outside the catalogue. */
export async function getModule(
  moduleKey: string,
): Promise<ModuleState | null> {
  return (await modules()).find((m) => m.moduleKey === moduleKey) ?? null;
}

export const setModule = (moduleKey: string, isEnabled: boolean) =>
  save(moduleKey, isEnabled, ACTOR);

/** Puts a module back to its catalogue default. */
export const resetModule = (moduleKey: string) =>
  setModule(moduleKey, moduleOnByDefault(moduleKey));
