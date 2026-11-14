import { redirect } from "next/navigation";
import { getCompanySettings } from "./queries/company-settings";
import {
  DEFAULT_ADMIN_ALLOWED_SETTINGS,
  type AdminAllowedSettings,
  type AdminSettingKey,
} from "./types";

export async function getAdminAllowedSettings(): Promise<AdminAllowedSettings> {
  const settings = await getCompanySettings().catch(() => null);
  return {
    ...DEFAULT_ADMIN_ALLOWED_SETTINGS,
    ...(settings?.admin_allowed_settings ?? {}),
  };
}

export async function isAdminSettingAllowed(
  key: AdminSettingKey,
): Promise<boolean> {
  const allowed = await getAdminAllowedSettings();
  return Boolean(allowed[key]);
}

export async function requireAdminSettingAllowed(
  key: AdminSettingKey,
): Promise<void> {
  const ok = await isAdminSettingAllowed(key);
  if (!ok) {
    redirect(`/dashboard/settings?restricted=1&section=${key}`);
  }
}

export async function assertAdminSettingAllowed(
  key: AdminSettingKey,
): Promise<void> {
  const ok = await isAdminSettingAllowed(key);
  if (!ok) {
    throw new Error(`Setting "${key}" is restricted to the IT department.`);
  }
}
