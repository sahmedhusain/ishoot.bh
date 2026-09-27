"use server";

import {
  updateCompanySettings,
  createActivityLog,
  CompanySettings,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function updateCompanySettingsAction(settings: CompanySettings) {
  const user = await requirePermission("settings", "write");
  const updated = await updateCompanySettings(settings);

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "settings",
    entity_id: settings.id,
    details: { companyNameEn: settings.company_name_en },
  });

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/payments");
  return { success: true, settings: updated };
}
