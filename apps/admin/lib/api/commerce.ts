import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

export type Customer = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddress = {
  id: string;
  customerId: string;
  addressType: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type StoreSettings = {
  id: string;
  currency: string;
  taxInclusive: boolean;
  defaultTaxRate: string;
  minimumOrderAmount: string;
  freeShippingThreshold: string;
};

export type Coupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
};

export type SalesOrder = {
  id: string;
  number: string;
  customerId?: string | null;
  contactId?: string | null;
  email?: string | null;
  name: string;
  phone?: string | null;
  channel: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfilment: string;
  shippingAddress?: Record<string, unknown> | null;
  subtotal: string;
  discountAmount: string;
  couponCode?: string | null;
  vatAmount: string;
  deliveryFee: string;
  total: string;
  amountPaid: string;
  amountRefunded: string;
  currency: string;
  locale: string;
  note?: string | null;
  warehouseId?: string | null;
  invoiceId?: string | null;
  createdById?: string | null;
  placedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
};

export type SalesOrderLine = {
  id: string;
  orderId: string;
  productId: string;
  variantKey: string;
  sku: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatExempt: boolean;
  lineTotal: string;
  locationId?: string | null;
  returnedQuantity: string;
  sortOrder: number;
};

export type SalesOrderEvent = {
  id: string;
  orderId: string;
  kind: string;
  status?: string | null;
  note?: string | null;
  amount?: string | null;
  byId?: string | null;
  createdAt: string;
};

async function headers(token?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const auth = token ?? (await serviceToken());
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

async function commFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const h = await headers(token);
  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: { ...h, ...(options.headers as any) },
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json();
  return normalizeApiRecord(data) as T;
}

export async function listCustomers(token?: string): Promise<Customer[]> {
  return commFetch<Customer[]>("/v1/commerce/customers", {}, token);
}

export async function getCustomer(id: string, token?: string): Promise<Customer> {
  return commFetch<Customer>(`/v1/commerce/customers/${encodeURIComponent(id)}`, {}, token);
}

export async function createCustomer(input: Partial<Customer>, token?: string): Promise<Customer> {
  return commFetch<Customer>("/v1/commerce/customers", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listCustomerAddresses(customerId: string, token?: string): Promise<CustomerAddress[]> {
  return commFetch<CustomerAddress[]>(`/v1/commerce/customers/${encodeURIComponent(customerId)}/addresses`, {}, token);
}

export async function getStoreSettings(token?: string): Promise<StoreSettings> {
  return commFetch<StoreSettings>("/v1/commerce/settings", {}, token);
}

export async function upsertStoreSettings(input: Partial<StoreSettings>, token?: string): Promise<StoreSettings> {
  return commFetch<StoreSettings>("/v1/commerce/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function listCoupons(token?: string): Promise<Coupon[]> {
  return commFetch<Coupon[]>("/v1/commerce/coupons", {}, token);
}

export async function getCoupon(code: string, token?: string): Promise<Coupon> {
  return commFetch<Coupon>(`/v1/commerce/coupons/${encodeURIComponent(code)}`, {}, token);
}

export async function createCoupon(input: Partial<Coupon>, token?: string): Promise<Coupon> {
  return commFetch<Coupon>("/v1/commerce/coupons", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listOrders(token?: string): Promise<SalesOrder[]> {
  return commFetch<SalesOrder[]>("/v1/commerce/orders", {}, token);
}

export async function getOrder(id: string, token?: string): Promise<SalesOrder> {
  return commFetch<SalesOrder>(`/v1/commerce/orders/${encodeURIComponent(id)}`, {}, token);
}

export async function placeOrder(
  input: {
    order: Partial<SalesOrder>;
    lines: Partial<SalesOrderLine>[];
  },
  token?: string,
): Promise<SalesOrder> {
  return commFetch<SalesOrder>("/v1/commerce/orders", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function recordOrderPayment(
  orderId: string,
  input: { paymentStatus: string; amountPaid: string },
  token?: string,
): Promise<SalesOrder> {
  return commFetch<SalesOrder>(`/v1/commerce/orders/${encodeURIComponent(orderId)}/pay`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function updateOrderStatus(
  orderId: string,
  input: { status: string },
  token?: string,
): Promise<SalesOrder> {
  return commFetch<SalesOrder>(`/v1/commerce/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function listOrderLines(orderId: string, token?: string): Promise<SalesOrderLine[]> {
  return commFetch<SalesOrderLine[]>(`/v1/commerce/orders/${encodeURIComponent(orderId)}/lines`, {}, token);
}

export async function listOrderEvents(orderId: string, token?: string): Promise<SalesOrderEvent[]> {
  return commFetch<SalesOrderEvent[]>(`/v1/commerce/orders/${encodeURIComponent(orderId)}/events`, {}, token);
}
