import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { referencePrefixFor } from "../constants/requests";
import { getNextSequenceNumber } from "../queries/sequence";
import { formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { getCompanyConfiguration } from "../api/company";

function slaDueFor(priority?: string | null, from = new Date()) {
  const hours = priority === "urgent" ? 4 : priority === "high" ? 24 : 72;
  return new Date(from.getTime() + hours * 3_600_000);
}

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
  /** The store order the customer is asking about (their own, checked by the caller). */
  orderId?: string;
  priority?: "urgent" | "high" | "normal";
  /** The marketing campaign that brought the visitor (utm_campaign). */
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
  return db.$transaction(async (tx) => {
    if (data.submissionKey) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.submissionKey}, 0))::text`;
      const prior = await tx.inquiry.findUnique({
        where: { submissionKey: data.submissionKey },
      });
      if (prior) {
        if (prior.requestHash !== data.requestHash)
          throw new Error(serverMessages.submissionKeyAlreadyUsed);
        return {
          customerId: prior.customerId,
          inquiryId: prior.id,
          reference: prior.reference,
          repeated: true,
          confirmationStatus: prior.confirmationStatus,
          resolution: "feedback" as const,
        };
      }
    }
    for (const identity of [emailNorm, phoneE164].filter(Boolean).sort()) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))::text`;
    }
    let customerId: string | null = null;
    let resolution: ResolvedLeadResult["resolution"] = "feedback";
    if (intent === "inquiry" || intent === "quote_request") {
      const emailMatches = emailNorm
        ? await tx.crmContact.findMany({
            take: 2,
            where: {
              OR: [
                { emailNorm },
                { email: { equals: emailNorm, mode: "insensitive" } },
              ],
            },
          })
        : [];
      const phoneMatches = phoneE164
        ? await tx.crmContact.findMany({ where: { phoneE164 }, take: 2 })
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
          const contact = await tx.crmContact.create({
            data: {
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
          });
          customerId = contact.id;
          resolution = "new_customer";
        }
      }
    }
    const inquiry = await tx.inquiry.create({
      data: {
        reference: await getNextSequenceNumber(
          referencePrefixFor({ intent }),
          undefined,
          tx,
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
        // Every request starts with the service desk's promised resolution time for its priority.
        slaDueDate: slaDueFor(data.priority, new Date()),
      },
    });
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
