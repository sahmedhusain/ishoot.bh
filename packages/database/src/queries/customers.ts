import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcryptjs";
import { serverMessages } from "@platform/locales";
import { db } from "../db";

/** How long a sign-in lasts on one device. */
export const CUSTOMER_SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const CODE_ATTEMPTS = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeCustomerEmail = (email: string) =>
  email.trim().toLowerCase().slice(0, 254);
const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

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

type CustomerRow = NonNullable<
  Awaited<ReturnType<typeof db.customer.findUnique>>
>;
const profile = (c: CustomerRow): CustomerProfile => ({
  id: c.id,
  email: c.email,
  name: c.name,
  phone: c.phone ?? "",
  locale: c.locale,
  has_password: !!c.passwordHash,
  google: !!c.googleSub,
  apple: !!c.appleSub,
  marketing_opt_in: c.marketingOptIn,
  email_verified: !!c.emailVerifiedAt,
});

/** The CRM contact for a new customer: the existing one with this e-mail, else a new client contact. */
async function linkContact(email: string, name: string, phone: string | null) {
  const existing = await db.crmContact.findFirst({
    where: { emailNorm: email, contactType: { not: "vendor" }, customer: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  const [firstName, ...rest] = name.split(/\s+/);
  const contact = await db.crmContact.create({
    data: {
      firstName: firstName || name,
      lastName: rest.join(" ") || null,
      email,
      emailNorm: email,
      phone,
      contactType: "client",
      clientKind: "individual",
    },
  });
  return contact.id;
}

function checkName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!clean) throw new Error(serverMessages.customerNameRequired);
  return clean;
}

function checkPassword(password: string) {
  if (password.length < 8 || password.length > 200)
    throw new Error(serverMessages.customerPasswordWeak);
}

/** Creates an account with a password. The e-mail is confirmed later (an e-mailed code). */
export async function signUpCustomer(input: {
  name: string;
  email: string;
  password: string;
  locale: string;
  marketingOptIn?: boolean;
}) {
  const email = normalizeCustomerEmail(input.email);
  if (!EMAIL.test(email)) throw new Error(serverMessages.customerEmailInvalid);
  const name = checkName(input.name);
  checkPassword(input.password);
  if (await db.customer.findUnique({ where: { email }, select: { id: true } }))
    throw new Error(serverMessages.customerEmailTaken);
  const crmContactId = await linkContact(email, name, null);
  const customer = await db.customer.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(input.password, 12),
      locale: input.locale === "en" ? "en" : "ar",
      marketingOptIn: !!input.marketingOptIn,
      crmContactId,
    },
  });
  return profile(customer);
}

/** The customer for an e-mail and password, or null (the same answer whether the e-mail exists or not). */
export async function verifyCustomerPassword(
  emailInput: string,
  password: string,
) {
  const email = normalizeCustomerEmail(emailInput);
  const customer = await db.customer.findUnique({ where: { email } });
  // Compare against a fixed hash when there is no account, so timing does not reveal which e-mails exist.
  const ok = await bcrypt.compare(
    password,
    customer?.passwordHash ??
      "$2b$12$bMbBLobTQUgV/TXZtbr/D.u6ldkQ/P2F7MCV9D/knCgPL1ZtjszdC",
  );
  return ok && customer?.passwordHash ? profile(customer) : null;
}

/** Starts a session: returns the cookie token (stored only as a hash). */
export async function createCustomerSession(
  customerId: string,
  userAgent: string | null,
) {
  const token = randomBytes(32).toString("base64url");
  await db.customerSession.create({
    data: {
      customerId,
      tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + CUSTOMER_SESSION_DAYS * 86_400_000),
    },
  });
  return token;
}

export async function customerFromSession(token: string | undefined | null) {
  if (!token || token.length > 100) return null;
  const session = await db.customerSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { customer: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return profile(session.customer);
}

export async function endCustomerSession(token: string | undefined | null) {
  if (token)
    await db.customerSession.deleteMany({
      where: { tokenHash: sha256(token) },
    });
}

/** A six-digit sign-in code for this e-mail (stored hashed); the caller e-mails it. */
export async function issueCustomerCode(emailInput: string) {
  const email = normalizeCustomerEmail(emailInput);
  if (!EMAIL.test(email)) throw new Error(serverMessages.customerEmailInvalid);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.customerAuthCode.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });
  await db.customerAuthCode.create({
    data: {
      email,
      codeHash: customerCodeHash(email, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
    },
  });
  return code;
}

export const customerCodeHash = (email: string, code: string) =>
  sha256(`customer-code:${email}:${code}`);

/**
 * Signs in with an e-mailed code: the newest unused code, before it expires, within a few attempts. A first sign-in
 * creates the account (the code proves the e-mail). Returns the customer, or null when the code is wrong.
 */
export async function verifyCustomerCode(
  emailInput: string,
  code: string,
  name: string,
  locale: string,
) {
  const email = normalizeCustomerEmail(emailInput);
  const row = await db.customerAuthCode.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt < new Date() || row.attempts >= CODE_ATTEMPTS)
    return null;
  const given = Buffer.from(customerCodeHash(email, code.trim()));
  if (
    given.length !== row.codeHash.length ||
    !timingSafeEqual(given, Buffer.from(row.codeHash))
  ) {
    await db.customerAuthCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }
  await db.customerAuthCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing)
    return profile(
      await db.customer.update({
        where: { id: existing.id },
        data: { emailVerifiedAt: existing.emailVerifiedAt ?? new Date() },
      }),
    );
  const clean = checkName(name || email.split("@")[0]);
  const crmContactId = await linkContact(email, clean, null);
  return profile(
    await db.customer.create({
      data: {
        email,
        name: clean,
        emailVerifiedAt: new Date(),
        locale: locale === "en" ? "en" : "ar",
        crmContactId,
      },
    }),
  );
}

/**
 * Signs in with Google or Apple: the account already linked to that identity, else the account with that e-mail
 * (only when the provider confirmed the e-mail), else a new account.
 */
export async function customerFromProvider(
  provider: "google" | "apple",
  input: {
    sub: string;
    email: string | null;
    emailVerified: boolean;
    name: string | null;
    locale: string;
  },
) {
  const key = provider === "google" ? "googleSub" : "appleSub";
  const linked = await db.customer.findFirst({ where: { [key]: input.sub } });
  if (linked) return profile(linked);
  const email = input.email ? normalizeCustomerEmail(input.email) : null;
  if (!email || !input.emailVerified)
    throw new Error(serverMessages.customerProviderEmailMissing);
  const byEmail = await db.customer.findUnique({ where: { email } });
  if (byEmail)
    return profile(
      await db.customer.update({
        where: { id: byEmail.id },
        data: {
          [key]: input.sub,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        },
      }),
    );
  const name = checkName(input.name || email.split("@")[0]);
  const crmContactId = await linkContact(email, name, null);
  return profile(
    await db.customer.create({
      data: {
        email,
        name,
        [key]: input.sub,
        emailVerifiedAt: new Date(),
        locale: input.locale === "en" ? "en" : "ar",
        crmContactId,
      },
    }),
  );
}

export async function updateCustomerProfile(
  customerId: string,
  input: {
    name: string;
    phone: string;
    locale: string;
    marketingOptIn: boolean;
    password?: string;
  },
) {
  const name = checkName(input.name);
  const phone = input.phone.trim().slice(0, 40) || null;
  if (input.password) checkPassword(input.password);
  const customer = await db.customer.update({
    where: { id: customerId },
    data: {
      name,
      phone,
      locale: input.locale === "en" ? "en" : "ar",
      marketingOptIn: input.marketingOptIn,
      ...(input.password
        ? { passwordHash: await bcrypt.hash(input.password, 12) }
        : {}),
    },
  });
  if (customer.crmContactId)
    await db.crmContact.update({
      where: { id: customer.crmContactId },
      data: { phone: phone ?? undefined },
    });
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
  const rows = await db.customerAddress.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((a) => ({
    id: a.id,
    label: a.label ?? "",
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? "",
    area: a.area ?? "",
    city: a.city,
    country: a.country,
    postal_code: a.postalCode ?? "",
    is_default: a.isDefault,
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
  if (
    (await db.customerAddress.count({ where: { customerId } })) >= 20 &&
    !input.id
  )
    throw new Error(serverMessages.customerAddressIncomplete);
  return db.$transaction(async (tx) => {
    const first = !(await tx.customerAddress.findFirst({
      where: { customerId },
      select: { id: true },
    }));
    const isDefault = input.isDefault || first;
    if (isDefault)
      await tx.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    if (input.id) {
      const result = await tx.customerAddress.updateMany({
        where: { id: input.id, customerId },
        data: { ...data, isDefault },
      });
      if (!result.count)
        throw new Error(serverMessages.customerAddressIncomplete);
      return input.id;
    }
    return (
      await tx.customerAddress.create({
        data: { ...data, isDefault, customerId },
      })
    ).id;
  });
}

export async function deleteCustomerAddress(customerId: string, id: string) {
  await db.customerAddress.deleteMany({ where: { id, customerId } });
}

/** Adds the catalogue item to the wishlist, or removes it when it is there. Returns whether it is now saved. */
export async function toggleWishlist(
  customerId: string,
  catalogueItemId: string,
) {
  const existing = await db.wishlistItem.findUnique({
    where: { customerId_catalogueItemId: { customerId, catalogueItemId } },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return false;
  }
  if (
    !(await db.portfolioItem.findUnique({
      where: { id: catalogueItemId },
      select: { id: true },
    }))
  )
    throw new Error(serverMessages.customerItemMissing);
  await db.wishlistItem.create({ data: { customerId, catalogueItemId } });
  return true;
}

export async function listWishlist(customerId: string) {
  const rows = await db.wishlistItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: {
      catalogueItem: {
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          thumbnailUrl: true,
          price: true,
        },
      },
    },
  });
  return rows.map((w) => ({
    id: w.catalogueItem.id,
    slug: w.catalogueItem.slug,
    title_en: w.catalogueItem.titleEn,
    title_ar: w.catalogueItem.titleAr,
    thumbnail_url: w.catalogueItem.thumbnailUrl,
    price: w.catalogueItem.price == null ? null : Number(w.catalogueItem.price),
  }));
}

/**
 * "Delete my account": signs out everywhere, removes addresses, wishlist and sign-in methods, and replaces the
 * name and e-mail. Orders stay (the company must keep them) without the personal details.
 */
export async function deleteCustomerAccount(customerId: string) {
  await db.$transaction([
    db.customerSession.deleteMany({ where: { customerId } }),
    db.customerAddress.deleteMany({ where: { customerId } }),
    db.wishlistItem.deleteMany({ where: { customerId } }),
    db.customer.update({
      where: { id: customerId },
      data: {
        email: `deleted-${customerId}@deleted.invalid`,
        name: "—",
        phone: null,
        passwordHash: null,
        googleSub: null,
        appleSub: null,
        marketingOptIn: false,
        crmContactId: null,
      },
    }),
  ]);
}
