export const ALL_SIDEBAR_GROUPS = [
  "workspace",
  "sales",
  "store",
  "products",
  "procurement",
  "delivery",
  "work",
  "operations",
  "finance",
  "people",
  "personal",
  "communications",
  "marketing",
  "legal",
  "content",
  "administration",
] as const;

export type SidebarGroupId = (typeof ALL_SIDEBAR_GROUPS)[number];

export type DesignationTier =
  | "executive_director"
  | "department_head"
  | "team_lead"
  | "specialist_officer"
  | "field_operations"
  | "support_coordinator";

export type SidebarPresetId =
  | "role_default"
  | "executive_suite"
  | "finance_desk"
  | "hr_people_desk"
  | "sales_crm_desk"
  | "supply_inventory"
  | "logistics_fleet"
  | "marketing_digital"
  | "legal_governance"
  | "minimal_essential";

export interface SidebarCustomizationConfig {
  presetId: SidebarPresetId;
  departmentKey?: string;
  designationTier?: DesignationTier;
  sectionOrder: string[];
  hiddenSections: string[];
  pinnedHrefs: string[];
}

const ROLE_PRIORITIES: Record<string, string[]> = {
  super_admin: [
    "workspace",
    "sales",
    "store",
    "finance",
    "people",
    "products",
    "procurement",
    "delivery",
    "work",
    "operations",
    "marketing",
    "legal",
    "communications",
    "content",
    "personal",
    "administration",
  ],
  admin: [
    "workspace",
    "people",
    "operations",
    "work",
    "finance",
    "sales",
    "store",
    "products",
    "procurement",
    "delivery",
    "communications",
    "marketing",
    "legal",
    "content",
    "personal",
    "administration",
  ],
  finance_manager: [
    "workspace",
    "finance",
    "procurement",
    "store",
    "sales",
    "people",
    "personal",
    "communications",
  ],
  accountant: [
    "workspace",
    "finance",
    "procurement",
    "store",
    "personal",
    "communications",
  ],
  sales_manager: [
    "workspace",
    "sales",
    "store",
    "products",
    "marketing",
    "finance",
    "work",
    "communications",
    "personal",
  ],
  sales: [
    "workspace",
    "sales",
    "store",
    "products",
    "work",
    "personal",
    "communications",
    "operations",
  ],
  operations_manager: [
    "workspace",
    "operations",
    "work",
    "products",
    "procurement",
    "delivery",
    "sales",
    "people",
    "personal",
    "communications",
  ],
  project_lead: [
    "workspace",
    "operations",
    "work",
    "sales",
    "products",
    "personal",
    "communications",
  ],
  department_manager: [
    "workspace",
    "work",
    "people",
    "operations",
    "sales",
    "finance",
    "communications",
    "personal",
  ],
  hr_manager: [
    "workspace",
    "people",
    "work",
    "communications",
    "personal",
    "operations",
  ],
  hr_officer: [
    "workspace",
    "people",
    "communications",
    "personal",
    "work",
  ],
  pr_officer: [
    "workspace",
    "marketing",
    "content",
    "communications",
    "work",
    "personal",
  ],
  legal_counsel: [
    "workspace",
    "legal",
    "communications",
    "sales",
    "procurement",
    "work",
    "personal",
  ],
  procurement_officer: [
    "workspace",
    "operations",
    "procurement",
    "products",
    "finance",
    "work",
    "personal",
    "communications",
  ],
  warehouse_keeper: [
    "workspace",
    "products",
    "delivery",
    "procurement",
    "operations",
    "work",
    "personal",
    "communications",
  ],
  delivery_coordinator: [
    "workspace",
    "delivery",
    "store",
    "products",
    "operations",
    "work",
    "personal",
    "communications",
  ],
  driver: [
    "workspace",
    "delivery",
    "work",
    "personal",
    "communications",
  ],
  customer_service: [
    "workspace",
    "store",
    "sales",
    "delivery",
    "products",
    "work",
    "communications",
    "personal",
  ],
  employee: [
    "workspace",
    "work",
    "personal",
    "communications",
  ],
  editor: [
    "workspace",
    "content",
    "marketing",
    "work",
    "operations",
    "personal",
    "communications",
  ],
  marketing: [
    "workspace",
    "content",
    "marketing",
    "sales",
    "store",
    "work",
    "communications",
    "personal",
  ],
  viewer: [
    "workspace",
    "communications",
    "personal",
  ],
};

export const DEPARTMENT_SIDEBAR_PRIORITIES: Record<string, string[]> = {
  executive: ["workspace", "finance", "sales", "store", "people", "operations", "work", "communications", "administration"],
  hr: ["workspace", "people", "personal", "communications", "work", "operations"],
  finance: ["workspace", "finance", "procurement", "store", "sales", "people", "personal", "communications"],
  sales: ["workspace", "sales", "store", "products", "marketing", "work", "finance", "communications", "personal"],
  marketing: ["workspace", "marketing", "content", "sales", "store", "work", "communications", "personal"],
  pr: ["workspace", "marketing", "content", "communications", "work", "personal"],
  legal: ["workspace", "legal", "communications", "sales", "procurement", "work", "personal"],
  procurement: ["workspace", "procurement", "products", "finance", "operations", "work", "communications", "personal"],
  inventory: ["workspace", "products", "procurement", "delivery", "store", "operations", "work", "personal"],
  delivery: ["workspace", "delivery", "store", "products", "operations", "work", "personal", "communications"],
  customer_service: ["workspace", "store", "sales", "delivery", "products", "work", "communications", "personal"],
  operations: ["workspace", "operations", "work", "products", "procurement", "delivery", "sales", "people", "communications"],
  it: ["workspace", "administration", "content", "operations", "work", "communications", "personal"],
  administration: ["workspace", "administration", "people", "operations", "communications", "finance", "work", "personal"],
};

export const DESIGNATION_SIDEBAR_PRIORITIES: Record<DesignationTier, string[]> = {
  executive_director: ["workspace", "finance", "sales", "store", "people", "operations", "work", "legal", "communications", "administration"],
  department_head: ["workspace", "work", "people", "operations", "finance", "sales", "communications", "personal"],
  team_lead: ["workspace", "work", "operations", "sales", "store", "products", "people", "communications", "personal"],
  specialist_officer: ["workspace", "work", "sales", "finance", "products", "procurement", "marketing", "legal", "personal", "communications"],
  field_operations: ["workspace", "delivery", "products", "operations", "work", "personal", "communications"],
  support_coordinator: ["workspace", "store", "sales", "delivery", "work", "communications", "personal"],
};

export const SIDEBAR_PRESETS: Record<
  Exclude<SidebarPresetId, "role_default">,
  { order: string[]; hidden?: string[]; defaultPinned?: string[] }
> = {
  executive_suite: {
    order: ["workspace", "finance", "sales", "store", "people", "operations", "work", "legal", "marketing", "communications", "administration"],
    defaultPinned: ["/dashboard", "/dashboard/approvals", "/dashboard/analytics", "/dashboard/crm/deals", "/dashboard/reports"],
  },
  finance_desk: {
    order: ["workspace", "finance", "procurement", "store", "sales", "people", "personal", "communications"],
    defaultPinned: ["/dashboard", "/dashboard/invoices", "/dashboard/payments", "/dashboard/expenses", "/dashboard/analytics"],
  },
  hr_people_desk: {
    order: ["workspace", "people", "personal", "communications", "work", "operations"],
    defaultPinned: ["/dashboard", "/dashboard/hr/employees", "/dashboard/hr/attendance", "/dashboard/hr/leave", "/dashboard/payroll"],
  },
  sales_crm_desk: {
    order: ["workspace", "sales", "store", "products", "marketing", "work", "finance", "communications", "personal"],
    defaultPinned: ["/dashboard", "/dashboard/crm/deals", "/dashboard/crm/contacts", "/dashboard/quotations", "/dashboard/requests"],
  },
  supply_inventory: {
    order: ["workspace", "products", "procurement", "delivery", "store", "operations", "work", "finance", "personal"],
    defaultPinned: ["/dashboard", "/dashboard/products", "/dashboard/inventory", "/dashboard/procurement/orders", "/dashboard/inventory/warehouses"],
  },
  logistics_fleet: {
    order: ["workspace", "delivery", "store", "products", "operations", "work", "personal", "communications"],
    defaultPinned: ["/dashboard", "/dashboard/delivery", "/dashboard/delivery/routes", "/dashboard/delivery/fleet", "/dashboard/driver"],
  },
  marketing_digital: {
    order: ["workspace", "marketing", "content", "sales", "store", "work", "communications", "personal"],
    defaultPinned: ["/dashboard", "/dashboard/marketing", "/dashboard/cms/pages", "/dashboard/cms/portfolio", "/dashboard/social-analytics"],
  },
  legal_governance: {
    order: ["workspace", "legal", "communications", "administration", "sales", "procurement", "work", "personal"],
    defaultPinned: ["/dashboard", "/dashboard/legal", "/dashboard/archive", "/dashboard/approvals", "/dashboard/audit-logs"],
  },
  minimal_essential: {
    order: ["workspace", "work", "personal", "communications", "sales", "finance"],
    hidden: ["marketing", "legal", "content", "procurement", "delivery"],
    defaultPinned: ["/dashboard", "/dashboard/tasks", "/dashboard/calendar", "/dashboard/approvals"],
  },
};

/** Role, department, and designation determine priority, while resource permissions always decide visibility. */
export function sidebarGroupOrder(
  role?: string,
  departmentKey?: string,
  designationTier?: DesignationTier,
  customOrder?: string[],
): string[] {
  const custom = Array.isArray(customOrder)
    ? customOrder.filter((id) => (ALL_SIDEBAR_GROUPS as readonly string[]).includes(id))
    : [];
  const deptPriority = departmentKey ? (DEPARTMENT_SIDEBAR_PRIORITIES[departmentKey] ?? []) : [];
  const desigPriority = designationTier ? (DESIGNATION_SIDEBAR_PRIORITIES[designationTier] ?? []) : [];
  const rolePriority = ROLE_PRIORITIES[role ?? ""] ?? ["workspace", "work", "personal", "communications"];

  return Array.from(
    new Set([
      "workspace",
      ...custom,
      ...deptPriority,
      ...desigPriority,
      ...rolePriority,
      ...ALL_SIDEBAR_GROUPS,
    ]),
  );
}

export function defaultSidebarCustomization(
  role?: string,
  departmentKey?: string,
  designationTier?: DesignationTier,
): SidebarCustomizationConfig {
  return {
    presetId: "role_default",
    departmentKey,
    designationTier,
    sectionOrder: sidebarGroupOrder(role, departmentKey, designationTier),
    hiddenSections: [],
    pinnedHrefs: [],
  };
}

export function normalizeSidebarCustomization(
  raw: unknown,
  role?: string,
): SidebarCustomizationConfig {
  const fallback = defaultSidebarCustomization(role);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const obj = raw as Record<string, unknown>;
  const presetId =
    typeof obj.presetId === "string" &&
    (obj.presetId === "role_default" || obj.presetId in SIDEBAR_PRESETS)
      ? (obj.presetId as SidebarPresetId)
      : "role_default";
  const departmentKey = typeof obj.departmentKey === "string" ? obj.departmentKey : undefined;
  const designationTier =
    typeof obj.designationTier === "string" && obj.designationTier in DESIGNATION_SIDEBAR_PRIORITIES
      ? (obj.designationTier as DesignationTier)
      : undefined;
  const rawOrder = Array.isArray(obj.sectionOrder)
    ? obj.sectionOrder.filter((id): id is string => typeof id === "string")
    : [];
  const sectionOrder = sidebarGroupOrder(role, departmentKey, designationTier, rawOrder);
  const hiddenSections = Array.isArray(obj.hiddenSections)
    ? obj.hiddenSections.filter(
        (id): id is string => typeof id === "string" && id !== "workspace",
      )
    : [];
  const pinnedHrefs = Array.isArray(obj.pinnedHrefs)
    ? Array.from(
        new Set(
          obj.pinnedHrefs.filter((href): href is string => typeof href === "string" && href.startsWith("/")),
        ),
      ).slice(0, 8)
    : [];

  return {
    presetId,
    departmentKey,
    designationTier,
    sectionOrder,
    hiddenSections,
    pinnedHrefs,
  };
}

export function activeNavigationHref(
  hrefs: string[],
  pathname: string,
): string | undefined {
  return hrefs
    .filter((href) => {
      const path = href.split("?")[0];
      return (
        pathname === path ||
        (path !== "/dashboard" && pathname.startsWith(path + "/"))
      );
    })
    .sort((a, b) => b.split("?")[0].length - a.split("?")[0].length)[0];
}
