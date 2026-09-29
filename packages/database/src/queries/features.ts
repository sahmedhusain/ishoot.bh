import { db } from "../db";

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
