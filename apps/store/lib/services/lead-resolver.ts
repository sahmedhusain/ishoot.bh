import { randomUUID } from "node:crypto";
import { serverMessages } from "@platform/locales";
import { getCompanyConfiguration } from "../api/company";
import { createContact, createInquiry, listContacts } from "../api/sales";
import { referencePrefixFor } from "../constants/requests";
import { formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { getNextSequenceNumber } from "../queries/sequence";

export function normalizeToE164(phone: string, defaultCountry?: string): string | null {
  return formatPhoneE164(phone, undefined, defaultCountry) || null;
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
  intent?: "inquiry" | "quote_request" | "complaint" | "suggestion";
  submissionKey?: string;
  requestHash?: string;
  serviceIds?: string[];
  projectReference?: string;
  location?: string;
  orderId?: string;
  priority?: "urgent" | "high" | "normal";
  utmCampaign?: string | null;
}

export interface ResolvedLeadResult {
  customerId: string | null;
  inquiryId: string;
  reference: string;
  repeated: boolean;
  confirmationStatus: string;
  resolution:
    | "new_customer"
    | "existing_customer"
    | "merge_conflict"
    | "feedback";
}

const submissionCache = new Map<
  string,
  { requestHash?: string; result: ResolvedLeadResult }
>();

export async function resolveIncomingLead(
  data: ResolveLeadInput,
): Promise<ResolvedLeadResult> {
  if (data.email && !isValidEmail(data.email)) {
    throw new Error(serverMessages.customerEmailInvalid);
  }
  const emailNorm = normalizeEmail(data.email);
  const company = data.phone
    ? await getCompanyConfiguration().catch(() => null)
    : null;
  const phoneE164 = data.phone
    ? normalizeToE164(data.phone, company?.country ?? undefined)
    : null;
  if (data.phone && !phoneE164) {
    throw new Error(serverMessages.invalidPhoneNumber);
  }

  const intent = data.intent || "inquiry";
  if (data.submissionKey) {
    const prior = submissionCache.get(data.submissionKey);
    if (prior) {
      if (prior.requestHash !== data.requestHash) {
        throw new Error(serverMessages.submissionKeyAlreadyUsed);
      }
      return {
        ...prior.result,
        repeated: true,
        resolution: "feedback",
      };
    }
  }

  let customerId: string | null = null;
  let resolution: ResolvedLeadResult["resolution"] = "feedback";

  if (intent === "inquiry" || intent === "quote_request") {
    const contacts = await listContacts().catch(() => []);
    const emailMatches = emailNorm
      ? contacts.filter((c) => normalizeEmail(c.email ?? "") === emailNorm)
      : [];
    const phoneMatches = phoneE164
      ? contacts.filter(
          (c) => (c.phone ? normalizeToE164(c.phone, company?.country ?? undefined) : null) === phoneE164,
        )
      : [];

    const emailMatch = emailMatches.length === 1 ? emailMatches[0] : null;
    const phoneMatch = phoneMatches.length === 1 ? phoneMatches[0] : null;

    if (
      emailMatches.length > 1 ||
      phoneMatches.length > 1 ||
      (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id)
    ) {
      resolution = "merge_conflict";
    } else {
      const existing = emailMatch || phoneMatch;
      if (existing) {
        customerId = existing.id;
        resolution = "existing_customer";
      } else {
        const [firstName, ...rest] = data.name.trim().split(/\s+/);
        const createdContact = await createContact({
          firstName: firstName || data.name,
          lastName: rest.join(" ") || null,
          email: data.email || null,
          phone: phoneE164 || data.phone || null,
          company: data.companyName || null,
          contactType: "client",
          status: "active",
        }).catch(() => null);
        customerId = createdContact?.id ?? randomUUID();
        resolution = "new_customer";
      }
    }
  }

  const reference = await getNextSequenceNumber(referencePrefixFor({ intent }));
  const subjectParts = [
    data.serviceType || reference,
    data.projectReference ? `[${data.projectReference}]` : "",
  ].filter(Boolean);
  const messageBody = [
    data.companyName ? `Company: ${data.companyName}` : "",
    data.budgetRange ? `Budget: ${data.budgetRange}` : "",
    data.timeline ? `Timeline: ${data.timeline}` : "",
    data.location ? `Location: ${data.location}` : "",
    data.orderId ? `Order ID: ${data.orderId}` : "",
    data.message,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await createInquiry({
    inquiryType: intent,
    subject: subjectParts.join(" — ").slice(0, 200),
    message: messageBody,
    status: "new",
    priority: data.priority || "normal",
    requesterName: data.name,
    requesterEmail: data.email,
    requesterPhone: phoneE164 || data.phone || null,
  });

  const result: ResolvedLeadResult = {
    customerId,
    inquiryId: created.id,
    reference,
    repeated: false,
    confirmationStatus: emailNorm ? "pending" : "not_requested",
    resolution,
  };

  if (data.submissionKey) {
    if (submissionCache.size > 5000) submissionCache.clear();
    submissionCache.set(data.submissionKey, {
      requestHash: data.requestHash,
      result,
    });
  }

  return result;
}
