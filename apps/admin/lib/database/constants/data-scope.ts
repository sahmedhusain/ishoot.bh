// Which records a role sees in each area: its own, its department's (with sub-departments) or all of them.
// Runtime-free, so the Roles screen and the queries share one list.
import type { RoleKey } from "./permissions";

/** Areas whose lists and records follow a data scope. Later modules (tasks, orders, purchases, deliveries) add theirs. */
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

/**
 * Role template defaults; anything not listed sees every record its permissions allow. Roles that existed before
 * data scopes (sales, project lead…) keep seeing everything until the company narrows them in Settings → Roles.
 */
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
