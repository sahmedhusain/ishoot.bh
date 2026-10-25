export type PermissionResource =
  | "invoices"
  | "payments"
  | "expenses"
  | "finance_analytics"
  | "deals"
  | "contacts"
  | "leads"
  | "contracts"
  | "banners"
  | "portfolio"
  | "clients"
  | "equipment"
  | "calendar"
  | "users"
  | "settings"
  | "audit_logs";

export type PermissionAction =
  | "read"
  | "write"
  | "delete"
  | "export"
  | "approve";

export interface RoleConfig {
  value: string;
  translationKey: string;
  badgeColorClass: string;
}

export const USER_ROLES: RoleConfig[] = [
  { value: "super_admin", translationKey: "security.roles.superAdmin", badgeColorClass: "text-red-400 bg-red-500/10 border-red-500/20" },
  { value: "admin", translationKey: "security.roles.admin", badgeColorClass: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { value: "finance_manager", translationKey: "security.roles.financeManager", badgeColorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { value: "accountant", translationKey: "security.roles.accountant", badgeColorClass: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  { value: "sales", translationKey: "security.roles.sales", badgeColorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { value: "marketing", translationKey: "security.roles.marketing", badgeColorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "operations_manager", translationKey: "security.roles.productionManager", badgeColorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  { value: "project_lead", translationKey: "security.roles.producer", badgeColorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  { value: "editor", translationKey: "security.roles.editor", badgeColorClass: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  { value: "viewer", translationKey: "security.roles.viewer", badgeColorClass: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
];

export const ROLE_PERMISSION_RULES: Record<
  string,
  Partial<Record<PermissionResource, PermissionAction[]>>
> = {
  super_admin: {},
  admin: {
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
  },
  accountant: {
    invoices: ["read", "write", "export"],
    payments: ["read", "write", "export"],
    expenses: ["read", "write", "export"],
    finance_analytics: ["read"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
  },
  operations_manager: {
    deals: ["read", "write", "export"],
    contacts: ["read", "write"],
    leads: ["read", "write"],
    contracts: ["read", "write"],
    equipment: ["read", "write"],
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
