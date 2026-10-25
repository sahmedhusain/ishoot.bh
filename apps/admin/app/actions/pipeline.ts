"use server";
import { revalidatePath } from "next/cache";
import {
  applyActivityDealPipeline,
  createActivityLog,
  getCompanySettings,
  measureOperation,
  requireFeatureEnabled,
  runAtomicMutation,
  saveDealPipeline,
  type DealPipelineStageInput,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

function revalidatePipeline() {
  revalidatePath(ROUTES.settings.pipeline);
  revalidatePath(ROUTES.crm.deals);
  revalidatePath(ROUTES.home);
}

/** Saves the whole stage list in its new order (Settings → Sales pipeline). */
export async function saveDealPipelineAction(stages: DealPipelineStageInput[]) {
  return measureOperation("action:saveDealPipelineAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveDealPipelineAction", { stages });
    const saved = await runAtomicMutation(async () => {
      const result = await saveDealPipeline(stages);
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "deal_pipeline", details: { stages: stages.map((stage) => stage.id) } });
      return result;
    });
    revalidatePipeline();
    return { success: true, stages: saved };
  });
}

/** Rebuilds the pipeline the company's activity recommends, keeping every stage that still holds deals. */
export async function resetDealPipelineAction() {
  return measureOperation("action:resetDealPipelineAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("resetDealPipelineAction", {});
    const company = await getCompanySettings();
    await runAtomicMutation(async () => {
      await applyActivityDealPipeline(company.business_activity);
      await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "deal_pipeline", details: { reset: company.business_activity ?? null } });
    });
    revalidatePipeline();
    return { success: true };
  });
}
