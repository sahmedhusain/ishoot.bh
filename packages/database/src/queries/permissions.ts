import { db } from "../db";
import { Permission, UserRole } from "../types";

export type PermissionResource =
  | "invoices"
  | "payments"
  | "expenses"
  | "finance_analytics"
  | "deals"
  | "contacts"
  | "support"
  | "leads"
  | "contracts"
  | "banners"
  | "portfolio"
  | "clients"
  | "equipment"
  | "calendar"
  | "users"
  | "settings"
  | "audit_logs"
  | "reviews"
  | "faqs"
  | "stats"
  | "moms"
  | "requests"
  | "quotations"
  | "employees"
  | "payroll"
  | "benefits"
  | "reports"
  | "profile_changes";

export type PermissionAction =
  | "read"
  | "write"
  | "delete"
  | "export"
  | "approve"
  | "create"
  | "edit"
  | "assign"
  | "issue_send"
  | "manage_permissions"
  | "reset_credentials";

export const ALL_RESOURCES: PermissionResource[] = [
  "invoices",
  "payments",
  "expenses",
  "finance_analytics",
  "deals",
  "contacts",
  "leads",
  "support",
  "reviews",
  "faqs",
  "stats",
  "contracts",
  "banners",
  "portfolio",
  "clients",
  "equipment",
  "calendar",
  "users",
  "settings",
  "audit_logs",
  "moms",
  "requests",
  "quotations",
  "employees",
  "payroll",
  "benefits",
  "reports",
  "profile_changes",
];

export const ALL_ACTIONS: PermissionAction[] = [
  "read",
  "write",
  "delete",
  "export",
  "approve",
  "create",
  "edit",
  "assign",
  "issue_send",
  "manage_permissions",
  "reset_credentials",
];

export const ALL_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "finance_manager",
  "accountant",
  "production_manager",
  "producer",
  "sales",
  "marketing",
  "editor",
  "viewer",
];

export const DEFAULT_ROLE_RULES: Record<
  UserRole,
  Partial<Record<PermissionResource, PermissionAction[]>>
> = {
  super_admin: Object.fromEntries(
    ALL_RESOURCES.map((resource) => [resource, [...ALL_ACTIONS]]),
  ),
  admin: {
    support: ["read", "write", "create", "edit", "delete"],
    reviews: ["read", "write", "create", "edit", "delete"],
    faqs: ["read", "write", "create", "edit", "delete"],
    stats: ["read", "write", "create", "edit", "delete"],
    invoices: ["read", "write", "create", "edit", "export"],
    payments: ["read", "write", "create", "edit", "export"],
    expenses: ["read", "write", "create", "edit", "export"],
    finance_analytics: ["read", "export"],
    deals: ["read", "write", "create", "edit", "delete", "export"],
    contacts: ["read", "write", "create", "edit", "delete", "export"],
    leads: ["read", "write", "create", "edit", "delete", "export"],
    contracts: ["read", "write", "create", "edit", "export"],
    banners: ["read", "write", "create", "edit", "delete"],
    portfolio: ["read", "write", "create", "edit", "delete"],
    clients: ["read", "write", "create", "edit", "delete"],
    equipment: ["read", "write", "create", "edit", "delete"],
    calendar: ["read", "write", "create", "edit", "delete"],
    users: ["read", "write", "create", "edit"],
    settings: ["read", "write", "create", "edit"],
    audit_logs: ["read"],
    moms: ["read", "write", "create", "edit", "delete", "export", "approve"],
    requests: ["read", "write", "create", "edit", "delete", "export", "assign"],
    quotations: ["read", "write", "create", "edit", "export"],
    employees: ["read", "write", "create", "edit", "assign", "export", "approve"],
    benefits: ["read", "write", "create", "edit"],
    reports: ["read", "export"],
    profile_changes: ["read", "approve"],
  },
  finance_manager: {
    invoices: ["read", "write", "create", "edit", "export"],
    payments: ["read", "write", "create", "edit", "export"],
    expenses: ["read", "write", "create", "edit", "export"],
    finance_analytics: ["read", "export"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
    calendar: ["read"],
    moms: ["read"],
    requests: ["read", "write", "create", "edit"],
    quotations: ["read", "write", "create", "edit", "export"],
    payroll: ["read", "write", "create", "edit"],
    reports: ["read", "export"],
  },
  accountant: {
    invoices: ["read", "write", "create", "edit", "export"],
    payments: ["read", "write", "create", "edit", "export"],
    expenses: ["read", "write", "create", "edit", "export"],
    finance_analytics: ["read"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
    moms: ["read"],
    requests: ["read"],
    quotations: ["read", "export"],
    reports: ["read", "export"],
  },
  production_manager: {
    deals: ["read", "write", "create", "edit", "export"],
    contacts: ["read", "write", "create", "edit"],
    leads: ["read", "write", "create", "edit"],
    contracts: ["read", "write", "create", "edit"],
    equipment: ["read", "write", "create", "edit"],
    moms: ["read", "write", "create", "edit", "export", "approve"],
    requests: ["read", "write", "create", "edit", "assign"],
    calendar: ["read", "write", "create", "edit", "delete"],
    portfolio: ["read"],
    invoices: ["read"],
    quotations: ["read"],
    employees: ["read"],
  },
  producer: {
    deals: ["read", "write", "create", "edit"],
    contacts: ["read", "write", "create", "edit"],
    leads: ["read", "write", "create", "edit"],
    contracts: ["read"],
    equipment: ["read", "write", "create", "edit"],
    calendar: ["read", "write", "create", "edit"],
    portfolio: ["read"],
    requests: ["read", "write", "create", "edit"],
  },
  sales: {
    deals: ["read", "write", "create", "edit", "delete", "export"],
    contacts: ["read", "write", "create", "edit", "delete", "export"],
    leads: ["read", "write", "create", "edit", "delete", "export"],
    contracts: ["read", "write", "create", "edit"],
    calendar: ["read", "write", "create", "edit"],
    invoices: ["read"],
    quotations: ["read", "write", "create", "edit", "export"],
    requests: ["read", "write", "create", "edit"],
  },
  marketing: {
    banners: ["read", "write", "create", "edit", "delete"],
    portfolio: ["read", "write", "create", "edit", "delete"],
    clients: ["read", "write", "create", "edit", "delete"],
    leads: ["read", "write", "create", "edit"],
    calendar: ["read", "write", "create", "edit"],
    equipment: ["read"],
    requests: ["read", "write", "create", "edit"],
  },
  editor: {
    portfolio: ["read", "write", "create", "edit"],
    banners: ["read"],
    equipment: ["read"],
    calendar: ["read"],
    requests: ["read"],
  },
  viewer: {
    deals: ["read"],
    contacts: ["read"],
    leads: ["read"],
    portfolio: ["read"],
    clients: ["read"],
    equipment: ["read"],
    calendar: ["read"],
    requests: ["read"],
  },
};

// Feature toggles limit ordinary roles; Super Admin retains administrative access.
export const RESOURCE_FEATURES: Partial<Record<PermissionResource, string>> = {
  contacts: "crm_deals", deals: "crm_deals", leads: "crm_deals", moms: "crm_deals", requests: "crm_deals", contracts: "crm_deals",
  invoices: "invoicing", payments: "invoicing", expenses: "invoicing", finance_analytics: "invoicing", quotations: "invoicing", reports: "invoicing",
  calendar: "calendar", banners: "cms", portfolio: "cms", clients: "cms", faqs: "cms", stats: "cms",
  equipment: "equipment", reviews: "reviews",
  employees: "hrms", payroll: "payroll", benefits: "hrms", profile_changes: "hrms",
};
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

  // Confirmed product decision: Super Admin approves quotations, invoices, and payroll.
  // Having a generic approve grant does not make another role an eligible financial approver.
  if ((resource === "invoices" || resource === "quotations" || resource === "payroll") && action === "approve") {
    return false;
  }

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
    const roleRules = DEFAULT_ROLE_RULES[role] || {};
    for (const resource of ALL_RESOURCES) {
      const allowedActions = roleRules[resource] || [];
      for (const action of ALL_ACTIONS) {
        const allowed =
          role === "super_admin" ? true : allowedActions.includes(action);
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
    // Financial approval restriction for non-Super Admin
    if (resource === "invoices" || resource === "quotations" || resource === "payroll") {
      permissions[`${resource}:approve`] = false;
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
