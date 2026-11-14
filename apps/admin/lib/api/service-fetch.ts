import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

/** Execute an authenticated service request against the Go API and normalize keys. */
export async function serviceFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const st = await serviceToken();
    if (st) headers.set("Authorization", `Bearer ${st}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = undefined;
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return normalizeApiRecord(JSON.parse(text)) as T;
}

/** Build URL query suffix omitting empty filter parameters. */
export function buildQuery(
  params?: Record<string, string | boolean | number | undefined | null>,
): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, String(v));
    }
  }
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : "";
}
