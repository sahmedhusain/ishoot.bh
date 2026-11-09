

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

export async function getModule(
  moduleKey: string,
): Promise<ModuleState | null> {
  return (await modules()).find((m) => m.moduleKey === moduleKey) ?? null;
}

export const setModule = (moduleKey: string, isEnabled: boolean) =>
  save(moduleKey, isEnabled, ACTOR);

export const resetModule = (moduleKey: string) =>
  setModule(moduleKey, moduleOnByDefault(moduleKey));
