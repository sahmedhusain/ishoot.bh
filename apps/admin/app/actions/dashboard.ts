"use server";
import { revalidatePath } from "next/cache";
import {
  measureOperation,
  normalizeDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
  type DashboardLayoutItem,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { dashboardContext } from "../../lib/dashboard-widgets";

/** Saves the person's own widgets, order and sizes; anything they may not see is dropped. */
export async function saveDashboardLayoutAction(
  widgets: DashboardLayoutItem[],
) {
  return measureOperation("action:saveDashboardLayoutAction", async () => {
    const ctx = await dashboardContext();
    validateActionArguments("saveDashboardLayoutAction", { widgets });
    const layout = normalizeDashboardLayout(widgets, ctx.available);
    await saveDashboardLayout(ctx.user.id, layout);
    revalidatePath(ROUTES.home);
    return { success: true, layout };
  });
}

/** Back to the role's default dashboard. */
export async function resetDashboardLayoutAction() {
  validateActionArguments("resetDashboardLayoutAction", {});
  return measureOperation("action:resetDashboardLayoutAction", async () => {
    const ctx = await dashboardContext();
    await resetDashboardLayout(ctx.user.id);
    revalidatePath(ROUTES.home);
    return { success: true };
  });
}
