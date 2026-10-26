"use server";
import { ROUTES } from "../../constants/routes";
import { validateActionArguments } from "../../lib/action-input";
import {
  measureOperation,
  createActivityLog,
  saveIntegrationSettings,
  unlinkIntegrationSettings,
  testIntegration,
  syncSocialIntegration,
  sendWhatsAppTestMessage,
} from "@platform/database";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath(ROUTES.settings.integrations);
  revalidatePath(ROUTES.analytics);
}

/** Saves an integration. Secret fields left blank keep their stored value; secrets are never returned. */
export async function saveIntegration(
  provider: string,
  isActive: boolean,
  values: Record<string, string>,
  config: Record<string, boolean | string | number> = {},
) {
  validateActionArguments("saveIntegration", { provider, isActive, values, config });
  return measureOperation(`admin:saveIntegration:${provider}`, async () => {
    const user = await requirePermission("settings", "write");
    await saveIntegrationSettings(provider, { isActive, values, config }, user.id);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "integration", entity_id: provider, details: { isActive } });
    revalidate();
    return { success: true };
  });
}

export async function unlinkIntegration(provider: string) {
  validateActionArguments("unlinkIntegration", { provider });
  return measureOperation(`admin:unlinkIntegration:${provider}`, async () => {
    const user = await requirePermission("settings", "write");
    await unlinkIntegrationSettings(provider, user.id);
    await createActivityLog({ user_id: user.id, action: "delete", entity_type: "integration", entity_id: provider });
    revalidate();
    return { success: true };
  });
}

export async function testIntegrationAction(provider: string) {
  validateActionArguments("testIntegrationAction", { provider });
  return measureOperation(`admin:testIntegration:${provider}`, async () => {
    await requirePermission("settings", "write");
    const result = await testIntegration(provider);
    revalidate();
    return { ok: result.ok, validation: result.validation ?? null, accountName: result.accountName ?? null, error: result.error ?? null };
  });
}

export async function syncIntegrationAction(provider: string) {
  validateActionArguments("syncIntegrationAction", { provider });
  return measureOperation(`admin:syncIntegration:${provider}`, async () => {
    await requirePermission("social", "write");
    try {
      const result = await syncSocialIntegration(provider);
      return { ok: true as const, ...result, error: null };
    } catch (error) {
      return { ok: false as const, posts: 0, metrics: 0, error: error instanceof Error ? error.message : "Sync failed" };
    } finally {
      revalidate();
    }
  });
}

export async function sendWhatsAppTestAction(to: string, message: string) {
  validateActionArguments("sendWhatsAppTestAction", { to, message });
  return measureOperation("admin:sendWhatsAppTest", async () => {
    const user = await requirePermission("settings", "write");
    const result = await sendWhatsAppTestMessage(to, message);
    await createActivityLog({ user_id: user.id, action: "whatsapp_test", entity_type: "integration", entity_id: "whatsapp", details: { messageId: result.messageId } });
    return { messageId: result.messageId };
  });
}
