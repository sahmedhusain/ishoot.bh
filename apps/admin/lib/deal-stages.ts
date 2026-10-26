import type { DealPipelineStage } from "@platform/database";
import type { AdminTranslations } from "./translations";

type StageName = Pick<DealPipelineStage, "id" | "name_en" | "name_ar">;

/** A stage's name: the company's own wording, else the built-in label for its activity, else its id. */
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

/** The board colour of a stage; the brand accent when none is set. */
export const dealStageColor = (stage: Pick<DealPipelineStage, "color">) =>
  stage.color || "rgb(var(--brand-accent))";
