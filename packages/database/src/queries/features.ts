import { serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  DEFAULT_FEATURE_MODULES,
  moduleOnByDefault,
} from "../constants/features";

export async function getFeatureToggles() {
  return await db.featureToggle.findMany({
    orderBy: { moduleKey: "asc" },
  });
}

export async function getFeatureToggle(moduleKey: string) {
  return await db.featureToggle.findUnique({
    where: { moduleKey },
  });
}

/** Switches a module on or off; a known module missing from the database (added in a later version) is created. */
export async function updateFeatureToggle(
  moduleKey: string,
  isEnabled: boolean,
) {
  const known = DEFAULT_FEATURE_MODULES.find((m) => m.moduleKey === moduleKey);
  if (!known)
    return await db.featureToggle.update({
      where: { moduleKey },
      data: { isEnabled },
    });
  return await db.featureToggle.upsert({
    where: { moduleKey },
    update: { isEnabled },
    create: {
      moduleKey,
      nameEn: known.nameEn,
      nameAr: known.nameAr,
      isEnabled,
    },
  });
}

/** Creates any default module that is missing (a fresh install has none); existing choices are kept. */
export async function ensureDefaultFeatureModules() {
  await db.featureToggle.createMany({
    data: DEFAULT_FEATURE_MODULES.map((m) => ({ ...m })),
    skipDuplicates: true,
  });
  return getFeatureToggles();
}

export async function requireFeatureEnabled(moduleKey: string) {
  const feature = await db.featureToggle.findUnique({
    where: { moduleKey },
    select: { isEnabled: true },
  });
  if (feature ? !feature.isEnabled : !moduleOnByDefault(moduleKey))
    throw new Error(serverMessages.featureDisabled);
}

/** Whether a module is on; one never toggled follows its default (most are on), as in requireFeatureEnabled. */
export async function isFeatureEnabled(moduleKey: string) {
  const feature = await db.featureToggle.findUnique({
    where: { moduleKey },
    select: { isEnabled: true },
  });
  return feature ? feature.isEnabled : moduleOnByDefault(moduleKey);
}
