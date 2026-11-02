"use server";
// The signed-in IT account's notifications and status (docs/adr/0012), with their own token.
import {
  actOnMyInbox,
  clearITStatus,
  muteMyRecord,
  saveMyNotificationPreferences,
  setITStatus,
  type InboxAction,
  type NotificationPreferences,
  type StatusChoice,
} from "@platform/api-client";
import { asUser, requireUser } from "../lib/session";

export async function inboxAction(action: InboxAction) {
  const user = await requireUser();
  return asUser(() => actOnMyInbox(user.token, { ...action, ids: action.ids?.slice(0, 500) }));
}

export async function savePreferencesAction(preferences: NotificationPreferences) {
  const user = await requireUser();
  return asUser(() => saveMyNotificationPreferences(user.token, preferences));
}

export async function muteRecordAction(entityType: string, entityId: string) {
  const user = await requireUser();
  await asUser(() => muteMyRecord(user.token, entityType, entityId));
}

export async function setStatusAction(choice: StatusChoice) {
  const user = await requireUser();
  return asUser(() => setITStatus(user.token, choice));
}

export async function clearStatusAction() {
  const user = await requireUser();
  return asUser(() => clearITStatus(user.token));
}
