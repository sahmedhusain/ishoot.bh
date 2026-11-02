import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

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
  const auth = token ?? (await serviceToken("commerce"));
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

export async function listCustomers(token?: string): Promise<Customer[]> {
  const res = await fetch(`${apiUrl()}/v1/commerce/customers`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getCustomer(id: string, token?: string): Promise<Customer> {
  const res = await fetch(`${apiUrl()}/v1/commerce/customers/${id}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createCustomer(input: Partial<Customer>, token?: string): Promise<Customer> {
  const res = await fetch(`${apiUrl()}/v1/commerce/customers`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listCustomerAddresses(customerId: string, token?: string): Promise<CustomerAddress[]> {
  const res = await fetch(`${apiUrl()}/v1/commerce/customers/${customerId}/addresses`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getStoreSettings(token?: string): Promise<StoreSettings> {
  const res = await fetch(`${apiUrl()}/v1/commerce/settings`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function upsertStoreSettings(input: Partial<StoreSettings>, token?: string): Promise<StoreSettings> {
  const res = await fetch(`${apiUrl()}/v1/commerce/settings`, {
    method: "PUT",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listCoupons(token?: string): Promise<Coupon[]> {
  const res = await fetch(`${apiUrl()}/v1/commerce/coupons`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getCoupon(code: string, token?: string): Promise<Coupon> {
  const res = await fetch(`${apiUrl()}/v1/commerce/coupons/${code}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createCoupon(input: Partial<Coupon>, token?: string): Promise<Coupon> {
  const res = await fetch(`${apiUrl()}/v1/commerce/coupons`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listOrders(token?: string): Promise<SalesOrder[]> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getOrder(id: string, token?: string): Promise<SalesOrder> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders/${id}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function placeOrder(
  input: {
    order: Partial<SalesOrder>;
    lines: Partial<SalesOrderLine>[];
  },
  token?: string,
): Promise<SalesOrder> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function recordOrderPayment(
  orderId: string,
  input: { paymentStatus: string; amountPaid: string },
  token?: string,
): Promise<SalesOrder> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders/${orderId}/pay`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function updateOrderStatus(
  orderId: string,
  input: { status: string },
  token?: string,
): Promise<SalesOrder> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders/${orderId}/status`, {
    method: "PUT",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listOrderLines(orderId: string, token?: string): Promise<SalesOrderLine[]> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders/${orderId}/lines`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listOrderEvents(orderId: string, token?: string): Promise<SalesOrderEvent[]> {
  const res = await fetch(`${apiUrl()}/v1/commerce/orders/${orderId}/events`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}
