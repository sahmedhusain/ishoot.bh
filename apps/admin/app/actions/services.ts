"use server";

import {
  getAllServices,
  createService,
  updateService,
  deleteService,
  createActivityLog,
  ServiceCategory,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function getServicesAction(filters?: {
  category?: string;
  isActive?: boolean;
  search?: string;
}) {
  try {
    const services = await getAllServices(filters);
    return { success: true, services };
  } catch (error: any) {
    console.error("Failed to fetch services:", error);
    return { success: false, error: error.message || "Failed to fetch services" };
  }
}

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
  const user = await requirePermission("invoices", "write");
  const service = await createService(data);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "service",
    entity_id: service.id,
    details: { name: service.name_en, rate: service.default_rate },
  });

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/invoices");
  return { success: true, service };
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
  const user = await requirePermission("invoices", "write");
  const service = await updateService(id, data);

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "service",
    entity_id: id,
    details: { name: service.name_en, rate: service.default_rate },
  });

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/invoices");
  return { success: true, service };
}

export async function deleteServiceAction(id: string) {
  const user = await requirePermission("invoices", "delete");
  const success = await deleteService(id);

  if (success) {
    await createActivityLog({
      user_id: user.id,
      action: "delete",
      entity_type: "service",
      entity_id: id,
    });
  }

  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/invoices");
  return { success };
}
