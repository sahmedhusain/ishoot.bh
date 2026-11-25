import { apiError } from "./errors";
import { apiTimeoutMs, apiUrl } from "./config";
import { normalizeApiRecord } from "./normalize";
import { serviceToken } from "./service-token";

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
  identity: "/v1/identity",
  system: "/v1/system",
  hr: "/v1/hr",
  itsm: "/v1/itsm",
  finance: "/v1/finance",
  sales: "/v1/sales",
  commerce: "/v1/commerce",
  workflow: "/v1/workflow",
  inventory: "/v1/inventory",
  cms: "/v1/cms",
  notify: "/v1/notify",
  delivery: "/v1/delivery",
};

function dedupeUpsertRow(row: Record<string, unknown>): Record<string, unknown> {
  const byLower = new Map<string, string>();
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const lower = key.toLowerCase();
    const prev = byLower.get(lower);
    if (prev !== undefined) {
      delete out[prev];
    }
    byLower.set(lower, key);
    out[key] = value;
  }
  return out;
}

async function tableFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await serviceToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!response.ok) {
    throw await apiError(response);
  }
  return response;
}

export async function listTable<T = Record<string, unknown>>(
  service: ServiceSchema,
  table: string,
  orderBy?: string,
): Promise<T[]> {
  const qs = orderBy ? `?orderBy=${encodeURIComponent(orderBy)}` : "";
  const response = await tableFetch(
    `${SERVICE_PREFIX[service]}/tables/${encodeURIComponent(table)}${qs}`,
    { cache: "no-store" },
  );
  if (response.status === 204) return [];
  const rows = (await response.json()) as unknown;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => normalizeApiRecord(row)) as T[];
}

export async function upsertTable<T = Record<string, unknown>>(
  service: ServiceSchema,
  table: string,
  row: object,
): Promise<T> {
  const response = await tableFetch(
    `${SERVICE_PREFIX[service]}/tables/${encodeURIComponent(table)}`,
    {
      method: "POST",
      body: JSON.stringify(dedupeUpsertRow(row as Record<string, unknown>)),
    },
  );
  const data = await response.json();
  return normalizeApiRecord(data) as T;
}

export async function deleteTableRow(
  service: ServiceSchema,
  table: string,
  id: string,
): Promise<void> {
  await tableFetch(
    `${SERVICE_PREFIX[service]}/tables/${encodeURIComponent(table)}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
