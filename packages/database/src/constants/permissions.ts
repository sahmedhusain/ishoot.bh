// Single source of truth for the permission model. Imported by queries, seed, bootstrap and the Roles UI.
// Keep this file free of runtime dependencies (no db) so client components and scripts can import it.

export const ALL_RESOURCES = [
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
  "self_service",
  "social",
  "assets",
] as const;

export const ALL_ACTIONS = [
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
] as const;

export const ALL_ROLES = [
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
] as const;

export type PermissionResource = (typeof ALL_RESOURCES)[number];
export type PermissionAction = (typeof ALL_ACTIONS)[number];
export type RoleKey = (typeof ALL_ROLES)[number];
export type PermissionKey = `${PermissionResource}:${PermissionAction}`;
export type PermissionMap = Record<string, boolean>;

export const permissionKey = (resource: PermissionResource, action: PermissionAction): PermissionKey =>
  `${resource}:${action}`;

/** Every staff member can view their own HR records and file their own requests. */
const SELF_SERVICE: PermissionAction[] = ["read", "create"];
const CRUD: PermissionAction[] = ["read", "write", "create", "edit", "delete"];

export const DEFAULT_ROLE_RULES: Record<RoleKey, Partial<Record<PermissionResource, PermissionAction[]>>> = {
  super_admin: Object.fromEntries(ALL_RESOURCES.map((resource) => [resource, [...ALL_ACTIONS]])),
  admin: {
    support: CRUD,
    reviews: CRUD,
    faqs: CRUD,
    stats: CRUD,
    invoices: ["read", "write", "create", "edit", "export"],
    payments: ["read", "write", "create", "edit", "export"],
    expenses: ["read", "write", "create", "edit", "export"],
    finance_analytics: ["read", "export"],
    deals: [...CRUD, "export"],
    contacts: [...CRUD, "export"],
    leads: [...CRUD, "export"],
    contracts: ["read", "write", "create", "edit", "export"],
    banners: CRUD,
    portfolio: CRUD,
    clients: CRUD,
    equipment: CRUD,
    calendar: CRUD,
    users: ["read", "write", "create", "edit"],
    settings: ["read", "write", "create", "edit"],
    audit_logs: ["read"],
    moms: [...CRUD, "export", "approve"],
    requests: [...CRUD, "export", "assign", "approve"],
    quotations: ["read", "write", "create", "edit", "export"],
    employees: ["read", "write", "create", "edit", "assign", "export", "approve"],
    benefits: ["read", "write", "create", "edit"],
    reports: ["read", "export"],
    profile_changes: ["read", "approve"],
    self_service: SELF_SERVICE,
    social: [...CRUD, "export"],
    assets: [...CRUD, "export", "approve"],
  },
  finance_manager: {
    invoices: ["read", "write", "create", "edit", "export"],
    payments: ["read", "write", "create", "edit", "export"],
    expenses: ["read", "write", "create", "edit", "export", "approve"],
    finance_analytics: ["read", "export"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
    calendar: ["read"],
    moms: ["read"],
    requests: ["read", "write", "create", "edit"],
    quotations: ["read", "write", "create", "edit", "export"],
    employees: ["read"],
    payroll: ["read", "write", "create", "edit", "issue_send"],
    reports: ["read", "export"],
    self_service: SELF_SERVICE,
    assets: ["read", "export", "approve"],
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
    payroll: ["read", "issue_send"],
    reports: ["read", "export"],
    self_service: SELF_SERVICE,
    assets: ["read"],
  },
  production_manager: {
    deals: ["read", "write", "create", "edit", "export"],
    contacts: ["read", "write", "create", "edit"],
    leads: ["read", "write", "create", "edit"],
    contracts: ["read", "write", "create", "edit"],
    equipment: ["read", "write", "create", "edit"],
    moms: ["read", "write", "create", "edit", "export", "approve"],
    requests: ["read", "write", "create", "edit", "assign", "approve"],
    calendar: CRUD,
    portfolio: ["read"],
    invoices: ["read"],
    quotations: ["read"],
    employees: ["read"],
    self_service: SELF_SERVICE,
    assets: ["read", "write", "create", "edit"],
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
    self_service: SELF_SERVICE,
  },
  sales: {
    deals: [...CRUD, "export"],
    contacts: [...CRUD, "export"],
    leads: [...CRUD, "export"],
    contracts: ["read", "write", "create", "edit"],
    calendar: ["read", "write", "create", "edit"],
    invoices: ["read"],
    quotations: ["read", "write", "create", "edit", "export"],
    requests: ["read", "write", "create", "edit"],
    self_service: SELF_SERVICE,
  },
  marketing: {
    banners: CRUD,
    portfolio: CRUD,
    clients: CRUD,
    leads: ["read", "write", "create", "edit"],
    calendar: ["read", "write", "create", "edit"],
    equipment: ["read"],
    requests: ["read", "write", "create", "edit"],
    self_service: SELF_SERVICE,
    social: [...CRUD, "export"],
  },
  editor: {
    portfolio: ["read", "write", "create", "edit"],
    banners: ["read"],
    equipment: ["read"],
    calendar: ["read"],
    requests: ["read"],
    self_service: SELF_SERVICE,
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
    self_service: SELF_SERVICE,
  },
};

// Feature toggles limit ordinary roles; Super Admin retains administrative access.
export const RESOURCE_FEATURES: Partial<Record<PermissionResource, string>> = {
  contacts: "crm_deals", deals: "crm_deals", leads: "crm_deals", moms: "crm_deals", requests: "crm_deals", contracts: "crm_deals",
  invoices: "invoicing", payments: "invoicing", expenses: "invoicing", finance_analytics: "invoicing", quotations: "invoicing", reports: "invoicing",
  calendar: "calendar", banners: "cms", portfolio: "cms", clients: "cms", faqs: "cms", stats: "cms",
  equipment: "equipment", reviews: "reviews",
  employees: "hrms", payroll: "payroll", benefits: "hrms", profile_changes: "hrms", self_service: "hrms",
};

/** Roles matrix layout. Every resource must appear exactly once (checked by scripts/check-permissions.cjs). */
export const PERMISSION_GROUPS: ReadonlyArray<{ key: string; resources: readonly PermissionResource[] }> = [
  { key: "finance", resources: ["invoices", "quotations", "payments", "expenses", "finance_analytics", "reports"] },
  { key: "crm", resources: ["deals", "contacts", "leads", "contracts", "requests", "moms", "support"] },
  { key: "hr", resources: ["employees", "payroll", "benefits", "profile_changes", "self_service"] },
  { key: "cms", resources: ["banners", "portfolio", "clients", "equipment", "reviews", "faqs", "stats", "social"] },
  { key: "operations", resources: ["calendar", "assets"] },
  { key: "administration", resources: ["users", "settings", "audit_logs"] },
];

/** Default grant for a role, used by seed/bootstrap and the "reset to defaults" action. */
export function isDefaultAllowed(role: string, resource: PermissionResource, action: PermissionAction): boolean {
  if (role === "super_admin") return true;
  return (DEFAULT_ROLE_RULES[role as RoleKey]?.[resource] ?? []).includes(action);
}
