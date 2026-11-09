"use server";
import { revalidatePath } from "next/cache";
import {
  deleteCustomFolderForUser,
  measureOperation,
  normalizeDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
  upsertCustomFolderForUser,
  type CustomArchiveFolder,
  type CustomFolderScope,
  type DashboardLayoutItem,
} from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import { dashboardContext } from "../../lib/dashboard-widgets";

export async function saveDashboardLayoutAction(
  widgets: DashboardLayoutItem[],
) {
  return measureOperation("action:saveDashboardLayoutAction", async () => {
    const ctx = await dashboardContext();
    const coreWidgets = Array.isArray(widgets)
      ? widgets.map((w) => ({ id: w.id, size: w.size }))
      : [];
    validateActionArguments("saveDashboardLayoutAction", {
      widgets: coreWidgets,
    });
    const layout = normalizeDashboardLayout(widgets, ctx.available);
    await saveDashboardLayout(ctx.user.id, layout);
    revalidatePath(ROUTES.home);
    return { success: true, layout };
  });
}

export async function resetDashboardLayoutAction() {
  validateActionArguments("resetDashboardLayoutAction", {});
  return measureOperation("action:resetDashboardLayoutAction", async () => {
    const ctx = await dashboardContext();
    await resetDashboardLayout(ctx.user.id);
    revalidatePath(ROUTES.home);
    return { success: true };
  });
}

const VALID_COLORS = new Set([
  "emerald",
  "amber",
  "sky",
  "violet",
  "rose",
  "teal",
]);
const VALID_SCOPES = new Set(["personal", "department", "role", "company"]);

export async function saveCustomFolderAction(input: {
  id?: string;
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  color?: string;
  scope?: string;
  departmentId?: string | null;
  roleKey?: string | null;
  archiveGroup?: string | null;
  items?: { id: string; title: string; url: string; kind?: string; addedAt?: string }[];
}) {
  validateActionArguments("saveCustomFolderAction", { input });
  return measureOperation("action:saveCustomFolderAction", async () => {
    const ctx = await dashboardContext();
    const nameEn = (input.nameEn ?? "").trim().slice(0, 100);
    const nameAr = (input.nameAr ?? nameEn).trim().slice(0, 100);
    if (!nameEn) {
      throw new Error("Folder name is required");
    }
    const color = VALID_COLORS.has(input.color ?? "")
      ? (input.color as CustomArchiveFolder["color"])
      : "emerald";
    const scope = VALID_SCOPES.has(input.scope ?? "")
      ? (input.scope as CustomFolderScope)
      : "personal";

    const folder: CustomArchiveFolder = {
      id:
        input.id && /^[a-zA-Z0-9_-]{4,64}$/.test(input.id)
          ? input.id
          : `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      nameEn,
      nameAr: nameAr || nameEn,
      descriptionEn: (input.descriptionEn ?? "").trim().slice(0, 240),
      descriptionAr: (input.descriptionAr ?? "").trim().slice(0, 240),
      color,
      scope,
      ownerId: ctx.user.id,
      departmentId: input.departmentId ?? null,
      roleKey: scope === "role" ? (input.roleKey || ctx.user.role) : null,
      archiveGroup: input.archiveGroup ?? null,
      items: Array.isArray(input.items)
        ? input.items
            .filter(
              (item) =>
                item &&
                typeof item.title === "string" &&
                typeof item.url === "string" &&
                item.title.trim().length > 0,
            )
            .slice(0, 50)
            .map((item, idx) => ({
              id: item.id || `item_${idx}_${Date.now().toString(36)}`,
              title: item.title.trim().slice(0, 140),
              url: item.url.trim().slice(0, 500),
              kind: item.kind ? item.kind.slice(0, 40) : "document",
              addedAt: item.addedAt || new Date().toISOString(),
            }))
        : [],
      createdAt: new Date().toISOString(),
    };

    const folders = await upsertCustomFolderForUser(ctx.user.id, folder);
    revalidatePath(ROUTES.home);
    revalidatePath(ROUTES.archive);
    return { success: true, folder, folders };
  });
}

export async function deleteCustomFolderAction(folderId: string) {
  validateActionArguments("deleteCustomFolderAction", { folderId });
  return measureOperation("action:deleteCustomFolderAction", async () => {
    const ctx = await dashboardContext();
    if (!folderId || typeof folderId !== "string") {
      throw new Error("Invalid folder ID");
    }
    await deleteCustomFolderForUser(ctx.user.id, folderId);
    revalidatePath(ROUTES.home);
    revalidatePath(ROUTES.archive);
    return { success: true };
  });
}
