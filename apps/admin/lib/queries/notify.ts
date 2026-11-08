import { db } from "../atomic";
import type {
  PermissionAction,
  PermissionResource,
} from "../constants/permissions";
import { createNotification } from "./notifications";
import { hasPermission } from "./permissions";

/** Sends one notification to every active person whose role grants the permission (user overrides aside). */
export async function notifyUsersWithPermission(
  resource: PermissionResource,
  action: PermissionAction,
  notification: {
    title: string;
    message: string;
    message_key: string;
    message_params: Record<string, string>;
    type?: "info" | "warning" | "success" | "action";
    entity_type: string;
    entity_id: string;
  },
) {
  const users = await db.user.findMany({
    where: { isActive: true, archivedAt: null },
    select: { id: true, role: true },
  });
  const roles = Array.from(new Set(users.map((u) => u.role)));
  const allowed = new Set(
    (
      await Promise.all(
        roles.map(async (role) =>
          (await hasPermission(role as string, resource, action)) ? role : null,
        ),
      )
    ).filter(Boolean),
  );
  for (const user of users.filter((u) => allowed.has(u.role)))
    await createNotification({ user_id: user.id, ...notification });
}
