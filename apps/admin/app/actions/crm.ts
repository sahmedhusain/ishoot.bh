"use server";
import { serverMessages } from "@ishoot/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@ishoot/database";
import { runAtomicMutation } from "@ishoot/database";
import type { ClientProfileInput } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import {
updateDealStage,
createCRMDeal,
updateCRMDeal,
createCRMContact,
updateCRMContact,
deleteCRMContact,
updateInquiryStatus,createActivityLog,
lookupCRMContactByEmailOrPhone,
searchCRMContacts,
globalAdminSearch,
hasPermission,
DealStage,
InquiryStatus
} from "@ishoot/database";
import { requireInquiryAccess } from "../../lib/inquiry-access";
import { REQUEST_PRIORITIES } from "@ishoot/database/constants/requests";
import { revalidatePath } from "next/cache";
import { requireAuth,requirePermission } from "../../lib/auth";
import { requireFeatureEnabled } from "@ishoot/database";

export async function updateDealStageAction(id: string, stage: DealStage) {
  return measureOperation("action:updateDealStageAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requirePermission("deals", "write");
    validateActionArguments("updateDealStageAction", { id, stage });
    const { deal } = await runAtomicMutation(async () => {
      const deal = await updateDealStage(id, stage);
      if (!deal)
        throw new Error(
          "Deal stage update failed; closed lost requires a lost reason",
        );
      await createActivityLog({
        user_id: user.id,
        action: "stage_change",
        entity_type: "deal",
        entity_id: id,
        details: { stage },
      });
      return { deal };
    });

    revalidatePath(ROUTES.crm.deals);
    revalidatePath(ROUTES.home);
    return { success: true, deal };
  });
}

export async function createCRMDealAction(data: {
  title: string;
  value: number;
  stage?: DealStage;
  contact_id?: string;
  shoot_date?: string;
  target_close_date?: string;
  notes?: string;
}) {
  return measureOperation("action:createCRMDealAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requirePermission("deals", "write");
    validateActionArguments("createCRMDealAction", { data });
    if (data.contact_id) await requirePermission("contacts", "read");
    const { deal } = await runAtomicMutation(async () => {
      const deal = await createCRMDeal(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "deal",
        entity_id: deal.id,
        details: { title: data.title, value: data.value, stage: data.stage },
      });
      return { deal };
    });

    revalidatePath(ROUTES.crm.deals);
    revalidatePath(ROUTES.home);
    return { success: true, deal };
  });
}

export async function updateDealAction(
  id: string,
  data: Partial<{
    title: string;
    value: number;
    currency: import("@ishoot/database/types").SupportedCurrency;
    stage: DealStage;
    probability: number;
    contact_id: string;
    shoot_date: string | null;
    target_close_date: string | null;
    notes: string;
    assigned_to: string | null;
    lost_reason: string | null;
  }>,
) {
  return measureOperation("action:updateDealAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requirePermission("deals", "write");
    validateActionArguments("updateDealAction", { id, data });
    if (data.contact_id) await requirePermission("contacts", "read");
    if (data.assigned_to) await requirePermission("users", "read");
    const { deal } = await runAtomicMutation(async () => {
      const deal = await updateCRMDeal(id, data);
      if (!deal) throw new Error(serverMessages.dealUpdateFailed);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "deal",
        entity_id: id,
        details: data,
      });
      return { deal };
    });

    revalidatePath(ROUTES.crm.deals);
    revalidatePath(ROUTES.crm.deal(id));
    revalidatePath(ROUTES.home);
    return { success: true, deal };
  });
}

export async function createContactAction(data: ClientProfileInput) {
  return measureOperation("action:createContactAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requirePermission("contacts", "write");
    validateActionArguments("createContactAction", { data });
    const { contact } = await runAtomicMutation(async () => {
      const contact = await createCRMContact(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "contact",
        entity_id: contact.id,
        details: { name: contact.company || contact.full_name, kind: contact.client_kind, email: contact.email },
      });
      return { contact };
    });

    revalidatePath(ROUTES.crm.contacts);
    return { success: true, contact };
  });
}

export async function updateContactAction(
  id: string,
  data: ClientProfileInput,
) {
  return measureOperation("action:updateContactAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requirePermission("contacts", "write");
    validateActionArguments("updateContactAction", { id, data });
    const { contact } = await runAtomicMutation(async () => {
      const contact = await updateCRMContact(id, data);
      if (!contact) throw new Error(serverMessages.contactUpdateFailed);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "contact",
        entity_id: id,
        details: data,
      });
      return { contact };
    });

    revalidatePath(ROUTES.crm.contacts);
    revalidatePath(ROUTES.crm.customer(id));
    return { success: true, contact };
  });
}

export async function deleteContactAction(id: string) {
  return measureOperation("action:deleteContactAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requirePermission("contacts", "delete");
    validateActionArguments("deleteContactAction", { id });
    await runAtomicMutation(async () => {
      if (!(await deleteCRMContact(id)))
        throw new Error(serverMessages.contactDeletionFailed);
      await createActivityLog({
        user_id: user.id,
        action: "delete",
        entity_type: "contact",
        entity_id: id,
      });
      return {};
    });

    revalidatePath(ROUTES.crm.contacts);
    return { success: true };
  });
}

export async function lookupClientAction(term: string) {
  return measureOperation("action:lookupClientAction", async () => {
    await requireFeatureEnabled("crm_deals"); await requirePermission("contacts", "read");
    validateActionArguments("lookupClientAction", { term });
    const contact = await lookupCRMContactByEmailOrPhone(term);
    return { success: !!contact, contact };
  });
}

export async function searchContactsAction(query: string) {
  return measureOperation("action:searchContactsAction", async () => {
    await requireFeatureEnabled("crm_deals"); await requirePermission("contacts", "read");
    validateActionArguments("searchContactsAction", { query });
    const contacts = await searchCRMContacts(query, 12);
    return { success: true, contacts };
  });
}

export async function globalSearchAction(query: string) {
  return measureOperation("action:globalSearchAction", async () => {
    const user = await requireAuth();
    validateActionArguments("globalSearchAction", { query });
    const categories = {
      customers: "contacts",
      invoices: "invoices",
      deals: "deals",
    } as const;
    const allowed = new Set<string>();
    for (const [category, resource] of Object.entries(categories)) {
      if (
        await hasPermission(
          user.role,
          resource,
          "read",
          user.permissions as Record<string, boolean> | undefined,
        )
      )
        allowed.add(category);
    }
    const results = await globalAdminSearch(query, 8, allowed);
    return {
      success: true,
      results: results.filter((result) => allowed.has(result.category)),
    };
  });
}

export async function updateInquiryStatusAction(
  id: string,
  status: InquiryStatus,
) {
  return measureOperation("action:updateInquiryStatusAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requireInquiryAccess(id, "write");
    validateActionArguments("updateInquiryStatusAction", { id, status });
    if (
      ![
        "new",
        "contacted",
        "qualified",
        "archived",
        "in_progress",
        "waiting",
        "resolved",
      ].includes(status)
    )
      throw new Error(serverMessages.invalidStatus);
    const { db } = await import("@ishoot/database");
    const current = await db.inquiry.findUniqueOrThrow({ where: { id } });
    if (
      ["complaint", "suggestion"].includes(current.intent) &&
      ["contacted", "qualified"].includes(status)
    )
      throw new Error(serverMessages.invalidFeedbackStatus);
    const { inquiry } = await runAtomicMutation(async () => {
      const inquiry = await updateInquiryStatus(id, status);
      if (!inquiry) throw new Error(serverMessages.couldNotSaveRequestStatus);
      await createActivityLog({
        user_id: user.id,
        action: "update",
        entity_type: "lead",
        entity_id: id,
        details: { status },
      });
      return { inquiry };
    });

    revalidatePath(ROUTES.requests.list);
    revalidatePath(ROUTES.home);
    return { success: true, inquiry };
  });
}

export async function convertInquiryToClientAction(inquiryId: string) {
  return measureOperation("action:convertInquiryToClientAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requireInquiryAccess(inquiryId, "write");
    validateActionArguments("convertInquiryToClientAction", { inquiryId });
    await requirePermission("contacts", "write");
    await requirePermission("deals", "write");

    const { db } = await import("@ishoot/database");

    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Inquiry" WHERE id = ${inquiryId} FOR UPDATE`;
      const inquiry = await tx.inquiry.findUnique({
        where: { id: inquiryId },
      });

      if (!inquiry) {
        throw new Error(serverMessages.inquiryNotFound);
      }

      if (inquiry.mergeFlag)
        throw new Error(
          "Resolve the contact conflict before converting this inquiry",
        );
      if (!["inquiry", "quote_request"].includes(inquiry.intent))
        throw new Error(serverMessages.onlySalesRequestsCanBeConverted);
      const priorConversion = await tx.crmDeal.findUnique({
        where: { sourceInquiryId: inquiryId },
        select: { id: true, contactId: true },
      });
      if (priorConversion) {
        return {
          contactId: priorConversion.contactId,
          dealId: priorConversion.id,
          alreadyConverted: true,
        };
      }

      // Contact details are not a unique identity. Never pick an arbitrary duplicate.
      const matches = inquiry.customerId
        ? []
        : await tx.crmContact.findMany({
            take: 2,
            where: {
              OR: [
                ...(inquiry.email
                  ? [
                      {
                        email: {
                          equals: inquiry.email.trim(),
                          mode: "insensitive" as const,
                        },
                      },
                    ]
                  : []),
                ...(inquiry.phone ? [{ phone: inquiry.phone }] : []),
              ],
            },
          });
      if (matches.length > 1)
        throw new Error(
          "Select the customer explicitly before converting this inquiry",
        );
      let contact = inquiry.customerId
        ? await tx.crmContact.findUnique({ where: { id: inquiry.customerId } })
        : matches[0];

      // 2. If not, create contact
      if (!contact) {
        const parts = (inquiry.name || "").trim().split(/\s+/);
        const firstName = parts[0] || inquiry.name;
        const lastName = parts.slice(1).join(" ") || "";

        contact = await tx.crmContact.create({
          data: {
            firstName,
            lastName,
            companyName: inquiry.companyName || null,
            clientKind: inquiry.companyName ? "company" : "individual",
            email: inquiry.email,
            emailNorm: inquiry.email.trim().toLowerCase(),
            phone: inquiry.phone || null,
            phoneE164: inquiry.phoneE164,
            contactType: "client",
            notes: `Converted from Website Inquiry.\nMessage: ${inquiry.message || "N/A"}`,
          },
        });
      }

      // 3. Link inquiry to contact and set status to qualified
      await tx.inquiry.update({
        where: { id: inquiryId },
        data: {
          customerId: contact.id,
          status: "qualified",
        },
      });

      // 4. Create Deal
      let estimatedValue = 0;
      if (inquiry.budgetRange) {
        const numbers = inquiry.budgetRange
          .replace(/,/g, "")
          .match(/\d+(?:\.\d+)?/g);
        if (numbers && numbers.length > 0) {
          estimatedValue = /^(under|not sure)/i.test(inquiry.budgetRange)
            ? 0
            : Number(numbers[0]) || 0;
        }
      }

      const dealTitle = `${inquiry.companyName || inquiry.name} — Production Project`;
      const servicesList = inquiry.serviceType || "";

      const deal = await tx.crmDeal.create({
        data: {
          sourceInquiryId: inquiryId,
          title: dealTitle,
          dealValue: estimatedValue,
          dealStage: "lead",
          contactId: contact.id,
          notes: `Services requested: ${servicesList}\nClient message: ${inquiry.message || ""}`,
        },
      });

      // 5. Activity log within transaction
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "create",
          entityType: "deal",
          entityId: deal.id,
          details: {
            convertedFromInquiry: inquiryId,
            contactId: contact.id,
            title: dealTitle,
          },
        },
      });

      return {
        contactId: contact.id,
        dealId: deal.id,
        alreadyConverted: false,
      };
    });

    revalidatePath(ROUTES.requests.list);
    revalidatePath(ROUTES.crm.contacts);
    revalidatePath(ROUTES.crm.deals);
    revalidatePath(ROUTES.home);

    return {
      success: true,
      contactId: result.contactId,
      dealId: result.dealId,
    };
  });
}

export async function manageInquiryAction(
  id: string,
  data: { priority?: string; claim?: boolean; note?: string; slaDueDate?: string | null },
) {
  return measureOperation("action:manageInquiryAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requireInquiryAccess(id, "write");
    validateActionArguments("manageInquiryAction", { id, data });
    const { db } = await import("@ishoot/database");
    if (data.priority && !(REQUEST_PRIORITIES as readonly string[]).includes(data.priority))
      throw new Error(serverMessages.invalidPriority);
    const slaDueDate = data.slaDueDate === undefined ? undefined : data.slaDueDate === null || data.slaDueDate === "" ? null : new Date(data.slaDueDate);
    if (slaDueDate && Number.isNaN(slaDueDate.getTime())) throw new Error(serverMessages.invalidSlaDate);
    if (
      data.note !== undefined &&
      (typeof data.note !== "string" ||
        !data.note.trim() ||
        data.note.length > 5000)
    )
      throw new Error(serverMessages.invalidNote);
    await db.$transaction(async (tx) => {
      await tx.inquiry.update({
        where: { id },
        data: {
          ...(data.priority ? { priority: data.priority } : {}),
          ...(slaDueDate !== undefined ? { slaDueDate } : {}),
          ...(data.claim ? { assignedToId: user.id } : {}),
          ...(data.note
            ? {
                notes: {
                  create: { body: data.note.trim(), authorId: user.id },
                },
              }
            : {}),
        },
      });
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entityType: "inquiry",
          entityId: id,
          details: {
            priority: data.priority,
            slaDueDate: data.slaDueDate,
            claimed: data.claim,
            noteAdded: !!data.note,
          },
        },
      });
    });
    revalidatePath(ROUTES.requests.list);
    revalidatePath(ROUTES.requests.detail(id));
    return { success: true };
  });
}

export async function linkInquiryCustomerAction(
  inquiryId: string,
  customerId: string,
) {
  return measureOperation("action:linkInquiryCustomerAction", async () => {
    await requireFeatureEnabled("crm_deals"); const user = await requireInquiryAccess(inquiryId, "write");
    validateActionArguments("linkInquiryCustomerAction", {
      inquiryId,
      customerId,
    });
    await requirePermission("contacts", "write");
    const { db } = await import("@ishoot/database");
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Inquiry" WHERE id=${inquiryId} FOR UPDATE`;
      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id: inquiryId },
        select: { intent: true },
      });
      if (!["inquiry", "quote_request"].includes(inquiry.intent))
        throw new Error(serverMessages.onlySalesRequestsCanBeLinkedHere);
      if (
        await tx.crmDeal.findUnique({
          where: { sourceInquiryId: inquiryId },
          select: { id: true },
        })
      )
        throw new Error(serverMessages.convertedInquiriesCannotBeRelinked);
      await tx.crmContact.findUniqueOrThrow({
        where: { id: customerId },
        select: { id: true },
      });
      await tx.inquiry.update({
        where: { id: inquiryId },
        data: { customerId, mergeFlag: false },
      });
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "link_customer",
          entityType: "inquiry",
          entityId: inquiryId,
          details: { customerId },
        },
      });
    });
    revalidatePath(ROUTES.requests.list);
    return { success: true };
  });
}
