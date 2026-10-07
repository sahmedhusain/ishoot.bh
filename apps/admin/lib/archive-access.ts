import { ARCHIVE_KINDS, archiveKindsFor, type ArchiveKind, type PermissionAction, type PermissionResource } from "@ishoot/database";
import { hasPermission } from "./auth";

/** The archive kinds the current user may see (and, for exports, also export). */
export async function archiveKindsForCurrentUser(actions: PermissionAction[] = ["read"]): Promise<ArchiveKind[]> {
  const resources = Array.from(new Set(Object.values(ARCHIVE_KINDS).map((k) => k.resource))) as PermissionResource[];
  const allowed = new Set<PermissionResource>();
  await Promise.all(
    resources.map(async (resource) => {
      const results = await Promise.all(actions.map((action) => hasPermission(resource, action)));
      if (results.every(Boolean)) allowed.add(resource);
    }),
  );
  return archiveKindsFor((resource) => allowed.has(resource));
}
