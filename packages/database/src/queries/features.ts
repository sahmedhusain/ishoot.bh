import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { DEFAULT_FEATURE_MODULES } from "../constants/features";

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

export async function updateFeatureToggle(moduleKey: string, isEnabled: boolean) {
  return await db.featureToggle.update({
    where: { moduleKey },
    data: { isEnabled },
  });
}

/** Creates any default module that is missing (a fresh install has none); existing choices are kept. */
export async function ensureDefaultFeatureModules() {
  await db.featureToggle.createMany({ data: DEFAULT_FEATURE_MODULES.map((m) => ({ ...m })), skipDuplicates: true });
  return getFeatureToggles();
}

export async function requireFeatureEnabled(moduleKey:string) {
  const feature=await db.featureToggle.findUnique({where:{moduleKey},select:{isEnabled:true}});
  if(feature?.isEnabled === false) throw new Error(serverMessages.featureDisabled);
}
