"use server";
import { revalidatePath } from "next/cache";
import { createActivityLog, measureOperation, replyToRequest, saveCannedReply, saveServiceSettings, type CannedReplyInput } from "@platform/database";
import { sendEmail } from "@platform/email";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";

/** Replies to the customer by e-mail or WhatsApp from a request, keeping the reply on the request. */
export async function replyToRequestAction(id: string, input: { channel: string; body: string }) {
  return measureOperation("action:replyToRequestAction", async () => {
    const user = await requirePermission("requests", "edit");
    validateActionArguments("replyToRequestAction", { id, input });
    const channel = input.channel === "whatsapp" ? "whatsapp" : "email";
    const result = await replyToRequest(id, { channel, body: input.body }, user, async (message) => (await sendEmail(message).catch(() => null))?.success === true);
    await createActivityLog({ user_id: user.id, action: "reply", entity_type: "inquiry", entity_id: id, details: { channel } });
    revalidatePath(ROUTES.requests.detail(id));
    return { success: true, whatsappLink: result.whatsappLink };
  });
}

export async function saveServiceSettingsAction(input: { urgent: string; high: string; normal: string }) {
  return measureOperation("action:saveServiceSettingsAction", async () => {
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveServiceSettingsAction", { input });
    await saveServiceSettings(input);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "service_desk", details: input });
    revalidatePath(ROUTES.requests.settings);
    return { success: true };
  });
}

export async function saveCannedReplyAction(input: CannedReplyInput) {
  return measureOperation("action:saveCannedReplyAction", async () => {
    const user = await requirePermission("requests", "edit");
    validateActionArguments("saveCannedReplyAction", { input });
    const reply = await saveCannedReply(input);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "canned_reply", entity_id: reply.id, details: { title: reply.title } });
    revalidatePath(ROUTES.requests.settings);
    return { success: true };
  });
}
