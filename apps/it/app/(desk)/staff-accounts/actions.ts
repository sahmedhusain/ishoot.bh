"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  createStaffAccountForIT,
  updateStaffAccountForIT,
  copyStaffAccessForIT,
  previewStaffAccessForIT,
  inviteStaffAccountForIT,
  resetStaffMFAForIT,
  queueMessage,
  type StaffAccountDraft,
  type StaffAccessTemplate,
} from "@platform/api-client";
import { asUser, requireAllowed } from "../../../lib/session";
import { copyFor, getLocale } from "../../../lib/i18n";
import { config } from "../../../lib/config";
import { staffCommand } from "../../../lib/identity-errors";
export async function copyStaffAccessAction(id: string) {
  const user = await requireAllowed("staff_accounts", "read");
  return asUser(() => staffCommand(() => copyStaffAccessForIT(user.token, id)));
}
export async function previewStaffAccessAction(draft: StaffAccessTemplate) {
  const user = await requireAllowed("staff_accounts", "read");
  return asUser(() =>
    staffCommand(() => previewStaffAccessForIT(user.token, draft)),
  );
}
export async function saveStaffAccountAction(
  id: string | undefined,
  draft: StaffAccountDraft,
) {
  const user = await requireAllowed("staff_accounts", id ? "edit" : "create");
  const result = await asUser(() =>
    staffCommand(() =>
      id
        ? updateStaffAccountForIT(user.token, id, draft)
        : createStaffAccountForIT(user.token, draft),
    ),
  );
  revalidatePath("/staff-accounts");
  return result;
}
export async function inviteStaffAccountAction(id: string) {
  const user = await requireAllowed("staff_accounts", "execute");
  return asUser(() =>
    staffCommand(async () => {
      const origin = new URL(config.adminPublicUrl());
      if (
        !["https:", "http:"].includes(origin.protocol) ||
        origin.username ||
        origin.password
      )
        throw new Error("Invalid admin origin");
      const invitation = await inviteStaffAccountForIT(user.token, id);
      const url = new URL("/login/reset", origin);
      url.searchParams.set("token", invitation.token);
      url.searchParams.set("email", invitation.email);
      const n = copyFor(await getLocale()).staffAccounts;
      await queueMessage({
        channel: "email",
        to: invitation.email,
        subject: n.invitationSubject,
        text: `${n.invitationBody}\n\n${url}`,
        actorId: user.subject,
        idempotencyKey: `staff-invite:${createHash("sha256").update(invitation.token).digest("hex")}`,
      });
    }),
  );
}
export async function resetStaffMFAAction(id: string) {
  const user = await requireAllowed("staff_accounts", "execute");
  const result = await asUser(() =>
    staffCommand(() => resetStaffMFAForIT(user.token, id)),
  );
  revalidatePath("/staff-accounts");
  return result;
}
