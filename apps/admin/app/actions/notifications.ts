"use server";
import { serverMessages } from "@platform/locales";
import { measureOperation } from "@platform/database";
import {
  actOnInbox,
  isApiError,
  muteRecord,
  saveNotificationPreferences,
  unmuteRecord,
} from "@platform/api-client";
import { validateActionArguments } from "../../lib/action-input";
import { myInboxOwner } from "../../lib/inbox";

function failure(error: unknown): never {
  if (isApiError(error, "notification_not_found")) throw new Error(serverMessages.notificationNotFound);
  throw error;
}

export async function markNotificationReadAction(id: string) {
  return measureOperation("action:markNotificationReadAction", async () => {
    validateActionArguments("markNotificationReadAction", { id });
    const result = await actOnInbox(await myInboxOwner(), { action: "read", ids: [id] }).catch(failure);
    if (!result.changed) throw new Error(serverMessages.notificationNotFound);
    return { success: true, unread: result.unread };
  });
}

export async function markAllNotificationsReadAction(userId?: string) {
  return measureOperation("action:markAllNotificationsReadAction", async () => {
    validateActionArguments("markAllNotificationsReadAction", { userId });
    const result = await actOnInbox(await myInboxOwner(), { action: "read", all: true, filter: "unread" }).catch(failure);
    return { success: true, unread: result.unread };
  });
}

export async function updateNotificationAction(
  id: string,
  change: "read" | "unread" | "hide" | "unhide" | "delete",
) {
  validateActionArguments("updateNotificationAction", { id, change });
  const action = change === "hide" ? "archive" : change === "unhide" ? "unarchive" : change;
  const result = await actOnInbox(await myInboxOwner(), { action, ids: [id] }).catch(failure);
  if (!result.changed && change === "delete") throw new Error(serverMessages.notificationNotFound);
  return { unread: result.unread };
}

export async function bulkNotificationAction(input: {
  action: "read" | "unread" | "archive" | "unarchive" | "delete";
  ids?: string[];
  all?: boolean;
  filter?: "all" | "unread" | "read" | "archived" | "muted";
  category?: string;
}) {
  validateActionArguments("bulkNotificationAction", { input });
  if (!input.all && !input.ids?.length) return { changed: 0, unread: 0 };
  return actOnInbox(await myInboxOwner(), {
    action: input.action,
    ids: input.all ? undefined : input.ids?.slice(0, 500),
    all: input.all,
    filter: input.filter,
    category: input.category,
  }).catch(failure);
}

export async function saveNotificationPreferencesAction(preferences: {
  mutedUntil: string | null;
  soundEnabled: boolean;
  sound: "chime" | "ping" | "pop" | "bell" | "alert";
  volume: number;
  popupsEnabled: boolean;
  desktopEnabled: boolean;
  categories: { category: string; muted: boolean; sound: boolean }[];
}) {
  validateActionArguments("saveNotificationPreferencesAction", { preferences });
  try {
    return await saveNotificationPreferences(await myInboxOwner(), preferences);
  } catch (error) {
    if (isApiError(error) && error.status === 422) throw new Error(serverMessages.notificationSettingsInvalid);
    throw error;
  }
}

export async function muteNotificationRecordAction(entityType: string, entityId: string, until?: string | null) {
  validateActionArguments("muteNotificationRecordAction", { entityType, entityId, until });
  await muteRecord(await myInboxOwner(), entityType, entityId, until ?? null);
}

export async function unmuteNotificationRecordAction(entityType: string, entityId: string) {
  validateActionArguments("unmuteNotificationRecordAction", { entityType, entityId });
  await unmuteRecord(await myInboxOwner(), entityType, entityId).catch((error) => {
    if (!isApiError(error) || error.status !== 404) throw error;
  });
}
