import { getTranslations } from "@platform/locales";
import { db } from "../atomic";
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
    const rows = await db.permission.findMany({
      where: { role, resource, action: { in: [action, "write"] } },
      select: { action: true, allowed: true },
    });
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
  const features = await getFeatureToggles();
  const known = new Map(features.map((f) => [f.moduleKey, f.isEnabled]));
  const moduleOn = (moduleKey: string) =>
    known.get(moduleKey) ?? moduleOnByDefault(moduleKey);
  const records = await db.permission.findMany({
    where: { role },
    select: { resource: true, action: true, allowed: true },
  });
  const stored = new Map(
    records.map((r) => [`${r.resource}:${r.action}`, r.allowed]),
  );
  for (const resource of ALL_RESOURCES) {
    for (const action of ALL_ACTIONS) {
      permissions[`${resource}:${action}`] = resolveGrant(
        role,
        resource,
        action,
        (res, act) => stored.get(`${res}:${act}`) as boolean | undefined,
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

/**
 * Creates the role templates an installation does not have yet, named in both languages, and stores every grant
 * a template role is missing (new templates, or resources added since the role was created) with the template's
 * default. Grants that are already stored, including a company's own changes, are never touched.
 */
export async function ensureRoleTemplates() {
  const existing = new Set(
    (await db.role.findMany({ select: { id: true } })).map((role) => role.id),
  );
  const missing = ALL_ROLES.filter((role) => !existing.has(role));
  if (missing.length) {
    const en = getTranslations("en").admin.roles as Record<string, string>;
    const ar = getTranslations("ar").admin.roles as Record<string, string>;
    await db.role.createMany({
      data: missing.map((id) => ({
        id,
        nameEn: en[id] ?? id,
        nameAr: ar[id] ?? id,
        isSystem: true,
      })),
      skipDuplicates: true,
    });
  }
  const stored = await db.permission.count({
    where: { role: { in: [...ALL_ROLES] } },
  });
  if (stored >= ALL_ROLES.length * ALL_RESOURCES.length * ALL_ACTIONS.length)
    return;
  await db.permission.createMany({
    data: ALL_ROLES.flatMap((role) =>
      ALL_RESOURCES.flatMap((resource) =>
        ALL_ACTIONS.map((action) => ({
          role,
          resource,
          action,
          allowed: isDefaultAllowed(role, resource, action),
        })),
      ),
    ),
    skipDuplicates: true,
  });
}

let templatesReady: Promise<void> | null = null;
/** Runs ensureRoleTemplates once per server process (after a deploy that adds roles or resources). */
export function ensureRoleTemplatesOnce() {
  templatesReady ??= ensureRoleTemplates().catch((error) => {
    templatesReady = null;
    throw error;
  });
  return templatesReady;
}
