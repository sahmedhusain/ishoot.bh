import { isLocale } from "@platform/locales/registry";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { isValidPhone, formatPhoneE164 } from "../constants/phone";

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

const profile = (c: Record<string, any>): CustomerProfile => ({
  id: String(c.id),
  email: String(c.email ?? ""),
  name: String(c.name ?? ""),
  phone: String(c.phone ?? ""),
  locale: String(c.locale ?? "en"),
  has_password: !!c.passwordHash,
  google: !!c.googleSub,
  apple: !!c.appleSub,
  marketing_opt_in: Boolean(c.marketingOptIn),
  email_verified: !!c.emailVerifiedAt,
});

async function linkContact(email: string, name: string, phone: string | null) {
  const [contacts, customers] = await Promise.all([
    listTableRows<Record<string, any>>("sales", "crm_contact"),
    listTableRows<Record<string, any>>("commerce", "customer"),
  ]);
  const linkedContactIds = new Set(
    customers.map((c) => c.crmContactId).filter(Boolean).map(String),
  );
  const existing = contacts.find(
    (c) =>
      c.emailNorm === email &&
      c.contactType !== "vendor" &&
      !linkedContactIds.has(String(c.id)),
  );
  if (existing) return String(existing.id);

  const [firstName, ...rest] = name.split(/\s+/);
  const contact = await upsertTableRow<Record<string, any>>("sales", "crm_contact", {
    id: crypto.randomUUID(),
    firstName: firstName || name,
    lastName: rest.join(" ") || null,
    email,
    emailNorm: email,
    phone,
    contactType: "client",
    clientKind: "individual",
  });
  return String(contact.id);
}

function checkName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) throw new Error(serverMessages.customerNameRequired);
  return clean;
}

export async function getCustomerProfile(id: string) {
  const customers = await listTableRows<Record<string, any>>("commerce", "customer");
  const customer = customers.find((c) => c.id === id);
  return customer ? profile(customer) : null;
}

export async function ensureCustomerProfile(
  id: string,
  emailInput: string,
  input: { name?: string; locale: string; marketingOptIn?: boolean },
  emailVerified = false,
) {
  const email = normalizeCustomerEmail(emailInput);
  if (!isValidEmail(email)) throw new Error(serverMessages.customerEmailInvalid);
  return runAtomicMutation(async () => {
    const customers = await listTableRows<Record<string, any>>("commerce", "customer");
    const existing = customers.find((c) => c.id === id);
    if (existing) {
      if (existing.email !== email) throw new Error(serverMessages.customerEmailInvalid);
      if (emailVerified && !existing.emailVerifiedAt) {
        return profile(
          await upsertTableRow("commerce", "customer", {
            id,
            emailVerifiedAt: new Date().toISOString(),
          }),
        );
      }
      return profile(existing);
    }
    const name = checkName(input.name || email.split("@")[0]);
    const crmContactId = await linkContact(email, name, null);
    return profile(
      await upsertTableRow("commerce", "customer", {
        id,
        email,
        name,
        locale: isLocale(input.locale) ? input.locale : "en",
        marketingOptIn: !!input.marketingOptIn,
        emailVerifiedAt: emailVerified ? new Date().toISOString() : null,
        crmContactId,
      }),
    );
  });
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
  let phone = input.phone.trim().slice(0, 40) || null;
  if (phone) {
    if (!isValidPhone(phone)) throw new Error(serverMessages.invalidInput);
    phone = formatPhoneE164(phone);
  }
  const customer = await upsertTableRow<Record<string, any>>("commerce", "customer", {
    id: customerId,
    name,
    phone,
    locale: isLocale(input.locale) ? input.locale : "en",
    marketingOptIn: input.marketingOptIn,
  });
  if (customer.crmContactId && phone !== null) {
    await upsertTableRow("sales", "crm_contact", {
      id: String(customer.crmContactId),
      phone,
    });
  }
  return profile(customer);
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

export async function listCustomerAddresses(customerId: string) {
  const rows = await listTableRows<Record<string, any>>(
    "commerce",
    "customer_address",
    "is_default DESC, created_at ASC",
  );
  return rows
    .filter((a) => a.customerId === customerId)
    .map((a) => ({
      id: String(a.id),
      label: String(a.label ?? ""),
      name: String(a.name ?? ""),
      phone: String(a.phone ?? ""),
      line1: String(a.line1 ?? ""),
      line2: String(a.line2 ?? ""),
      area: String(a.area ?? ""),
      city: String(a.city ?? ""),
      country: String(a.country ?? ""),
      postal_code: String(a.postalCode ?? ""),
      is_default: Boolean(a.isDefault),
    }));
}

export async function saveCustomerAddress(
  customerId: string,
  input: CustomerAddressInput,
) {
  const text = (value: string, max: number) => value.trim().slice(0, max);
  const data = {
    label: text(input.label, 40) || null,
    name: text(input.name, 120),
    phone: text(input.phone, 40),
    line1: text(input.line1, 200),
    line2: text(input.line2, 200) || null,
    area: text(input.area, 80) || null,
    city: text(input.city, 80),
    country: text(input.country, 80),
    postalCode: text(input.postalCode, 20) || null,
  };
  if (!data.name || !data.phone || !data.line1 || !data.city || !data.country)
    throw new Error(serverMessages.customerAddressIncomplete);
  if (!isValidPhone(data.phone))
    throw new Error(serverMessages.invalidInput);
  data.phone = formatPhoneE164(data.phone);

  const existingAddresses = (
    await listTableRows<Record<string, any>>("commerce", "customer_address")
  ).filter((a) => a.customerId === customerId);

  if (existingAddresses.length >= 20 && !input.id)
    throw new Error(serverMessages.customerAddressIncomplete);

  return runAtomicMutation(async () => {
    const first = existingAddresses.length === 0;
    const isDefault = input.isDefault || first;
    if (isDefault) {
      for (const addr of existingAddresses) {
        if (addr.isDefault) {
          await upsertTableRow("commerce", "customer_address", {
            id: addr.id,
            isDefault: false,
          });
        }
      }
    }
    if (input.id) {
      const target = existingAddresses.find((a) => a.id === input.id);
      if (!target) throw new Error(serverMessages.customerAddressIncomplete);
      await upsertTableRow("commerce", "customer_address", {
        id: input.id,
        ...data,
        isDefault,
      });
      return input.id;
    }
    const created = await upsertTableRow<Record<string, any>>(
      "commerce",
      "customer_address",
      {
        id: crypto.randomUUID(),
        ...data,
        isDefault,
        customerId,
      },
    );
    return String(created.id);
  });
}

export async function deleteCustomerAddress(customerId: string, id: string) {
  const rows = await listTableRows<Record<string, any>>("commerce", "customer_address");
  const target = rows.find((a) => a.id === id && a.customerId === customerId);
  if (target) await deleteTableRow("commerce", "customer_address", id);
}

export async function toggleWishlist(
  customerId: string,
  catalogueItemId: string,
) {
  const items = await listTableRows<Record<string, any>>("system", "wishlist_item");
  const existing = items.find(
    (w) => w.customerId === customerId && w.catalogueItemId === catalogueItemId,
  );
  if (existing) {
    await deleteTableRow("system", "wishlist_item", String(existing.id));
    return false;
  }
  const portfolioItems = await listTableRows<Record<string, any>>("cms", "portfolio_item");
  if (!portfolioItems.some((p) => p.id === catalogueItemId))
    throw new Error(serverMessages.customerItemMissing);
  await upsertTableRow("system", "wishlist_item", {
    id: crypto.randomUUID(),
    customerId,
    catalogueItemId,
  });
  return true;
}

export async function listWishlist(customerId: string) {
  const [rows, portfolioItems] = await Promise.all([
    listTableRows<Record<string, any>>("system", "wishlist_item", "created_at DESC"),
    listTableRows<Record<string, any>>("cms", "portfolio_item"),
  ]);
  const byId = new Map(portfolioItems.map((p) => [String(p.id), p]));
  return rows
    .filter((w) => w.customerId === customerId && byId.has(String(w.catalogueItemId)))
    .map((w) => {
      const item = byId.get(String(w.catalogueItemId))!;
      return {
        id: String(item.id),
        slug: String(item.slug ?? ""),
        title_en: item.titleEn ?? null,
        title_ar: item.titleAr ?? null,
        thumbnail_url: item.thumbnailUrl ?? null,
        price: item.price == null ? null : Number(item.price),
      };
    });
}

export async function deleteCustomerAccount(customerId: string) {
  return runAtomicMutation(async () => {
    const [addresses, wishlists] = await Promise.all([
      listTableRows<Record<string, any>>("commerce", "customer_address"),
      listTableRows<Record<string, any>>("system", "wishlist_item"),
    ]);
    for (const a of addresses) {
      if (a.customerId === customerId)
        await deleteTableRow("commerce", "customer_address", String(a.id));
    }
    for (const w of wishlists) {
      if (w.customerId === customerId)
        await deleteTableRow("system", "wishlist_item", String(w.id));
    }
    await upsertTableRow("commerce", "customer", {
      id: customerId,
      email: `deleted-${customerId}@deleted.invalid`,
      name: "—",
      phone: null,
      passwordHash: null,
      googleSub: null,
      appleSub: null,
      marketingOptIn: false,
      crmContactId: null,
    });
  });
}
