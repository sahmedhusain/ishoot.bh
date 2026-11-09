import crypto from "node:crypto";
import { resolveIncomingLead } from "../services/lead-resolver";
import { isLocale } from "@platform/locales/registry";
import { serverMessages } from "@platform/locales";
import { db, runAtomicMutation } from "../atomic";
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

export async function getCustomerProfile(id: string) {
 const customer=await db.customer.findUnique({where:{id}});
 return customer ? profile(customer) : null;
}

export async function ensureCustomerProfile(id: string, emailInput: string, input: {name?: string;locale: string;marketingOptIn?: boolean}, emailVerified=false) {
 const email=normalizeCustomerEmail(emailInput);
 if(!isValidEmail(email))throw new Error(serverMessages.customerEmailInvalid);
 return runAtomicMutation(async()=>{
  await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"customer-projection:"+id},0))::text`;
  const existing=await db.customer.findUnique({where:{id}});
  if(existing){
   if(existing.email!==email)throw new Error(serverMessages.customerEmailInvalid);
   if(emailVerified && !existing.emailVerifiedAt)
    return profile(await db.customer.update({where:{id},data:{emailVerifiedAt:new Date()}}));
   return profile(existing);
  }
  const name=checkName(input.name || email.split("@")[0]);
  const crmContactId=await linkContact(email,name,null);
  return profile(await db.customer.create({data:{id,email,name,locale:isLocale(input.locale)?input.locale:"en",marketingOptIn:!!input.marketingOptIn,emailVerifiedAt:emailVerified?new Date():null,crmContactId}}));
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
  const customer = await db.customer.update({
    where: { id: customerId },
    data: {
      name,
      phone,
      locale: isLocale(input.locale) ? input.locale : "en",
      marketingOptIn: input.marketingOptIn,
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
  if (!isValidPhone(data.phone))
    throw new Error(serverMessages.invalidInput);
  data.phone = formatPhoneE164(data.phone);
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

export async function deleteCustomerAccount(customerId: string) {
  await db.$transaction([
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

const unsubscribeSecret = () => {
  const secret =
    process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET || "unsubscribe-secret-fallback";
  return secret;
};

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
  if (!customerId || !signature || !/^[0-9a-f-]{36}$/.test(customerId))
    return false;
  const expected = unsubscribeSignature(customerId);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return false;
  await db.customer.updateMany({
    where: { id: customerId },
    data: { marketingOptIn: false },
  });
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
  const order = await db.salesOrder.findFirst({
    where: { id: input.orderId, customerId: customer.id },
    select: { id: true, number: true, phone: true },
  });
  if (!order) throw new Error(serverMessages.requestNotFound);
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
  return db.inquiry.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}
