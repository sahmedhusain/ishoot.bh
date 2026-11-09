import type { DealPipelineStage } from "@platform/database";
import type { AdminTranslations } from "./translations";

type StageName = Pick<DealPipelineStage, "id" | "name_en" | "name_ar">;

export function dealStageLabel(
  stage: StageName,
  t: AdminTranslations,
  locale: string,
): string {
  const own =
    locale === "ar"
      ? stage.name_ar || stage.name_en
      : stage.name_en || stage.name_ar;
  return own || (t.stages as Record<string, string>)[stage.id] || stage.id;
}

export const dealStageColor = (stage: Pick<DealPipelineStage, "color">) =>
  stage.color || "rgb(var(--brand-accent))";
