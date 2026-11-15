import { serviceFetch } from "./service-fetch";

export type ServiceSchema =
  | "identity"
  | "system"
  | "hr"
  | "itsm"
  | "finance"
  | "sales"
  | "commerce"
  | "workflow"
  | "inventory"
  | "cms"
  | "notify"
  | "delivery";

const SERVICE_PREFIX: Record<ServiceSchema, string> = {
  identity: "/v1/identity/admin",
  system: "/v1/system",
  hr: "/v1/hr",
  itsm: "/v1/itsm/requests",
  finance: "/v1/finance",
  sales: "/v1/sales",
  commerce: "/v1/commerce",
  workflow: "/v1/workflow",
  inventory: "/v1/inventory",
  cms: "/v1/cms/desk",
  notify: "/v1/notify",
  delivery: "/v1/delivery",
};

export function listTableRows<T = Record<string, any>>(
  service: ServiceSchema,
  table: string,
  orderBy?: string,
  token?: string,
): Promise<T[]> {
  const qs = orderBy ? `?orderBy=${encodeURIComponent(orderBy)}` : "";
  return serviceFetch<T[]>(
    `${SERVICE_PREFIX[service]}/tables/${encodeURIComponent(table)}${qs}`,
    {},
    token,
  );
}

export function upsertTableRow<T = Record<string, any>>(
  service: ServiceSchema,
  table: string,
  row: Record<string, any>,
  token?: string,
): Promise<T> {
  return serviceFetch<T>(
    `${SERVICE_PREFIX[service]}/tables/${encodeURIComponent(table)}`,
    { method: "POST", body: JSON.stringify(row) },
    token,
  );
}

export function deleteTableRow(
  service: ServiceSchema,
  table: string,
  id: string,
  token?: string,
): Promise<void> {
  return serviceFetch<void>(
    `${SERVICE_PREFIX[service]}/tables/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );
}
