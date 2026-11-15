import { slaDueFor } from "./service-sla";
import { serverMessages } from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
import { runAtomicMutation } from "../api/atomic";
import { referencePrefixFor } from "../constants/requests";
import { getNextSequenceNumber } from "../queries/sequence";
import { formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { getCompanyConfiguration } from "../api/company";

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
    "new_customer" | "existing_customer" | "merge_conflict" | "feedback";
}

export async function resolveIncomingLead(
  data: ResolveLeadInput,
): Promise<ResolvedLeadResult> {
  if (data.email && !isValidEmail(data.email)) throw new Error(serverMessages.customerEmailInvalid);
  const emailNorm = normalizeEmail(data.email);
  const company = data.phone ? await getCompanyConfiguration().catch(() => null) : null;
  const phoneE164 = data.phone ? normalizeToE164(data.phone, company?.country ?? undefined) : null;
  if (data.phone && !phoneE164)
    throw new Error(serverMessages.invalidPhoneNumber);
  const intent = data.intent || "inquiry";
  return runAtomicMutation(async () => {
    if (data.submissionKey) {
      const inquiries = await listTableRows<Record<string, any>>(
        "sales",
        "inquiry",
      );
      const prior = inquiries.find(
        (i) => i.submissionKey === data.submissionKey,
      );
      if (prior) {
        if (prior.requestHash !== data.requestHash)
          throw new Error(serverMessages.submissionKeyAlreadyUsed);
        return {
          customerId: prior.customerId ?? null,
          inquiryId: prior.id,
          reference: prior.reference,
          repeated: true,
          confirmationStatus: prior.confirmationStatus,
          resolution: "feedback" as const,
        };
      }
    }
    let customerId: string | null = null;
    let resolution: ResolvedLeadResult["resolution"] = "feedback";
    if (intent === "inquiry" || intent === "quote_request") {
      const contacts = await listTableRows<Record<string, any>>(
        "sales",
        "crm_contact",
      );
      const emailMatches = emailNorm
        ? contacts
            .filter(
              (c) =>
                c.emailNorm === emailNorm ||
                (typeof c.email === "string" &&
                  c.email.toLowerCase() === emailNorm.toLowerCase()),
            )
            .slice(0, 2)
        : [];
      const phoneMatches = phoneE164
        ? contacts.filter((c) => c.phoneE164 === phoneE164).slice(0, 2)
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
          const contact = await upsertTableRow<Record<string, any>>(
            "sales",
            "crm_contact",
            {
              id: crypto.randomUUID(),
              firstName,
              lastName: rest.join(" ") || null,
              email: data.email || null,
              emailNorm: emailNorm || null,
              phone: data.phone || null,
              phoneE164,
              companyName: data.companyName || null,
              clientKind: data.companyName ? "company" : "individual",
              contactType: "client",
            },
          );
          customerId = contact.id;
          resolution = "new_customer";
        }
      }
    }
    const inquiry = await upsertTableRow<Record<string, any>>(
      "sales",
      "inquiry",
      {
        id: crypto.randomUUID(),
        reference: await getNextSequenceNumber(
          referencePrefixFor({ intent }),
        ),
        name: data.name,
        email: data.email,
        emailNorm: emailNorm || null,
        phone: data.phone || null,
        phoneE164,
        companyName: data.companyName || null,
        serviceType: data.serviceType || null,
        serviceIds: data.serviceIds || [],
        budgetRange: data.budgetRange || null,
        timeline: data.timeline || null,
        message: data.message,
        source: data.source || "website",
        locale: data.locale || "ar",
        intent,
        submissionKey: data.submissionKey,
        requestHash: data.requestHash,
        projectReference: data.projectReference || null,
        location: data.location || null,
        confirmationStatus: emailNorm ? "pending" : "not_requested",
        notificationStatus: "pending",
        mergeFlag: resolution === "merge_conflict",
        customerId,
        orderId: data.orderId || null,
        utmCampaign: data.utmCampaign || null,
        priority: data.priority || "normal",
        slaDueDate: await slaDueFor(data.priority, new Date()),
      },
    );
    return {
      customerId,
      inquiryId: inquiry.id,
      reference: inquiry.reference,
      repeated: false,
      confirmationStatus: inquiry.confirmationStatus,
      resolution,
    };
  });
}
