// In-app notification categories, priorities and sounds (catalog/notifications.json, ADR 0012). The notify service
// applies the same catalogue in Go (backend/pkg/catalog).
import catalog from "../catalog/notifications.json";

export type NotificationRealm = "staff" | "it";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationSound = (typeof catalog.sounds)[number];
export type NotificationCategory = (typeof catalog.categories)[number];

export const NOTIFICATION_PRIORITIES = catalog.priorities as readonly NotificationPriority[];
export const NOTIFICATION_DEFAULT_PRIORITY = catalog.defaultPriority as NotificationPriority;
export const NOTIFICATION_SOUNDS: readonly string[] = catalog.sounds;
export const NOTIFICATION_DEFAULT_SOUND = catalog.defaultSound;
export const NOTIFICATION_DEFAULT_VOLUME = catalog.defaultVolume;
export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = catalog.categories;

/** The category with this key. */
export const notificationCategory = (key: string) =>
  NOTIFICATION_CATEGORIES.find((c) => c.key === key);

/** The categories of one realm, in catalogue order. */
export const realmCategories = (realm: NotificationRealm) =>
  NOTIFICATION_CATEGORIES.filter((c) => c.realms.includes(realm));

/**
 * The categories a person may receive and configure: personal ones always, role ones when one of their
 * permissions ("resource:action") allows it.
 */
export function allowedCategories(
  realm: NotificationRealm,
  allows: (resource: string, action: string) => boolean,
): string[] {
  return realmCategories(realm)
    .filter(
      (c) =>
        c.permissions.length === 0 ||
        c.permissions.some((p) => {
          const [resource, action] = p.split(":");
          return allows(resource, action);
        }),
    )
    .map((c) => c.key);
}

/** The category of a notification that did not name one: by message key, then entity type, then the fallback. */
export function categoryFor(
  realm: NotificationRealm,
  messageKey?: string | null,
  entityType?: string | null,
): string {
  const inRealm = realmCategories(realm);
  const byKey = messageKey
    ? inRealm.find((c) => c.messageKeyPrefixes.some((p) => messageKey.startsWith(p)))
    : undefined;
  if (byKey) return byKey.key;
  const byEntity = entityType
    ? inRealm.find((c) => c.entityTypes.includes(entityType))
    : undefined;
  return byEntity?.key ?? catalog.fallbackCategory;
}
