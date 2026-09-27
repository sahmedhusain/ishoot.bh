import { db } from '../db';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizeToE164(phone: string, defaultCountry = 'BH'): string | null {
  try {
    const clean = phone.trim();
    if (!clean) return null;
    const parsed = parsePhoneNumberFromString(clean, defaultCountry as any);
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
    // Fallback: strip spaces and keep leading + or digits
    const digitsOnly = clean.replace(/[^0-9+]/g, '');
    if (digitsOnly.startsWith('+')) return digitsOnly;
    if (digitsOnly.length === 8) return `+973${digitsOnly}`;
    return `+${digitsOnly}`;
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
  source?: 'website' | 'email' | 'whatsapp' | 'manual';
  locale?: string;
}

export interface ResolvedLeadResult {
  customerId: string | null;
  inquiryId: string;
  resolution: 'new_customer' | 'existing_customer' | 'merge_conflict';
}

export async function resolveIncomingLead(data: ResolveLeadInput): Promise<ResolvedLeadResult> {
  const emailNorm = data.email.trim().toLowerCase();
  const phoneE164 = data.phone ? normalizeToE164(data.phone, 'BH') : null;

  // 1. Check for matches on emailNorm or phoneE164
  const emailMatch = await db.crmContact.findFirst({
    where: { emailNorm },
  });

  const phoneMatch = phoneE164
    ? await db.crmContact.findFirst({
        where: { phoneE164 },
      })
    : null;

  // Case A: Conflicting identities (email belongs to Contact A, phone belongs to Contact B)
  if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
    const inquiry = await db.inquiry.create({
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
        source: data.source || 'website',
        locale: data.locale || 'ar',
        mergeFlag: true,
        customerId: null,
      },
    });

    return {
      customerId: null,
      inquiryId: inquiry.id,
      resolution: 'merge_conflict',
    };
  }

  // Case B: Existing contact match (email or phone)
  const existingContact = emailMatch || phoneMatch;
  if (existingContact) {
    const inquiry = await db.inquiry.create({
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
        source: data.source || 'website',
        locale: data.locale || 'ar',
        mergeFlag: false,
        customerId: existingContact.id,
      },
    });

    return {
      customerId: existingContact.id,
      inquiryId: inquiry.id,
      resolution: 'existing_customer',
    };
  }

  // Case C: New contact — create CrmContact and link Inquiry
  const nameParts = data.name.trim().split(' ');
  const firstName = nameParts[0] || data.name;
  const lastName = nameParts.slice(1).join(' ') || undefined;

  const newContact = await db.crmContact.create({
    data: {
      firstName,
      lastName,
      email: data.email,
      emailNorm,
      phone: data.phone || null,
      phoneE164,
      companyName: data.companyName || null,
      contactType: 'client',
    },
  });

  const inquiry = await db.inquiry.create({
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
      source: data.source || 'website',
      locale: data.locale || 'ar',
      mergeFlag: false,
      customerId: newContact.id,
    },
  });

  return {
    customerId: newContact.id,
    inquiryId: inquiry.id,
    resolution: 'new_customer',
  };
}
