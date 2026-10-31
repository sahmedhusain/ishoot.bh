import {
  ACTIVITY_PRESETS,
  BUSINESS_ACTIVITIES,
  isBusinessActivity,
  type BusinessActivity,
} from "../../packages/database/src/website-presets";
import { DEFAULT_FEATURE_MODULES } from "../../packages/database/src/constants/features";
import {
  STYLE_PRESETS,
  normalizeTheme,
} from "../../packages/database/src/constants/theme";
import { websiteConfigForActivity } from "../../packages/database/src/website-config";

export const DEMO_PRESETS = [...BUSINESS_ACTIVITIES, "all"] as const;

/** Use the same preset definitions as setup, so demos follow changes to the wizard. */
export function demoPreset(value: string, style?: string) {
  if (value !== "all" && !isBusinessActivity(value))
    throw new Error(
      `Unknown demo preset "${value}". Choose: ${DEMO_PRESETS.join(", ")}`,
    );
  const activity: BusinessActivity =
    value === "all" ? "media" : (value as BusinessActivity);
  const preset = ACTIVITY_PRESETS[activity];
  const styleId = style || preset.stylePreset;
  const selectedStyle = STYLE_PRESETS.find((s) => s.id === styleId);
  if (!selectedStyle)
    throw new Error(
      `Unknown demo style "${styleId}". Choose: ${STYLE_PRESETS.map((s) => s.id).join(", ")}`,
    );
  const website = websiteConfigForActivity(activity);
  if (value === "all") {
    website.sections = website.sections.map((section) => ({
      ...section,
      visible: true,
    }));
    website.inquiry = {
      budget: true,
      timeline: true,
      location: true,
      reference: true,
    };
  }
  return {
    id: value,
    activity,
    activities: value === "all" ? [...BUSINESS_ACTIVITIES] : [activity],
    style: styleId,
    theme: normalizeTheme(selectedStyle.theme),
    website,
    modules: DEFAULT_FEATURE_MODULES.map((module) => ({
      ...module,
      isEnabled:
        value === "all" ||
        (preset.modules[module.moduleKey as keyof typeof preset.modules] ??
          (!("isEnabled" in module) || module.isEnabled !== false)),
    })),
  };
}

export type DemoPreset = ReturnType<typeof demoPreset>;
