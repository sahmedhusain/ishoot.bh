"use server";
import { serverMessages } from "@platform/locales";
import { listIntegrations } from "@platform/api-client";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import {
  measureOperation,
  createSocialPlan,
  updateSocialPlan,
  deleteSocialPlan,
  syncSocialIntegration,
  INTEGRATION_PROVIDERS,
} from "@platform/database";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";

interface PlanInput {
  title: string;
  caption?: string | null;
  platforms: string[];
  mediaUrl?: string | null;
  scheduledFor?: string | null;
  status: string;
  publishedUrl?: string | null;
  assigneeId?: string | null;
}

/** Syncs every connected social account now. Returns per-provider results so the page can show failures. */
export async function refreshSocialAnalyticsAction() {
  validateActionArguments("refreshSocialAnalyticsAction", {});
  return measureOperation("admin:refreshSocialAnalytics", async () => {
    await requirePermission("social", "write");
    const all = await listIntegrations();
    const active = all.filter((item) => {
      if (!item.isActive) return false;
      const provider = INTEGRATION_PROVIDERS.find(
        (p) => p.id === item.provider,
      );
      return provider && provider.kind === "social";
    });
    const results: Array<{
      provider: string;
      ok: boolean;
      error: string | null;
    }> = [];
    for (const { provider } of active) {
      try {
        await syncSocialIntegration(provider);
        results.push({ provider, ok: true, error: null });
      } catch (error) {
        results.push({
          provider,
          ok: false,
          error: error instanceof Error ? error.message : "Sync failed",
        });
      }
    }
    revalidatePath(ROUTES.analytics);
    return { results };
  });
}

export async function saveSocialPlanAction(
  id: string | null,
  input: PlanInput,
) {
  validateActionArguments("saveSocialPlanAction", { id, input });
  return measureOperation("admin:saveSocialPlan", async () => {
    const user = await requirePermission("social", id ? "edit" : "create");
    const plan = id
      ? await updateSocialPlan(id, input)
      : await createSocialPlan(input, user.id);
    revalidatePath(ROUTES.analytics);
    return plan;
  });
}

export async function deleteSocialPlanAction(id: string) {
  validateActionArguments("deleteSocialPlanAction", { id });
  return measureOperation("admin:deleteSocialPlan", async () => {
    await requirePermission("social", "delete");
    await deleteSocialPlan(id);
    revalidatePath(ROUTES.analytics);
    return { success: true };
  });
}
