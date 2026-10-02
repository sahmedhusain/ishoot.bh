import { db } from "../db";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizeToE164(
  phone: string,
  defaultCountry = "BH",
): string | null {
  try {
    const clean = phone.trim();
    if (!clean) return null;
    const parsed = parsePhoneNumberFromString(clean, defaultCountry as any);
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
    return null;
  } catch {
    return null;
  }
}

export interface ResolveLeadInput {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  serviceType?: string;
  budgetRange?: string;
  timeline?: string;
  message: string;
  source?: "website" | "email" | "whatsapp" | "manual";
  locale?: string;
}

export interface ResolvedLeadResult {
  customerId: string | null;
  inquiryId: string;
  resolution: "new_customer" | "existing_customer" | "merge_conflict";
}

export async function resolveIncomingLead(
  data: ResolveLeadInput,
): Promise<ResolvedLeadResult> {
  const emailNorm = data.email.trim().toLowerCase();
  const phoneE164 = data.phone ? normalizeToE164(data.phone, "BH") : null;

  if (data.phone && !phoneE164) throw new Error("Invalid phone number");
  return db.$transaction(async (tx) => {
  for (const identity of [emailNorm, phoneE164].filter(Boolean).sort()) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))`;
  }
  const emailMatch = await tx.crmContact.findFirst({
    where: { OR: [{ emailNorm }, { email: { equals: emailNorm, mode: "insensitive" } }] },
  });

  const phoneMatch = phoneE164
    ? await tx.crmContact.findFirst({
        where: { phoneE164 },
      })
    : null;

  if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
    const inquiry = await tx.inquiry.create({
      data: {
        name: data.name,
        email: data.email,
        emailNorm,
        phone: data.phone || null,
        phoneE164,
        companyName: data.companyName || null,
        serviceType: data.serviceType || null,
        budgetRange: data.budgetRange || null,
        timeline: data.timeline || null,
        message: data.message,
        source: data.source || "website",
        locale: data.locale || "ar",
        mergeFlag: true,
        customerId: null,
      },
    });

    return {
      customerId: null,
      inquiryId: inquiry.id,
      resolution: "merge_conflict",
    };
  }

  const existingContact = emailMatch || phoneMatch;
  if (existingContact) {
    const inquiry = await tx.inquiry.create({
      data: {
        name: data.name,
        email: data.email,
        emailNorm,
        phone: data.phone || null,
        phoneE164,
        companyName: data.companyName || null,
        serviceType: data.serviceType || null,
        budgetRange: data.budgetRange || null,
        timeline: data.timeline || null,
        message: data.message,
        source: data.source || "website",
        locale: data.locale || "ar",
        mergeFlag: false,
        customerId: existingContact.id,
      },
    });

    return {
      customerId: existingContact.id,
      inquiryId: inquiry.id,
      resolution: "existing_customer",
    };
  }

  const nameParts = data.name.trim().split(" ");
  const firstName = nameParts[0] || data.name;
  const lastName = nameParts.slice(1).join(" ") || undefined;

  const newContact = await tx.crmContact.create({
    data: {
      firstName,
      lastName,
      email: data.email,
      emailNorm,
      phone: data.phone || null,
      phoneE164,
      companyName: data.companyName || null,
      contactType: "client",
    },
  });

  const inquiry = await tx.inquiry.create({
    data: {
      name: data.name,
      email: data.email,
      emailNorm,
      phone: data.phone || null,
      phoneE164,
      companyName: data.companyName || null,
      serviceType: data.serviceType || null,
      budgetRange: data.budgetRange || null,
      timeline: data.timeline || null,
      message: data.message,
      source: data.source || "website",
      locale: data.locale || "ar",
      mergeFlag: false,
      customerId: newContact.id,
    },
  });

  return {
    customerId: newContact.id,
    inquiryId: inquiry.id,
    resolution: "new_customer",
  };
  });
}
