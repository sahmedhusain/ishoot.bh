import type { PermissionAction, TaskScope } from "@platform/database";
import { hasPermission, requirePermission } from "./auth";

/** The signed-in person's view of tasks: everything when they assign tasks, else their own and their department's. */
export async function taskScope(action: PermissionAction = "read"): Promise<TaskScope & { userId: string }> {
  const user = await requirePermission("tasks", action);
  return { userId: user.id, departmentId: user.department_id ?? null, all: await hasPermission("tasks", "assign") };
}
