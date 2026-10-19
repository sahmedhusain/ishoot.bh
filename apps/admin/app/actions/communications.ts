"use server";
import { serverMessages } from "@ishoot/locales";
import { revalidatePath } from "next/cache";
import {
  announcementRights,
  archiveAnnouncement,
  draftFromTemplate,
  saveAnnouncement,
  submitAnnouncement,
  updateAnnouncementReceipt,
  saveOfficialLetter,
  submitOfficialLetter,
  cancelOfficialLetter,
  saveLetterTemplate,
  updateCommunicationSettings,
  createActivityLog,
  runAtomicMutation,
  type AnnouncementInput,
  type OfficialLetterInput,
  type LetterTemplateInput,
} from "@ishoot/database";
import { requireAuth, requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
const refresh = () => revalidatePath("/dashboard", "layout");
export async function saveAnnouncementAction(
  input: AnnouncementInput,
  id?: string,
) {
  const actor = await requireAuth();
  validateActionArguments("saveAnnouncementAction", { input, id });
  const saved = await saveAnnouncement(input, actor, id);
  refresh();
  return { id: saved.id };
}
export async function submitAnnouncementAction(id: string) {
  const actor = await requireAuth();
  validateActionArguments("submitAnnouncementAction", { id });
  const rights = await announcementRights(actor);
  if (!rights.createTeam)
    throw new Error(serverMessages.communicationError6);
  const result = await submitAnnouncement(id, actor);
  refresh();
  return { status: result.status };
}
export async function archiveAnnouncementAction(id: string) {
  const actor = await requireAuth();
  validateActionArguments("archiveAnnouncementAction", { id });
  await archiveAnnouncement(id, actor);
  refresh();
}
export async function announcementReceiptAction(
  id: string,
  change: "read" | "unread" | "acknowledge" | "hide" | "unhide",
) {
  const actor = await requireAuth();
  validateActionArguments("announcementReceiptAction", { id, change });
  await updateAnnouncementReceipt(id, actor.id, change);
  refresh();
}
export async function saveOfficialLetterAction(
  input: OfficialLetterInput,
  id?: string,
) {
  const actor = await requirePermission("letters", id ? "edit" : "create");
  validateActionArguments("saveOfficialLetterAction", { input, id });
  const saved = await runAtomicMutation(async () => {
    const saved = await saveOfficialLetter(input, actor.id, id);
    await createActivityLog({
      user_id: actor.id,
      action: id ? "update" : "create",
      entity_type: "official_letter",
      entity_id: saved.id,
    });
    return saved;
  });
  refresh();
  return { id: saved.id };
}
export async function submitOfficialLetterAction(id: string) {
  const actor = await requirePermission("letters", "edit");
  validateActionArguments("submitOfficialLetterAction", { id });
  const result = await submitOfficialLetter(id, actor.id);
  refresh();
  return { status: result.status };
}
export async function cancelOfficialLetterAction(id: string) {
  await requirePermission("letters", "delete");
  validateActionArguments("cancelOfficialLetterAction", { id });
  await cancelOfficialLetter(id);
  refresh();
}
export async function saveLetterTemplateAction(
  input: LetterTemplateInput,
  id?: string,
) {
  await requirePermission("letters", "edit");
  validateActionArguments("saveLetterTemplateAction", { input, id });
  const saved = await saveLetterTemplate(input, id);
  refresh();
  return { id: saved.id };
}
export async function draftLetterTemplateAction(
  templateId: string,
  employeeId?: string,
  purpose?: string,
  recipient?: { name?: string; title?: string; organization?: string },
) {
  await requirePermission("letters", "create");
  validateActionArguments("draftLetterTemplateAction", {
    templateId,
    employeeId,
    purpose,
    recipient,
  });
  if (employeeId) await requirePermission("employees", "read");
  return draftFromTemplate(templateId, { employeeId, purpose, recipient });
}
export async function communicationSettingsAction(
  managersAnnounceToTeam: boolean,
) {
  const actor = await requirePermission("settings", "edit");
  validateActionArguments("communicationSettingsAction", {
    managersAnnounceToTeam,
  });
  await updateCommunicationSettings({ managersAnnounceToTeam }, actor.id);
  refresh();
}
