import { apiTimeoutMs, apiUrl } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

export type CMSContentSnapshot = {
  id: string;
  draft: Record<string, unknown>;
  published: Record<string, unknown>;
  revision: number;
  publishedAt?: string | null;
  updatedAt: string;
};

export type CMSSocialLink = {
  id: string;
  platform: string;
  url: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
};

async function cmsFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const st = await serviceToken();
  if (st) {
    headers.set("Authorization", `Bearer ${st}`);
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
    }
    throw await apiError(res, errBody);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

export const getContentSnapshotForIT = (id = "main") =>
  cmsFetch<CMSContentSnapshot>(`/v1/cms/snapshots/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });

export const saveContentDraftForIT = (id: string, draft: Record<string, unknown>) =>
  cmsFetch<CMSContentSnapshot>(
    `/v1/cms/snapshots/${encodeURIComponent(id)}/draft`,
    {
      method: "PUT",
      body: JSON.stringify(draft),
    },
  );

export const publishContentSnapshotForIT = (id: string) =>
  cmsFetch<CMSContentSnapshot>(
    `/v1/cms/snapshots/${encodeURIComponent(id)}/publish`,
    {
      method: "POST",
    },
  );
