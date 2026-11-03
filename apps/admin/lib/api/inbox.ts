// In-app notifications in the notify service (ADR 0012). The admin back end acts for its signed-in person with its
// service token and says which categories their permissions allow; the IT dashboard uses the IT account's own token.
import type { components, paths } from "./generated/notify";
import { serviceClient, unwrap, unwrapEmpty, userClient } from "./http";

export type InboxItem = components["schemas"]["InboxItem"];
export type NewNotification = components["schemas"]["NewNotification"];
export type NotificationPreferences = components["schemas"]["Preferences"];
export type InboxFilter = "all" | "unread" | "read" | "archived" | "muted";
export type InboxActionName = "read" | "unread" | "archive" | "unarchive" | "delete";
export type InboxPage = { items: InboxItem[]; unread: number; nextCursor?: string };
export type InboxSummary = { unread: number; byCategory: Record<string, number> };
export type InboxAction = {
  action: InboxActionName;
  ids?: string[];
  all?: boolean;
  filter?: InboxFilter;
  category?: string;
};
export type MutedRecord = { entityType: string; entityId: string; until: string | null; createdAt: string };

/** Whose inbox: a person of a realm, and the categories their permissions let them see. */
export type InboxOwner = { realm: "staff" | "it"; userId: string; categories: string[] };

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const notify = () => (client ??= serviceClient<paths>());
const owner = (o: InboxOwner) => ({ realm: o.realm, userId: o.userId, categories: o.categories.join(",") });

/** Delivers up to 500 notifications; a repeated id or dedupe key for the same person changes nothing. */
export const deliverNotifications = (items: NewNotification[]) =>
  unwrap(notify().POST("/v1/notify/inbox", { body: { items } }));

/** A page of the person's notifications, newest first, with their unread count. */
export const listInbox = (
  o: InboxOwner,
  query: { filter?: InboxFilter; category?: string; limit?: number; cursor?: string } = {},
): Promise<InboxPage> =>
  unwrap(notify().GET("/v1/notify/inbox", { params: { query: { ...owner(o), ...query } } }));

/** Unread counts by category. */
export const inboxSummary = (o: InboxOwner): Promise<InboxSummary> =>
  unwrap(notify().GET("/v1/notify/inbox/summary", { params: { query: owner(o) } }));

/** One of the person's notifications. */
export const getInboxItem = (o: InboxOwner, id: string) =>
  unwrap(notify().GET("/v1/notify/inbox/{id}", { params: { path: { id }, query: owner(o) } }));

/** Marks read or unread, archives, restores or deletes notifications. */
export const actOnInbox = (o: InboxOwner, action: InboxAction): Promise<{ changed: number; unread: number }> =>
  unwrap(notify().POST("/v1/notify/inbox/actions", { params: { query: owner(o) }, body: action }));

/** The person's notification settings. */
export const getNotificationPreferences = (o: InboxOwner) =>
  unwrap(notify().GET("/v1/notify/preferences", { params: { query: owner(o) } }));

/** Replaces the person's notification settings. */
export const saveNotificationPreferences = (o: InboxOwner, body: NotificationPreferences) =>
  unwrap(notify().PUT("/v1/notify/preferences", { params: { query: owner(o) }, body }));

/** The records the person muted. */
export const listMutedRecords = async (o: InboxOwner): Promise<MutedRecord[]> =>
  (await unwrap(notify().GET("/v1/notify/mutes", { params: { query: { realm: o.realm, userId: o.userId } } }))).items;

/** Silences notifications about one record, until a time or until unmuted. */
export const muteRecord = (o: InboxOwner, entityType: string, entityId: string, until: string | null = null) =>
  unwrapEmpty(
    notify().PUT("/v1/notify/mutes", {
      params: { query: { realm: o.realm, userId: o.userId } },
      body: { entityType, entityId, until },
    }),
  );

/** Lets notifications about a record ring again. */
export const unmuteRecord = (o: InboxOwner, entityType: string, entityId: string) =>
  unwrapEmpty(
    notify().DELETE("/v1/notify/mutes", {
      params: { query: { realm: o.realm, userId: o.userId, entityType, entityId } },
    }),
  );

// The signed-in IT account, with their own token: the categories follow their roles.

export const listMyInbox = (
  token: string,
  query: { filter?: InboxFilter; category?: string; limit?: number; cursor?: string } = {},
): Promise<InboxPage> => unwrap(userClient<paths>(token).GET("/v1/notify/me/inbox", { params: { query } }));

export const myInboxSummary = (token: string): Promise<InboxSummary> =>
  unwrap(userClient<paths>(token).GET("/v1/notify/me/inbox/summary"));

export const getMyInboxItem = (token: string, id: string) =>
  unwrap(userClient<paths>(token).GET("/v1/notify/me/inbox/{id}", { params: { path: { id } } }));

export const actOnMyInbox = (token: string, action: InboxAction): Promise<{ changed: number; unread: number }> =>
  unwrap(userClient<paths>(token).POST("/v1/notify/me/inbox/actions", { body: action }));

export const getMyNotificationPreferences = (token: string) =>
  unwrap(userClient<paths>(token).GET("/v1/notify/me/preferences"));

export const saveMyNotificationPreferences = (token: string, body: NotificationPreferences) =>
  unwrap(userClient<paths>(token).PUT("/v1/notify/me/preferences", { body }));

export const listMyMutedRecords = async (token: string): Promise<MutedRecord[]> =>
  (await unwrap(userClient<paths>(token).GET("/v1/notify/me/mutes"))).items;

export const muteMyRecord = (token: string, entityType: string, entityId: string, until: string | null = null) =>
  unwrapEmpty(userClient<paths>(token).PUT("/v1/notify/me/mutes", { body: { entityType, entityId, until } }));

export const unmuteMyRecord = (token: string, entityType: string, entityId: string) =>
  unwrapEmpty(
    userClient<paths>(token).DELETE("/v1/notify/me/mutes", { params: { query: { entityType, entityId } } }),
  );
