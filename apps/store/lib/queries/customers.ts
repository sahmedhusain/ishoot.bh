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

const customerMeta = new Map<string, CustomerMeta>();
const customerWishlists = new Map<string, Set<string>>();
const deletedAddressIds = new Set<string>();
const addressOverrides = new Map<string, AddressOverride>();

function checkName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) throw new Error(serverMessages.customerNameRequired);
  return clean;
}

function buildProfile(
  id: string,
  apiCust: Awaited<ReturnType<typeof getCustomer>> | null,
  meta?: CustomerMeta,
): CustomerProfile | null {
  if (!apiCust && !meta?.email) return null;
  const fullName = apiCust
    ? `${apiCust.firstName ?? ""} ${apiCust.lastName ?? ""}`.trim()
    : "";
  const email = meta?.email ?? apiCust?.email ?? "";
  return {
    id,
    email,
    name: meta?.name || fullName || email || id,
    phone: meta?.phone ?? apiCust?.phone ?? "",
    locale: meta?.locale && isLocale(meta.locale) ? meta.locale : "en",
    has_password: true,
    google: false,
    apple: false,
    marketing_opt_in: Boolean(meta?.marketingOptIn),
    email_verified: Boolean(meta?.emailVerified ?? true),
  };
}

export async function getCustomerProfile(id: string) {
  const apiCust = await getCustomer(id).catch(() => null);
  return buildProfile(id, apiCust, customerMeta.get(id));
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
    addressOverrides.set(input.id, {
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
    });
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
}

export async function toggleWishlist(
  customerId: string,
  catalogueItemId: string,
) {
  const existing = customerWishlists.get(customerId);
  if (existing?.has(catalogueItemId)) {
    existing.delete(catalogueItemId);
    return false;
  }
  const { items } = await getStoreCatalog(await getPortfolioItems(), []);
  const exists = items.some((item) => item.id === catalogueItemId);
  if (!exists) throw new Error(serverMessages.customerItemMissing);

  const set = existing ?? new Set<string>();
  set.add(catalogueItemId);
  customerWishlists.set(customerId, set);
  return true;
}

export async function listWishlist(customerId: string) {
  const set = customerWishlists.get(customerId);
  if (!set || set.size === 0) return [];
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
