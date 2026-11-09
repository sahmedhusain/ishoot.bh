import type { RoleKey } from "./permissions";

export const DATA_SCOPE_AREAS = [
  "deals",
  "requests",
  "expenses",
  "claims",
  "leave",
] as const;
export type DataScopeArea = (typeof DATA_SCOPE_AREAS)[number];

export const DATA_SCOPES = ["own", "department", "all"] as const;
export type DataScope = (typeof DATA_SCOPES)[number];

export const isDataScopeArea = (value: unknown): value is DataScopeArea =>
  typeof value === "string" &&
  (DATA_SCOPE_AREAS as readonly string[]).includes(value);
export const isDataScope = (value: unknown): value is DataScope =>
  typeof value === "string" &&
  (DATA_SCOPES as readonly string[]).includes(value);

export const DEFAULT_DATA_SCOPES: Partial<
  Record<RoleKey, Partial<Record<DataScopeArea, DataScope>>>
> = {
  department_manager: {
    deals: "department",
    requests: "department",
    expenses: "department",
    claims: "department",
    leave: "department",
  },
  delivery_coordinator: { requests: "department" },
  procurement_officer: { expenses: "department" },
  employee: { claims: "own", leave: "own" },
  driver: { claims: "own", leave: "own" },
};

export const defaultDataScope = (
  role: string,
  area: DataScopeArea,
): DataScope =>
  role === "super_admin"
    ? "all"
    : (DEFAULT_DATA_SCOPES[role as RoleKey]?.[area] ?? "all");
