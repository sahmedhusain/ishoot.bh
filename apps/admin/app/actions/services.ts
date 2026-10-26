"use server";
import { mirrorBilingual } from "@platform/database/constants/languages";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  createService,
  updateService,
  deleteService,
  createActivityLog,
  getCompanySettings,
  ServiceCategory,
} from "@platform/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function createServiceAction(data: {
  code?: string;
  name_en: string;
  name_ar: string;
  category?: ServiceCategory;
  description_en?: string;
  description_ar?: string;
  unit?: "hour" | "day" | "project" | "unit" | "minute";
  default_rate: number;
  is_active?: boolean;
  display_order?: number;
}) {
  return measureOperation("action:createServiceAction", async () => {
    const user = await requirePermission("invoices", "write");
    validateActionArguments("createServiceAction", { data });
    data = mirrorBilingual(
      data,
      (await getCompanySettings()).content_languages,
    );
    const { service } = await runAtomicMutation(async () => {
      const service = await createService(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "service",
        entity_id: service.id,
        details: { name: service.name_en, rate: service.default_rate },
      });
      return { service };
    });

    revalidatePath(ROUTES.services);
    revalidatePath(ROUTES.invoices.list);
    return { success: true, service };
  });
}

export async function updateServiceAction(
  id: string,
  data: Partial<{
    code: string;
    name_en: string;
    name_ar: string;
    category: ServiceCategory;
    description_en: string;
    description_ar: string;
    unit: "hour" | "day" | "project" | "unit" | "minute";
    default_rate: number;
    is_active: boolean;
    display_order: number;
  }>,
) {
  return measureOperation("action:updateServiceAction", async () => {
    const user = await requirePermission("invoices", "write");
    validateActionArguments("updateServiceAction", { id, data });
    data = mirrorBilingual(
      data,
      (await getCompanySettings()).content_languages,
    );
    const { service } = await runAtomicMutation(async () => {
      const service = await updateService(id, data);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "service",
        entity_id: id,
        details: { name: service.name_en, rate: service.default_rate },
      });
      return { service };
    });

    revalidatePath(ROUTES.services);
    revalidatePath(ROUTES.invoices.list);
    return { success: true, service };
  });
}

export async function deleteServiceAction(id: string) {
  return measureOperation("action:deleteServiceAction", async () => {
    const user = await requirePermission("invoices", "delete");
    validateActionArguments("deleteServiceAction", { id });
    const success = await deleteService(id);

    if (success) {
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "service",
        entity_id: id,
      });
    }

    revalidatePath(ROUTES.services);
    revalidatePath(ROUTES.invoices.list);
    return { success };
  });
}
