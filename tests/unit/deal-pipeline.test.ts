import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import { BUSINESS_ACTIVITIES } from "../../packages/database/src/website-presets";
import { ACTIVITY_DEAL_STAGES, BUILT_IN_DEAL_STAGES, SYSTEM_DEAL_STAGES, activityDealStages, DEAL_STAGE_ON_EVENT } from "../../packages/database/src/constants/crm";

describe("sales pipeline per business activity", () => {
  test("every activity has a pipeline framed by the system stages, without repeats", () => {
    for (const activity of BUSINESS_ACTIVITIES) {
      expect(ACTIVITY_DEAL_STAGES[activity], activity).toBeDefined();
      const stages = activityDealStages(activity);
      expect(new Set(stages).size, activity).toBe(stages.length);
      for (const system of SYSTEM_DEAL_STAGES) expect(stages, activity).toContain(system);
      expect(stages.slice(-2)).toEqual(["closed_won", "closed_lost"]);
    }
  });

  test("events only move deals into system stages", () => {
    for (const stage of Object.values(DEAL_STAGE_ON_EVENT)) expect(SYSTEM_DEAL_STAGES).toContain(stage);
  });

  test("every built-in stage has a name in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const names = getTranslations(locale).admin.stages as Record<string, string>;
      for (const stage of BUILT_IN_DEAL_STAGES) expect(names[stage], `${locale} ${stage}`).toBeTruthy();
    }
  });
});
