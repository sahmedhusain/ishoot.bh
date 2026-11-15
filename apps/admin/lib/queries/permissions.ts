import {
  listAdminPermissionsApi,
  setAdminPermissionApi,
} from "../api/identity";
import { moduleOnByDefault } from "../constants/features";
import { getFeatureToggles, isFeatureEnabled } from "./features";
import { Permission, UserRole } from "../types";

import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  RESOURCE_FEATURES,
  isDefaultAllowed,
  resolveGrant,
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
  resolveGrant,
  canonicalRoleId,
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
    return await isFeatureEnabled(moduleKey);
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
    const all = await listAdminPermissionsApi();
    const rows = all.filter(
      (p) => p.role === role && p.resource === resource && (p.action === action || p.action === "write"),
    );
    return resolveGrant(
      role,
      resource,
      action,
      (_resource, act) => rows.find((row) => row.action === act)?.allowed,
    );
  } catch (err) {
    console.error("Error checking permission from DB:", err);
    return false;
  }
}

export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const records = await listAdminPermissionsApi();
    return records.map((p) => ({
      id: p.id,
      role: p.role as UserRole,
      resource: p.resource,
      action: p.action,
      allowed: p.role === "super_admin" || Boolean(p.allowed),
      created_at: p.created_at || p.createdAt || new Date().toISOString(),
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
    await setAdminPermissionApi({ role, resource, action, allowed: granted });
    return true;
  } catch (err) {
    console.error("Error upserting permission:", err);
    throw err;
  }
}

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
  if (role === "super_admin") return permissions;
  const features = await getFeatureToggles();
  const known = new Map(features.map((f) => [f.moduleKey, f.isEnabled]));
  const moduleOn = (moduleKey: string) =>
    known.get(moduleKey) ?? moduleOnByDefault(moduleKey);
  const records = (await listAdminPermissionsApi()).filter((r) => r.role === role);
  const stored = new Map(
    records.map((r) => [`${r.resource}:${r.action}`, Boolean(r.allowed)]),
  );
  for (const resource of ALL_RESOURCES) {
    for (const action of ALL_ACTIONS) {
      permissions[`${resource}:${action}`] = resolveGrant(
        role,
        resource,
        action,
        (res, act) => stored.get(`${res}:${act}`),
      );
    }
  }
  for (const [key, allowed] of Object.entries(userOverrides || {})) {
    if (key in permissions && typeof allowed === "boolean")
      permissions[key] = allowed;
  }
  for (const resource of ALL_RESOURCES) {
    const moduleKey = RESOURCE_FEATURES[resource];
    if (moduleKey && !moduleOn(moduleKey)) {
      for (const action of ALL_ACTIONS)
        permissions[`${resource}:${action}`] = false;
    }
  }
  return permissions;
}

export async function ensureRoleTemplates() {
  // Role and permission templates are seeded in PostgreSQL identity.role / identity.permission.
}

export function ensureRoleTemplatesOnce() {
  return Promise.resolve();
}
