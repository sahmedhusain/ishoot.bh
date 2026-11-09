import { serverMessages } from "@platform/locales";
import { listModules, setModule, type ModuleState } from "@platform/api-client";
import { moduleOnByDefault } from "../constants/features";

export type FeatureToggle = {
  moduleKey: string;
  isEnabled: boolean;
  nameEn: string;
  nameAr: string;
};

const cacheMs = () => {
  const n = Number(process.env.SYSTEM_MODULES_CACHE_MS);
  return Number.isFinite(n) && n >= 0 ? n : 5000;
};
let cached: { until: number; modules: Promise<ModuleState[]> } | undefined;

function modules(): Promise<ModuleState[]> {
  const now = Date.now();
  if (!cached || now >= cached.until) {
    const pending = listModules();
    cached = { until: now + cacheMs(), modules: pending };
    pending.catch(() => {
      if (cached?.modules === pending) cached = undefined;
    });
  }
  return cached.modules;
}

const toToggle = (m: ModuleState): FeatureToggle => ({
  moduleKey: m.key,
  isEnabled: m.enabled,
  nameEn: m.nameEn,
  nameAr: m.nameAr,
});

export async function getFeatureToggles(): Promise<FeatureToggle[]> {
  try {
    return (await modules()).map(toToggle).sort((a, b) => a.moduleKey.localeCompare(b.moduleKey));
  } catch {
    return [];
  }
}

export async function getFeatureToggle(moduleKey: string): Promise<FeatureToggle | null> {
  try {
    const found = (await modules()).find((m) => m.key === moduleKey);
    return found ? toToggle(found) : null;
  } catch {
    return null;
  }
}

export async function updateFeatureToggle(moduleKey: string, isEnabled: boolean, actorId: string) {
  await setModule(moduleKey, isEnabled, actorId);
  cached = undefined;
  return { moduleKey, isEnabled };
}

export async function isFeatureEnabled(moduleKey: string) {
  try {
    const found = (await modules()).find((m) => m.key === moduleKey);
    return found ? found.enabled : moduleOnByDefault(moduleKey);
  } catch {
    return moduleOnByDefault(moduleKey);
  }
}

export async function requireFeatureEnabled(moduleKey: string) {
  if (!(await isFeatureEnabled(moduleKey))) throw new Error(serverMessages.featureDisabled);
}
