import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import type { Coupon, SalesOrder, SalesOrderLine, StoreSettings } from "./commerce";

async function headers(token?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const auth = token ?? (await serviceToken());
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

export async function getStoreApiSettings(token?: string): Promise<StoreSettings> {
  const res = await fetch(`${apiUrl()}/v1/store/settings`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listStoreApiCoupons(token?: string): Promise<Coupon[]> {
  const res = await fetch(`${apiUrl()}/v1/store/coupons`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getStoreApiCoupon(code: string, token?: string): Promise<Coupon> {
  const res = await fetch(`${apiUrl()}/v1/store/coupons/${encodeURIComponent(code)}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function placeStoreApiOrder(
  input: {
    order: Partial<SalesOrder>;
    lines: Partial<SalesOrderLine>[];
  },
  token?: string,
): Promise<SalesOrder> {
  const res = await fetch(`${apiUrl()}/v1/store/orders`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getStoreApiOrder(id: string, token?: string): Promise<SalesOrder> {
  const res = await fetch(`${apiUrl()}/v1/store/orders/${encodeURIComponent(id)}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}
