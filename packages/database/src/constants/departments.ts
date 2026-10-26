// The department catalogue a company picks from (setup wizard, Settings → Departments). Runtime-free.
// Names live in the admin copy (`departmentCatalogue.<key>`), so a department created from the catalogue reads
// correctly in both languages; the company can rename it afterwards.

export const DEPARTMENT_CATALOGUE = [
  "management",
  "finance",
  "hr",
  "sales",
  "marketing",
  "pr",
  "legal",
  "procurement",
  "warehouse",
  "delivery",
  "customer_service",
  "operations",
  "it",
  "administration",
] as const;
export type DepartmentKey = (typeof DEPARTMENT_CATALOGUE)[number];

export const isDepartmentKey = (value: unknown): value is DepartmentKey =>
  typeof value === "string" &&
  (DEPARTMENT_CATALOGUE as readonly string[]).includes(value);

/** Short codes for catalogue departments (Department.code is unique). */
export const DEPARTMENT_CODES: Record<DepartmentKey, string> = {
  management: "MGMT",
  finance: "FIN",
  hr: "HR",
  sales: "SALES",
  marketing: "MKT",
  pr: "PR",
  legal: "LEGAL",
  procurement: "PROC",
  warehouse: "WH",
  delivery: "DLV",
  customer_service: "CS",
  operations: "OPS",
  it: "IT",
  administration: "ADMIN",
};

const CORE: DepartmentKey[] = [
  "management",
  "finance",
  "hr",
  "sales",
  "marketing",
  "operations",
  "administration",
];
const STORE: DepartmentKey[] = [
  "management",
  "finance",
  "hr",
  "sales",
  "marketing",
  "procurement",
  "warehouse",
  "delivery",
  "customer_service",
  "it",
];

/** Departments each business activity starts with (website-presets.ts BUSINESS_ACTIVITIES). */
export const ACTIVITY_DEPARTMENTS: Record<string, readonly DepartmentKey[]> = {
  media: [...CORE, "pr"],
  agency: [...CORE, "pr", "it"],
  products: STORE,
  food: [
    "management",
    "finance",
    "hr",
    "operations",
    "procurement",
    "warehouse",
    "delivery",
    "customer_service",
    "marketing",
  ],
  services: [...CORE, "customer_service"],
  real_estate: [...CORE, "legal", "customer_service"],
  construction: [...CORE, "procurement", "warehouse", "legal"],
  education: [...CORE, "customer_service", "it"],
  healthcare: [...CORE, "procurement", "warehouse", "customer_service"],
  events: [...CORE, "pr", "procurement"],
  online_store: STORE,
  beauty: [
    "management",
    "finance",
    "hr",
    "sales",
    "marketing",
    "operations",
    "customer_service",
    "procurement",
  ],
  fitness: [
    "management",
    "finance",
    "hr",
    "sales",
    "marketing",
    "operations",
    "customer_service",
  ],
  automotive: [...CORE, "procurement", "warehouse", "customer_service"],
  logistics: [
    "management",
    "finance",
    "hr",
    "sales",
    "operations",
    "delivery",
    "warehouse",
    "customer_service",
    "it",
  ],
  travel: [...CORE, "customer_service"],
  hotel: [...CORE, "procurement", "customer_service"],
  law_firm: [
    "management",
    "finance",
    "hr",
    "legal",
    "marketing",
    "administration",
    "it",
  ],
  nonprofit: [
    "management",
    "finance",
    "hr",
    "pr",
    "marketing",
    "operations",
    "administration",
  ],
  pharmacy: [
    "management",
    "finance",
    "hr",
    "sales",
    "procurement",
    "warehouse",
    "delivery",
    "customer_service",
  ],
  manufacturing: [...CORE, "procurement", "warehouse", "delivery", "it"],
  it_software: [...CORE, "customer_service", "it"],
  other: CORE,
};

export function activityDepartments(
  activity: string | null | undefined,
): readonly DepartmentKey[] {
  return ACTIVITY_DEPARTMENTS[activity ?? ""] ?? ACTIVITY_DEPARTMENTS.other;
}

/** The role templates (constants/permissions) that usually work in each catalogue department, for the wizard. */
export const DEPARTMENT_ROLES: Record<DepartmentKey, readonly string[]> = {
  management: ["department_manager"],
  finance: ["finance_manager", "accountant"],
  hr: ["hr_manager", "hr_officer"],
  sales: ["sales_manager", "sales"],
  marketing: ["marketing", "editor"],
  pr: ["pr_officer"],
  legal: ["legal_counsel"],
  procurement: ["procurement_officer"],
  warehouse: ["warehouse_keeper"],
  delivery: ["delivery_coordinator", "driver"],
  customer_service: ["customer_service"],
  operations: ["operations_manager", "project_lead"],
  it: ["admin"],
  administration: ["employee"],
};

/** Roles every company has, whatever its departments. */
export const BASE_ROLES = [
  "super_admin",
  "admin",
  "employee",
  "viewer",
] as const;
