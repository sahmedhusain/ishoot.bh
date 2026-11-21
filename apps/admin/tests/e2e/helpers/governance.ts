import { expect } from "@playwright/test";
import {
  DEFAULT_ADMIN_ALLOWED_SETTINGS,
  type AdminSettingKey,
} from "../../../lib/types";
import { getCachedItAuth, loadRootEnv } from "./strict-audit";

export const DEFAULT_ADMIN_GOVERNANCE = { ...DEFAULT_ADMIN_ALLOWED_SETTINGS };

/**
 * Delegates or restores admin settings governance via the real IT desk API
 * (`PUT /v1/system/desk/company`, requiring IT `setup:edit` permission).
 * Passing `null` restores `DEFAULT_ADMIN_ALLOWED_SETTINGS`.
 */
export async function setAdminGovernance(
  values: Partial<Record<AdminSettingKey, boolean>> | null,
): Promise<void> {
  const env = loadRootEnv();
  const gatewayUrl = (env.API_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
  const auth = await getCachedItAuth(gatewayUrl);
  const adminAllowedSettings = values
    ? { ...DEFAULT_ADMIN_ALLOWED_SETTINGS, ...values }
    : { ...DEFAULT_ADMIN_ALLOWED_SETTINGS };

  const res = await fetch(`${gatewayUrl}/v1/system/desk/company`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: JSON.stringify({
      values: { adminAllowedSettings },
    }),
  });

  const body = await res.text().catch(() => "");
  expect(
    res.status,
    `PUT ${gatewayUrl}/v1/system/desk/company failed (${res.status}): ${body}`,
  ).toBe(200);
}
