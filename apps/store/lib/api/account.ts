import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import type { Customer, CustomerAddress, SalesOrder } from "./commerce";

async function headers(token?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const auth = token ?? (await serviceToken());
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

export async function getAccountCustomer(id: string, token?: string): Promise<Customer> {
  const res = await fetch(`${apiUrl()}/v1/account/customers/${encodeURIComponent(id)}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createAccountCustomer(input: Partial<Customer>, token?: string): Promise<Customer> {
  const res = await fetch(`${apiUrl()}/v1/account/customers`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listAccountAddresses(customerId: string, token?: string): Promise<CustomerAddress[]> {
  const res = await fetch(`${apiUrl()}/v1/account/customers/${encodeURIComponent(customerId)}/addresses`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listAccountOrders(customerId: string, token?: string): Promise<SalesOrder[]> {
  const res = await fetch(`${apiUrl()}/v1/account/orders?customerId=${encodeURIComponent(customerId)}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}
