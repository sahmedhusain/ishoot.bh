import crypto, { randomUUID } from "node:crypto";
import { serverMessages } from "@platform/locales";
import { isLocale } from "@platform/locales/registry";
import {
  apiError,
  apiTimeoutMs,
  apiUrl,
  createCustomer,
  eraseCustomer,
  getCustomer,
  getOrder,
  listCustomerAddresses as listApiCustomerAddresses,
  listInquiries,
  serviceToken,
} from "@platform/api-client";
import { formatPhoneE164, isValidPhone } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { getPortfolioItems } from "./portfolio";
import { getStoreCatalog } from "./store";
import { resolveIncomingLead } from "../services/lead-resolver";
import { deleteTableRow, listTable, upsertTable } from "../api/tables";
import {
  MIN_REDEEM_POINTS_DEFAULT,
  POINTS_REDEMPTION_RATE_DEFAULT,
  pointsToMoney,
} from "../constants/store";

export const normalizeCustomerEmail = (email: string) => normalizeEmail(email);

export interface CustomerProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  locale: string;
  has_password: boolean;
  google: boolean;
  apple: boolean;
  marketing_opt_in: boolean;
  email_verified: boolean;
  loyalty_points: number;
  wallet_balance: number;
  discount_percent: number;
  tier: string;
  preferred_currency: string;
}

export interface WalletTransactionRow {
  id: string;
  customer_id: string;
  kind: string;
  amount: number;
  balance_after: number;
  reference: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PointsTransactionRow {
  id: string;
  customer_id: string;
  kind: string;
  points: number;
  balance_after: number;
  reference: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderReturnRequestRow {
  id: string;
  order_id: string;
  customer_id: string | null;
  status: string;
  refund_destination: string;
  amount_requested: number;
  reason: string;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CustomerAddressInput {
  id?: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  area: string;
  city: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

type CustomerMeta = {
  email?: string;
  name?: string;
  phone?: string;
  locale?: string;
  marketingOptIn?: boolean;
  emailVerified?: boolean;
};

type AddressOverride = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  area: string;
  city: string;
  country: string;
  postal_code: string;
  is_default: boolean;
};

const customerStore = ((globalThis as unknown as Record<string, unknown>).__platformCustomerStore ??= {
  customerMeta: new Map<string, CustomerMeta>(),
  customerWishlists: new Map<string, Set<string>>(),
  deletedAddressIds: new Set<string>(),
  addressOverrides: new Map<string, AddressOverride>(),
}) as {
  customerMeta: Map<string, CustomerMeta>;
  customerWishlists: Map<string, Set<string>>;
  deletedAddressIds: Set<string>;
  addressOverrides: Map<string, AddressOverride>;
};
const { customerMeta, customerWishlists, deletedAddressIds, addressOverrides } = customerStore;

function checkName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) throw new Error(serverMessages.customerNameRequired);
  return clean;
}

const customerRewardsMemory = new Map<
  string,
  {
    loyalty_points: number;
    wallet_balance: number;
    discount_percent: number;
    tier: string;
    preferred_currency: string;
  }
>();

function buildProfile(
  id: string,
  apiCust: Awaited<ReturnType<typeof getCustomer>> | null,
  meta?: CustomerMeta,
  extra?: Record<string, unknown> | null,
): CustomerProfile | null {
  if (!apiCust && !meta?.email && !extra?.email) return null;
  const fullName = apiCust
    ? `${apiCust.firstName ?? ""} ${apiCust.lastName ?? ""}`.trim()
    : "";
  const email = meta?.email ?? apiCust?.email ?? String(extra?.email ?? "");
  const mem = customerRewardsMemory.get(id);
  return {
    id,
    email,
    name: meta?.name || fullName || String(extra?.name ?? "") || email || id,
    phone: meta?.phone ?? apiCust?.phone ?? String(extra?.phone ?? ""),
    locale: meta?.locale && isLocale(meta.locale) ? meta.locale : "en",
    has_password: true,
    google: false,
    apple: false,
    marketing_opt_in: Boolean(meta?.marketingOptIn),
    email_verified: Boolean(meta?.emailVerified ?? true),
    loyalty_points: Number(extra?.loyalty_points ?? mem?.loyalty_points ?? 0),
    wallet_balance: Number(extra?.wallet_balance ?? mem?.wallet_balance ?? 0),
    discount_percent: Number(extra?.discount_percent ?? mem?.discount_percent ?? 0),
    tier: String(extra?.tier ?? mem?.tier ?? "standard"),
    preferred_currency: String(extra?.preferred_currency ?? mem?.preferred_currency ?? "BHD"),
  };
}

async function getRawCustomerRow(id: string): Promise<Record<string, unknown> | null> {
  const rows = await listTable<Record<string, unknown>>("commerce", "customer").catch(() => []);
  return rows.find((r) => String(r.id ?? "") === id) ?? null;
}

export async function getCustomerProfile(id: string) {
  const [apiCust, rawRow] = await Promise.all([
    getCustomer(id).catch(() => null),
    getRawCustomerRow(id),
  ]);
  return buildProfile(id, apiCust, customerMeta.get(id), rawRow);
}

export async function ensureCustomerProfile(
  id: string,
  emailInput: string,
  input: { name?: string; locale: string; marketingOptIn?: boolean },
  emailVerified = false,
) {
  const email = normalizeCustomerEmail(emailInput);
  if (!isValidEmail(email)) throw new Error(serverMessages.customerEmailInvalid);

  const existing = await getCustomer(id).catch(() => null);
  const existingMeta = customerMeta.get(id);
  const cleanName = checkName(input.name || existingMeta?.name || email.split("@")[0]);
  const locale = isLocale(input.locale) ? input.locale : "en";

  if (existing) {
    if (existing.email && normalizeCustomerEmail(existing.email) !== email) {
      throw new Error(serverMessages.customerEmailInvalid);
    }
    const nextMeta: CustomerMeta = {
      ...existingMeta,
      email,
      name: existingMeta?.name || cleanName,
      locale: existingMeta?.locale || locale,
      marketingOptIn: existingMeta?.marketingOptIn ?? Boolean(input.marketingOptIn),
      emailVerified: existingMeta?.emailVerified || emailVerified,
    };
    customerMeta.set(id, nextMeta);
    return buildProfile(id, existing, nextMeta)!;
  }

  const [firstName, ...rest] = cleanName.split(/\s+/);
  const created = await createCustomer({
    id,
    email,
    firstName: firstName || cleanName,
    lastName: rest.join(" ") || "",
    status: "active",
  }).catch(() => null);

  const nextMeta: CustomerMeta = {
    email,
    name: cleanName,
    locale,
    marketingOptIn: Boolean(input.marketingOptIn),
    emailVerified,
  };
  customerMeta.set(id, nextMeta);
  return buildProfile(id, created, nextMeta)!;
}

export async function updateCustomerProfile(
  customerId: string,
  input: {
    name: string;
    phone: string;
    locale: string;
    marketingOptIn: boolean;
  },
) {
  const name = checkName(input.name);
  let phone = input.phone.trim().slice(0, 40) || "";
  if (phone) {
    if (!isValidPhone(phone)) throw new Error(serverMessages.invalidInput);
    phone = formatPhoneE164(phone);
  }
  const existing = await getCustomer(customerId).catch(() => null);
  const prev = customerMeta.get(customerId);
  const nextMeta: CustomerMeta = {
    ...prev,
    email: prev?.email ?? existing?.email ?? "",
    name,
    phone,
    locale: isLocale(input.locale) ? input.locale : "en",
    marketingOptIn: Boolean(input.marketingOptIn),
    emailVerified: prev?.emailVerified ?? true,
  };
  customerMeta.set(customerId, nextMeta);
  return buildProfile(customerId, existing, nextMeta)!;
}

export async function listCustomerAddresses(customerId: string) {
  const [apiAddresses, apiCust] = await Promise.all([
    listApiCustomerAddresses(customerId).catch(() => []),
    getCustomer(customerId).catch(() => null),
  ]);
  const meta = customerMeta.get(customerId);
  const fallbackName =
    meta?.name ||
    (apiCust ? `${apiCust.firstName ?? ""} ${apiCust.lastName ?? ""}`.trim() : "");
  const fallbackPhone = meta?.phone ?? apiCust?.phone ?? "";

  return (apiAddresses ?? [])
    .filter((a) => !deletedAddressIds.has(a.id))
    .map((a) => {
      const override = addressOverrides.get(a.id);
      if (override) return override;
      return {
        id: a.id,
        label: a.label ?? "",
        name: fallbackName,
        phone: fallbackPhone,
        line1: a.line1,
        line2: a.line2 ?? "",
        area: a.state ?? "",
        city: a.city,
        country: a.country,
        postal_code: a.postalCode ?? "",
        is_default: a.isDefault,
      };
    });
}

export async function saveCustomerAddress(
  customerId: string,
  input: CustomerAddressInput,
) {
  const text = (value: string, max: number) => value.trim().slice(0, max);
  const data = {
    label: text(input.label, 40) || "",
    name: text(input.name, 120),
    phone: text(input.phone, 40),
    line1: text(input.line1, 200),
    line2: text(input.line2, 200) || "",
    area: text(input.area, 80) || "",
    city: text(input.city, 80),
    country: text(input.country, 80),
    postalCode: text(input.postalCode, 20) || "",
  };
  if (!data.name || !data.phone || !data.line1 || !data.city || !data.country) {
    throw new Error(serverMessages.customerAddressIncomplete);
  }
  if (!isValidPhone(data.phone)) {
    throw new Error(serverMessages.invalidInput);
  }
  data.phone = formatPhoneE164(data.phone);

  const existingAddresses = await listCustomerAddresses(customerId);
  if (existingAddresses.length >= 20 && !input.id) {
    throw new Error(serverMessages.customerAddressIncomplete);
  }

  if (input.id) {
    const exists = existingAddresses.some((a) => a.id === input.id);
    if (!exists) throw new Error(serverMessages.customerAddressIncomplete);
    const updated = {
      id: input.id,
      label: data.label,
      name: data.name,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2,
      area: data.area,
      city: data.city,
      country: data.country,
      postal_code: data.postalCode,
      is_default: input.isDefault,
    };
    addressOverrides.set(input.id, updated);
    await upsertTable("commerce", "customer_address", {
      id: input.id,
      customer_id: customerId,
      label: data.label,
      recipient_name: data.name,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2,
      state: data.area,
      city: data.city,
      country: data.country,
      postal_code: data.postalCode,
      is_default: input.isDefault,
    }).catch(() => null);
    return input.id;
  }

  const isDefault = input.isDefault || existingAddresses.length === 0;
  const auth = await serviceToken();
  const res = await fetch(
    `${apiUrl()}/v1/commerce/customers/${encodeURIComponent(customerId)}/addresses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth}`,
      },
      body: JSON.stringify({
        id: randomUUID(),
        customerId,
        addressType: "shipping",
        label: data.label,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.area,
        postalCode: data.postalCode,
        country: data.country,
        isDefault,
      }),
      signal: AbortSignal.timeout(apiTimeoutMs()),
    },
  );
  if (!res.ok) throw await apiError(res);
  const created = (await res.json()) as { id?: string; ID?: string };
  const createdId = created.id || created.ID || randomUUID();
  addressOverrides.set(createdId, {
    id: createdId,
    label: data.label,
    name: data.name,
    phone: data.phone,
    line1: data.line1,
    line2: data.line2,
    area: data.area,
    city: data.city,
    country: data.country,
    postal_code: data.postalCode,
    is_default: isDefault,
  });
  return createdId;
}

export async function deleteCustomerAddress(_customerId: string, id: string) {
  deletedAddressIds.add(id);
  addressOverrides.delete(id);
  await deleteTableRow("commerce", "customer_address", id).catch(() => null);
}

export async function toggleWishlist(
  customerId: string,
  catalogueItemId: string,
) {
  const dbRows = await listTable<{ id: string; customer_id: string; product_id: string }>(
    "commerce",
    "customer_wishlist",
  ).catch(() => []);
  const dbMatch = dbRows.find(
    (r) => r.customer_id === customerId && r.product_id === catalogueItemId,
  );
  const existing = customerWishlists.get(customerId);

  if (dbMatch || existing?.has(catalogueItemId)) {
    existing?.delete(catalogueItemId);
    if (dbMatch) {
      await deleteTableRow("commerce", "customer_wishlist", dbMatch.id).catch(() => null);
    }
    return false;
  }

  const { items } = await getStoreCatalog(await getPortfolioItems(), []);
  const exists = items.some((item) => item.id === catalogueItemId);
  if (!exists) throw new Error(serverMessages.customerItemMissing);

  const set = existing ?? new Set<string>();
  set.add(catalogueItemId);
  customerWishlists.set(customerId, set);
  await upsertTable("commerce", "customer_wishlist", {
    id: randomUUID(),
    customer_id: customerId,
    product_id: catalogueItemId,
  }).catch(() => null);
  return true;
}

export async function listWishlist(customerId: string) {
  const dbRows = await listTable<{ customer_id: string; product_id: string }>(
    "commerce",
    "customer_wishlist",
    "created_at DESC",
  ).catch(() => []);
  const set = new Set(customerWishlists.get(customerId) ?? []);
  for (const row of dbRows) {
    if (row.customer_id === customerId && row.product_id) {
      set.add(row.product_id);
    }
  }
  if (set.size === 0) return [];
  const { items } = await getStoreCatalog(await getPortfolioItems(), []);
  return items
    .filter((item) => set.has(item.id))
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title_en: item.title_en,
      title_ar: item.title_ar,
      thumbnail_url: item.thumbnail_url,
      price: item.price ?? null,
    }));
}

export async function deleteCustomerAccount(customerId: string) {
  await eraseCustomer(customerId).catch(() => undefined);
  customerMeta.delete(customerId);
  customerWishlists.delete(customerId);
}

const unsubscribeSecret = () =>
  process.env.CUSTOMER_AUTH_SECRET ||
  process.env.REVALIDATION_SECRET ||
  "unsubscribe-secret-fallback";

export const unsubscribeSignature = (customerId: string) =>
  crypto
    .createHmac("sha256", unsubscribeSecret())
    .update(`unsubscribe:${customerId}`)
    .digest("base64url")
    .slice(0, 32);

export const unsubscribeToken = (customerId: string) =>
  `${customerId}.${unsubscribeSignature(customerId)}`;

export async function unsubscribeCustomer(token: string) {
  const [customerId, signature] = token.split(".");
  if (!customerId || !signature || !/^[0-9a-f-]{36}$/.test(customerId)) {
    return false;
  }
  const expected = unsubscribeSignature(customerId);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return false;
  }
  const prev = customerMeta.get(customerId) ?? {};
  customerMeta.set(customerId, { ...prev, marketingOptIn: false });
  return true;
}

export async function createOrderHelpRequest(
  customer: { id: string; name: string; email: string; phone: string },
  input: {
    orderId: string;
    kind: "question" | "problem";
    message: string;
    locale: string;
  },
) {
  const order = await getOrder(input.orderId).catch(() => null);
  if (!order || order.customerId !== customer.id) {
    throw new Error(serverMessages.requestNotFound);
  }
  const message = input.message.trim().slice(0, 5000);
  if (message.length < 5) throw new Error(serverMessages.serviceReplyEmpty);
  return resolveIncomingLead({
    name: customer.name,
    email: customer.email,
    phone: customer.phone || order.phone || undefined,
    message: `${order.number}\n\n${message}`,
    source: "website",
    locale: input.locale,
    intent: input.kind === "problem" ? "complaint" : "inquiry",
    priority: input.kind === "problem" ? "high" : "normal",
    orderId: order.id,
    projectReference: order.number,
  });
}

export async function requestsForOrder(orderId: string) {
  const inquiries = await listInquiries().catch(() => []);
  return inquiries.filter((i) => i.message.includes(`Order ID: ${orderId}`));
}

const walletTxMemory = new Map<string, WalletTransactionRow[]>();
const pointsTxMemory = new Map<string, PointsTransactionRow[]>();
const returnRequestMemory = new Map<string, OrderReturnRequestRow[]>();

export async function listCustomerWalletTransactions(
  customerId: string,
): Promise<WalletTransactionRow[]> {
  const rows = await listTable<Record<string, unknown>>(
    "commerce",
    "customer_wallet_tx",
    "created_at DESC",
  ).catch(() => []);
  const dbList = rows
    .filter((r) => String(r.customer_id ?? "") === customerId)
    .map((r) => ({
      id: String(r.id ?? ""),
      customer_id: String(r.customer_id ?? ""),
      kind: String(r.kind ?? "topup"),
      amount: Number(r.amount ?? 0),
      balance_after: Number(r.balance_after ?? 0),
      reference: r.reference ? String(r.reference) : null,
      note: r.note ? String(r.note) : null,
      created_by: r.created_by ? String(r.created_by) : null,
      created_at: String(r.created_at ?? new Date().toISOString()),
    }));
  const memList = walletTxMemory.get(customerId) ?? [];
  const seen = new Set(dbList.map((r) => r.id));
  return [...memList.filter((r) => !seen.has(r.id)), ...dbList].slice(0, 50);
}

export async function listCustomerPointsTransactions(
  customerId: string,
): Promise<PointsTransactionRow[]> {
  const rows = await listTable<Record<string, unknown>>(
    "commerce",
    "customer_points_tx",
    "created_at DESC",
  ).catch(() => []);
  const dbList = rows
    .filter((r) => String(r.customer_id ?? "") === customerId)
    .map((r) => ({
      id: String(r.id ?? ""),
      customer_id: String(r.customer_id ?? ""),
      kind: String(r.kind ?? "earn"),
      points: Number(r.points ?? 0),
      balance_after: Number(r.balance_after ?? 0),
      reference: r.reference ? String(r.reference) : null,
      note: r.note ? String(r.note) : null,
      created_by: r.created_by ? String(r.created_by) : null,
      created_at: String(r.created_at ?? new Date().toISOString()),
    }));
  const memList = pointsTxMemory.get(customerId) ?? [];
  const seen = new Set(dbList.map((r) => r.id));
  return [...memList.filter((r) => !seen.has(r.id)), ...dbList].slice(0, 50);
}

async function persistCustomerRewardBalances(
  customerId: string,
  next: { loyalty_points: number; wallet_balance: number },
) {
  const raw = await getRawCustomerRow(customerId);
  const existingMem = customerRewardsMemory.get(customerId);
  customerRewardsMemory.set(customerId, {
    loyalty_points: next.loyalty_points,
    wallet_balance: next.wallet_balance,
    discount_percent: Number(raw?.discount_percent ?? existingMem?.discount_percent ?? 0),
    tier: String(raw?.tier ?? existingMem?.tier ?? "standard"),
    preferred_currency: String(raw?.preferred_currency ?? existingMem?.preferred_currency ?? "BHD"),
  });
  await upsertTable("commerce", "customer", {
    id: customerId,
    ...(raw ? {} : {}),
    loyalty_points: next.loyalty_points,
    wallet_balance: next.wallet_balance,
  }).catch(() => null);
}

export async function convertLoyaltyPointsToWallet(
  customerId: string,
  pointsInput: number,
) {
  const profile = await getCustomerProfile(customerId);
  if (!profile) throw new Error(serverMessages.invalidInput);

  const settingsRows = await listTable<Record<string, unknown>>(
    "commerce",
    "store_settings",
  ).catch(() => []);
  const settings = settingsRows.find((r) => r.id === "default") ?? settingsRows[0];
  const rate = Math.max(
    1,
    Number(settings?.points_redemption_rate ?? POINTS_REDEMPTION_RATE_DEFAULT),
  );
  const minPts = Math.max(
    1,
    Number(settings?.min_redeem_points ?? MIN_REDEEM_POINTS_DEFAULT),
  );

  const points = Math.floor(Number(pointsInput));
  if (!Number.isFinite(points) || points < minPts || points > profile.loyalty_points) {
    throw new Error(serverMessages.invalidInput);
  }

  const creditAmount = pointsToMoney(points, rate);
  if (creditAmount <= 0) throw new Error(serverMessages.invalidInput);

  const nextPoints = Math.max(0, profile.loyalty_points - points);
  const nextWallet =
    Math.round((profile.wallet_balance + creditAmount + Number.EPSILON) * 1000) /
    1000;

  await persistCustomerRewardBalances(customerId, {
    loyalty_points: nextPoints,
    wallet_balance: nextWallet,
  });

  const now = new Date().toISOString();
  const ptsTx: PointsTransactionRow = {
    id: randomUUID(),
    customer_id: customerId,
    kind: "convert_wallet",
    points: -points,
    balance_after: nextPoints,
    reference: `wallet:${creditAmount.toFixed(3)}`,
    note: `Converted ${points} points to wallet credit`,
    created_by: customerId,
    created_at: now,
  };
  const wTx: WalletTransactionRow = {
    id: randomUUID(),
    customer_id: customerId,
    kind: "points_conversion",
    amount: creditAmount,
    balance_after: nextWallet,
    reference: `points:${points}`,
    note: `Converted ${points} loyalty points`,
    created_by: customerId,
    created_at: now,
  };
  pointsTxMemory.set(customerId, [ptsTx, ...(pointsTxMemory.get(customerId) ?? [])]);
  walletTxMemory.set(customerId, [wTx, ...(walletTxMemory.get(customerId) ?? [])]);
  await Promise.all([
    upsertTable("commerce", "customer_points_tx", ptsTx).catch(() => null),
    upsertTable("commerce", "customer_wallet_tx", wTx).catch(() => null),
  ]);

  return {
    pointsConverted: points,
    creditedAmount: creditAmount,
    loyalty_points: nextPoints,
    wallet_balance: nextWallet,
  };
}

export async function redeemGiftCardToWallet(
  customerId: string,
  codeInput: string,
) {
  const code = codeInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!code || code.length < 4) throw new Error(serverMessages.invalidInput);

  const cards = await listTable<Record<string, unknown>>(
    "commerce",
    "gift_card",
  ).catch(() => []);
  const card = cards.find((c) => String(c.code ?? "").trim().toUpperCase() === code);
  if (
    !card ||
    card.is_active === false ||
    Number(card.remaining_value ?? 0) <= 0 ||
    (card.expires_at && new Date(String(card.expires_at)).getTime() < Date.now())
  ) {
    throw new Error(serverMessages.invalidInput);
  }

  const profile = await getCustomerProfile(customerId);
  if (!profile) throw new Error(serverMessages.invalidInput);

  const credit = Number(card.remaining_value ?? 0);
  const nextWallet =
    Math.round((profile.wallet_balance + credit + Number.EPSILON) * 1000) / 1000;
  const now = new Date().toISOString();

  await upsertTable("commerce", "gift_card", {
    id: String(card.id),
    code: String(card.code),
    initial_value: Number(card.initial_value ?? credit),
    remaining_value: 0,
    is_active: false,
    redeemed_by: customerId,
    redeemed_at: now,
  }).catch(() => null);

  await persistCustomerRewardBalances(customerId, {
    loyalty_points: profile.loyalty_points,
    wallet_balance: nextWallet,
  });

  const wTx: WalletTransactionRow = {
    id: randomUUID(),
    customer_id: customerId,
    kind: "gift_card",
    amount: credit,
    balance_after: nextWallet,
    reference: code,
    note: `Redeemed gift card ${code}`,
    created_by: customerId,
    created_at: now,
  };
  walletTxMemory.set(customerId, [wTx, ...(walletTxMemory.get(customerId) ?? [])]);
  await upsertTable("commerce", "customer_wallet_tx", wTx).catch(() => null);

  return {
    code,
    creditedAmount: credit,
    wallet_balance: nextWallet,
  };
}

export async function listCustomerReturnRequests(
  customerId: string,
): Promise<OrderReturnRequestRow[]> {
  const rows = await listTable<Record<string, unknown>>(
    "commerce",
    "order_return_request",
    "created_at DESC",
  ).catch(() => []);
  const dbList = rows
    .filter((r) => String(r.customer_id ?? "") === customerId)
    .map((r) => ({
      id: String(r.id ?? ""),
      order_id: String(r.order_id ?? ""),
      customer_id: r.customer_id ? String(r.customer_id) : null,
      status: String(r.status ?? "pending"),
      refund_destination: String(r.refund_destination ?? "wallet"),
      amount_requested: Number(r.amount_requested ?? 0),
      reason: String(r.reason ?? ""),
      resolution_note: r.resolution_note ? String(r.resolution_note) : null,
      resolved_by: r.resolved_by ? String(r.resolved_by) : null,
      resolved_at: r.resolved_at ? String(r.resolved_at) : null,
      created_at: String(r.created_at ?? new Date().toISOString()),
    }));
  const memList = returnRequestMemory.get(customerId) ?? [];
  const seen = new Set(dbList.map((r) => r.id));
  return [...memList.filter((r) => !seen.has(r.id)), ...dbList];
}

export async function createOrderReturnRequest(
  customerId: string,
  input: {
    orderId: string;
    reason: string;
    refundDestination: "wallet" | "original_payment" | "replacement";
    amountRequested?: number;
  },
) {
  const reason = input.reason.trim().slice(0, 1000);
  if (!input.orderId || !reason) throw new Error(serverMessages.invalidInput);
  const destination = ["wallet", "original_payment", "replacement"].includes(
    input.refundDestination,
  )
    ? input.refundDestination
    : "wallet";
  const amount = Math.max(0, Number(input.amountRequested ?? 0) || 0);
  const row: OrderReturnRequestRow = {
    id: randomUUID(),
    order_id: input.orderId,
    customer_id: customerId,
    status: "pending",
    refund_destination: destination,
    amount_requested: amount,
    reason,
    resolution_note: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  };
  returnRequestMemory.set(customerId, [row, ...(returnRequestMemory.get(customerId) ?? [])]);
  await upsertTable("commerce", "order_return_request", row).catch(() => null);
  await upsertTable("commerce", "sales_order_event", {
    id: randomUUID(),
    order_id: input.orderId,
    kind: "return_requested",
    amount,
    note: `${destination}: ${reason}`,
    created_by: customerId,
  }).catch(() => null);
  return row;
}

export async function applyOrderRewardsLedger(input: {
  customerId: string;
  orderId: string;
  orderNumber: string;
  pointsEarned: number;
  pointsRedeemed: number;
  walletApplied: number;
}) {
  const profile = await getCustomerProfile(input.customerId);
  if (!profile) return;
  const nextPoints = Math.max(
    0,
    profile.loyalty_points - input.pointsRedeemed + input.pointsEarned,
  );
  const nextWallet = Math.max(
    0,
    Math.round((profile.wallet_balance - input.walletApplied + Number.EPSILON) * 1000) / 1000,
  );
  await persistCustomerRewardBalances(input.customerId, {
    loyalty_points: nextPoints,
    wallet_balance: nextWallet,
  });

  const now = new Date().toISOString();
  const ops: Promise<unknown>[] = [];
  if (input.pointsRedeemed > 0) {
    const row: PointsTransactionRow = {
      id: randomUUID(),
      customer_id: input.customerId,
      kind: "redeem",
      points: -input.pointsRedeemed,
      balance_after: Math.max(0, profile.loyalty_points - input.pointsRedeemed),
      reference: input.orderNumber,
      note: `Redeemed on order ${input.orderNumber}`,
      created_by: input.customerId,
      created_at: now,
    };
    pointsTxMemory.set(input.customerId, [row, ...(pointsTxMemory.get(input.customerId) ?? [])]);
    ops.push(upsertTable("commerce", "customer_points_tx", row).catch(() => null));
  }
  if (input.pointsEarned > 0) {
    const row: PointsTransactionRow = {
      id: randomUUID(),
      customer_id: input.customerId,
      kind: "earn",
      points: input.pointsEarned,
      balance_after: nextPoints,
      reference: input.orderNumber,
      note: `Earned on order ${input.orderNumber}`,
      created_by: input.customerId,
      created_at: now,
    };
    pointsTxMemory.set(input.customerId, [row, ...(pointsTxMemory.get(input.customerId) ?? [])]);
    ops.push(upsertTable("commerce", "customer_points_tx", row).catch(() => null));
  }
  if (input.walletApplied > 0) {
    const row: WalletTransactionRow = {
      id: randomUUID(),
      customer_id: input.customerId,
      kind: "order_debit",
      amount: -input.walletApplied,
      balance_after: nextWallet,
      reference: input.orderNumber,
      note: `Paid toward order ${input.orderNumber}`,
      created_by: input.customerId,
      created_at: now,
    };
    walletTxMemory.set(input.customerId, [row, ...(walletTxMemory.get(input.customerId) ?? [])]);
    ops.push(upsertTable("commerce", "customer_wallet_tx", row).catch(() => null));
  }
  await Promise.all(ops);
}
