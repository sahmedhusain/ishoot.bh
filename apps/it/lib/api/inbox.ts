

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

export type InboxOwner = { realm: "staff" | "it"; userId: string; categories: string[] };

let client: ReturnType<typeof serviceClient<paths>> | undefined;
const notify = () => (client ??= serviceClient<paths>());
const owner = (o: InboxOwner) => ({ realm: o.realm, userId: o.userId, categories: o.categories.join(",") });

export const deliverNotifications = (items: NewNotification[]) =>
  unwrap(notify().POST("/v1/notify/inbox", { body: { items } }));

export const listInbox = (
  o: InboxOwner,
  query: { filter?: InboxFilter; category?: string; limit?: number; cursor?: string } = {},
): Promise<InboxPage> =>
  unwrap(notify().GET("/v1/notify/inbox", { params: { query: { ...owner(o), ...query } } }));

export const inboxSummary = (o: InboxOwner): Promise<InboxSummary> =>
  unwrap(notify().GET("/v1/notify/inbox/summary", { params: { query: owner(o) } }));

export const getInboxItem = (o: InboxOwner, id: string) =>
  unwrap(notify().GET("/v1/notify/inbox/{id}", { params: { path: { id }, query: owner(o) } }));

export const actOnInbox = (o: InboxOwner, action: InboxAction): Promise<{ changed: number; unread: number }> =>
  unwrap(notify().POST("/v1/notify/inbox/actions", { params: { query: owner(o) }, body: action }));

export const getNotificationPreferences = (o: InboxOwner) =>
  unwrap(notify().GET("/v1/notify/preferences", { params: { query: owner(o) } }));

export const saveNotificationPreferences = (o: InboxOwner, body: NotificationPreferences) =>
  unwrap(notify().PUT("/v1/notify/preferences", { params: { query: owner(o) }, body }));

export const listMutedRecords = async (o: InboxOwner): Promise<MutedRecord[]> =>
  (await unwrap(notify().GET("/v1/notify/mutes", { params: { query: { realm: o.realm, userId: o.userId } } }))).items;

export const muteRecord = (o: InboxOwner, entityType: string, entityId: string, until: string | null = null) =>
  unwrapEmpty(
    notify().PUT("/v1/notify/mutes", {
      params: { query: { realm: o.realm, userId: o.userId } },
      body: { entityType, entityId, until },
    }),
  );

export const unmuteRecord = (o: InboxOwner, entityType: string, entityId: string) =>
  unwrapEmpty(
    notify().DELETE("/v1/notify/mutes", {
      params: { query: { realm: o.realm, userId: o.userId, entityType, entityId } },
    }),
  );

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
