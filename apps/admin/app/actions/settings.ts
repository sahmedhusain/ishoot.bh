"use server";

import {
  updateCompanySettings,
  createActivityLog,
  upsertCompanyAsset,
  deleteCompanyAsset,
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

export async function saveCompanyAssetAction(
  assetKey: string,
  data: {
    title: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
  },
) {
  const user = await requirePermission("settings", "write");
  const asset = await upsertCompanyAsset(assetKey, data);

  // Sync to CompanySettings fields if applicable
  const syncMap: Record<string, keyof CompanySettings> = {
    logo_light: "logo_url",
    logo_dark: "dark_logo_url",
    icon: "icon_url",
    stamp: "stamp_url",
    signature: "signature_url",
  };

  if (syncMap[assetKey]) {
    await updateCompanySettings({ [syncMap[assetKey]]: data.fileUrl });
  }

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "company_asset",
    entity_id: asset.id,
    details: { assetKey, title: data.title },
  });

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard");
  return { success: true, asset };
}

export async function deleteCompanyAssetAction(assetKey: string) {
  const user = await requirePermission("settings", "write");
  const deleted = await deleteCompanyAsset(assetKey);

  const syncMap: Record<string, keyof CompanySettings> = {
    logo_light: "logo_url",
    logo_dark: "dark_logo_url",
    icon: "icon_url",
    stamp: "stamp_url",
    signature: "signature_url",
  };

  if (syncMap[assetKey]) {
    await updateCompanySettings({ [syncMap[assetKey]]: "" });
  }

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "company_asset",
    entity_id: assetKey,
    details: { assetKey },
  });

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard");
  return { success: deleted };
}


export async function toggleFeatureAction(moduleKey: string, isEnabled: boolean) {
  const { updateFeatureToggle } = require('@ishoot/database');
  const feature = await updateFeatureToggle(moduleKey, isEnabled);
  revalidatePath('/dashboard', 'layout');
  return { success: true, feature };
}

