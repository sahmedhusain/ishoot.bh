import { db } from "../db";
import { Permission, UserRole } from "../types";

import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  RESOURCE_FEATURES,
  isDefaultAllowed,
  type PermissionAction,
  type PermissionResource,
} from "../constants/permissions";

export {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  DEFAULT_ROLE_RULES,
  PERMISSION_GROUPS,
  RESOURCE_FEATURES,
  isDefaultAllowed,
  permissionKey,
} from "../constants/permissions";
export type {
  PermissionAction,
  PermissionKey,
  PermissionMap,
  PermissionResource,
  RoleKey,
} from "../constants/permissions";

async function resourceEnabled(resource: PermissionResource) {
  const moduleKey = RESOURCE_FEATURES[resource];
  if (!moduleKey) return true;
  try {
    const feature = await db.featureToggle.findUnique({ where: { moduleKey }, select: { isEnabled: true } });
    return feature?.isEnabled !== false;
  } catch {
    return false;
  }
}

export async function hasPermission(
  role: string,
  resource: PermissionResource,
  action: PermissionAction,
  userOverrides?: Record<string, boolean> | null,
): Promise<boolean> {
  if (role === "super_admin") return true;
  if (!(await resourceEnabled(resource))) return false;

  if (userOverrides) {
    const key = `${resource}:${action}`;
    if (typeof userOverrides[key] === "boolean") {
      return userOverrides[key];
    }
  }

  try {
    const perm = await db.permission.findUnique({
      where: {
        role_resource_action: {
          role,
          resource,
          action,
        },
      },
    });

    if (perm !== null) {
      return perm.allowed;
    }

    // Compatibility fallback: write grants map to create and edit only;
    // assign/approve/credential management must be explicitly granted.
    if (action === "create" || action === "edit") {
      const writePerm = await db.permission.findUnique({
        where: {
          role_resource_action: {
            role,
            resource,
            action: "write",
          },
        },
      });
      if (writePerm !== null) {
        return writePerm.allowed;
      }
    }
  } catch (err) {
    console.error("Error checking permission from DB:", err);
    return false;
  }

  return false;
}

export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const records = await db.permission.findMany({
      orderBy: [{ role: "asc" }, { resource: "asc" }, { action: "asc" }],
    });
    return records.map((p) => ({
      id: p.id,
      role: p.role as UserRole,
      resource: p.resource,
      action: p.action,
      allowed: p.role === "super_admin" || p.allowed,
      created_at: p.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching permissions:", err);
    throw err;
  }
}

export async function setPermission(
  role: string,
  resource: string,
  action: string,
  allowed: boolean,
): Promise<boolean> {
  const granted = role === "super_admin" || allowed;
  try {
    await db.permission.upsert({
      where: {
        role_resource_action: {
          role,
          resource,
          action,
        },
      },
      update: { allowed: granted },
      create: {
        role,
        resource,
        action,
        allowed: granted,
      },
    });
    return true;
  } catch (err) {
    console.error("Error upserting permission:", err);
    throw err;
  }
}

export async function seedDefaultPermissions(): Promise<void> {
  for (const role of ALL_ROLES) {
    for (const resource of ALL_RESOURCES) {
      for (const action of ALL_ACTIONS) {
        const allowed = isDefaultAllowed(role, resource, action);
        await db.permission.upsert({
          where: {
            role_resource_action: {
              role,
              resource,
              action,
            },
          },
          update: { allowed },
          create: {
            role,
            resource,
            action,
            allowed,
          },
        });
      }
    }
  }
}

// One role query supplies the complete UI matrix, including explicit denials.
export async function getEffectivePermissions(
  role: string,
  userOverrides?: Record<string, boolean> | null,
): Promise<Record<string, boolean>> {
  const permissions: Record<string, boolean> = {};
  for (const resource of ALL_RESOURCES) {
    for (const action of ALL_ACTIONS) {
      permissions[`${resource}:${action}`] = role === "super_admin";
    }
  }
  // Stored denials and user overrides can never restrict Super Admin.
  if (role === "super_admin") return permissions;
  const features = await db.featureToggle.findMany({ select: { moduleKey: true, isEnabled: true } });
  const disabled = new Set(features.filter((f) => !f.isEnabled).map((f) => f.moduleKey));
  const records = await db.permission.findMany({
    where: { role },
    select: { resource: true, action: true, allowed: true },
  });
  const recordMap = new Set(records.map((r) => `${r.resource}:${r.action}`));
  for (const record of records) {
    const key = `${record.resource}:${record.action}`;
    if (key in permissions) permissions[key] = record.allowed;
  }
  // Compatibility fallback: if create/edit not explicitly stored, derive from write
  for (const resource of ALL_RESOURCES) {
    const writeKey = `${resource}:write`;
    const createKey = `${resource}:create`;
    const editKey = `${resource}:edit`;
    if (permissions[writeKey] && !recordMap.has(createKey)) {
      permissions[createKey] = permissions[writeKey];
    }
    if (permissions[writeKey] && !recordMap.has(editKey)) {
      permissions[editKey] = permissions[writeKey];
    }
  }
  for (const [key, allowed] of Object.entries(userOverrides || {})) {
    if (key in permissions && typeof allowed === "boolean")
      permissions[key] = allowed;
  }
  for (const resource of ALL_RESOURCES) {
    if (disabled.has(RESOURCE_FEATURES[resource] || "")) {
      for (const action of ALL_ACTIONS) permissions[`${resource}:${action}`] = false;
    }
  }
  return permissions;
}
