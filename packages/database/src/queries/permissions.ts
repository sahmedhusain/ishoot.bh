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
  | "requests";

export type PermissionAction =
  "read" | "write" | "delete" | "export" | "approve";

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
];

export const ALL_ACTIONS: PermissionAction[] = [
  "read",
  "write",
  "delete",
  "export",
  "approve",
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
  super_admin: {
    invoices: ["read", "write", "delete", "export", "approve"],
    payments: ["read", "write", "delete", "export", "approve"],
    expenses: ["read", "write", "delete", "export", "approve"],
    finance_analytics: ["read", "write", "delete", "export", "approve"],
    deals: ["read", "write", "delete", "export", "approve"],
    contacts: ["read", "write", "delete", "export", "approve"],
    leads: ["read", "write", "delete", "export", "approve"],
    contracts: ["read", "write", "delete", "export", "approve"],
    banners: ["read", "write", "delete", "export", "approve"],
    portfolio: ["read", "write", "delete", "export", "approve"],
    clients: ["read", "write", "delete", "export", "approve"],
    equipment: ["read", "write", "delete", "export", "approve"],
    calendar: ["read", "write", "delete", "export", "approve"],
    users: ["read", "write", "delete", "export", "approve"],
    settings: ["read", "write", "delete", "export", "approve"],
    audit_logs: ["read", "write", "delete", "export", "approve"],
    moms: ["read", "write", "delete", "export", "approve"],
    requests: ["read", "write", "delete", "export", "approve"],
  },
  admin: {
    support: ["read", "write", "delete"],
    reviews: ["read", "write", "delete"],
    faqs: ["read", "write", "delete"],
    stats: ["read", "write", "delete"],
    invoices: ["read", "write", "export", "approve"],
    payments: ["read", "write", "export"],
    expenses: ["read", "write", "export"],
    finance_analytics: ["read", "export"],
    deals: ["read", "write", "delete", "export"],
    contacts: ["read", "write", "delete", "export"],
    leads: ["read", "write", "delete", "export"],
    contracts: ["read", "write", "export"],
    banners: ["read", "write", "delete"],
    portfolio: ["read", "write", "delete"],
    clients: ["read", "write", "delete"],
    equipment: ["read", "write", "delete"],
    calendar: ["read", "write", "delete"],
    users: ["read", "write"],
    settings: ["read", "write"],
    audit_logs: ["read"],
    moms: ["read", "write", "delete", "export", "approve"],
    requests: ["read", "write", "delete", "export", "approve"],
  },
  finance_manager: {
    invoices: ["read", "write", "export", "approve"],
    payments: ["read", "write", "export", "approve"],
    expenses: ["read", "write", "export", "approve"],
    finance_analytics: ["read", "export"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
    calendar: ["read"],
    moms: ["read"],
    requests: ["read", "write", "approve"],
  },
  accountant: {
    invoices: ["read", "write", "export"],
    payments: ["read", "write", "export"],
    expenses: ["read", "write", "export"],
    finance_analytics: ["read"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
    moms: ["read"],
    requests: ["read"],
  },
  production_manager: {
    deals: ["read", "write", "export"],
    contacts: ["read", "write"],
    leads: ["read", "write"],
    contracts: ["read", "write"],
    equipment: ["read", "write"],
    moms: ["read", "write", "export", "approve"],
    requests: ["read", "write", "approve"],
    calendar: ["read", "write", "delete"],
    portfolio: ["read"],
    invoices: ["read"],
  },
  producer: {
    deals: ["read", "write"],
    contacts: ["read", "write"],
    leads: ["read", "write"],
    contracts: ["read"],
    equipment: ["read", "write"],
    calendar: ["read", "write"],
    portfolio: ["read"],
  },
  sales: {
    deals: ["read", "write", "delete", "export"],
    contacts: ["read", "write", "delete", "export"],
    leads: ["read", "write", "delete", "export"],
    contracts: ["read", "write"],
    calendar: ["read", "write"],
    invoices: ["read"],
  },
  marketing: {
    banners: ["read", "write", "delete"],
    portfolio: ["read", "write", "delete"],
    clients: ["read", "write", "delete"],
    leads: ["read", "write"],
    calendar: ["read", "write"],
    equipment: ["read"],
  },
  editor: {
    portfolio: ["read", "write"],
    banners: ["read"],
    equipment: ["read"],
    calendar: ["read"],
  },
  viewer: {
    deals: ["read"],
    contacts: ["read"],
    leads: ["read"],
    portfolio: ["read"],
    clients: ["read"],
    equipment: ["read"],
    calendar: ["read"],
  },
};

export async function hasPermission(
  role: string,
  resource: PermissionResource,
  action: PermissionAction,
  userOverrides?: Record<string, boolean> | null,
): Promise<boolean> {
  if (role === "super_admin") return true;

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
  } catch (err) {
    console.error("Error checking permission from DB:", err);
    return false;
  }

  const roleRules = DEFAULT_ROLE_RULES[role as UserRole];
  if (!roleRules) return false;
  const allowedActions = roleRules[resource];
  return allowedActions ? allowedActions.includes(action) : false;
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
      allowed: p.allowed,
      created_at: p.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching permissions:", err);
    return [];
  }
}

export async function setPermission(
  role: string,
  resource: string,
  action: string,
  allowed: boolean,
): Promise<boolean> {
  try {
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
    return true;
  } catch (err) {
    console.error("Error upserting permission:", err);
    return false;
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
