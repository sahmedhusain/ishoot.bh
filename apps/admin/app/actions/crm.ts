"use server";

import {
  updateDealStage,
  createCRMDeal,
  updateCRMDeal,
  createCRMContact,
  updateCRMContact,
  deleteCRMContact,
  updateInquiryStatus,
  deleteInquiry,
  createActivityLog,
  lookupCRMContactByEmailOrPhone,
  searchCRMContacts,
  globalAdminSearch,
  hasPermission,
  DealStage,
  InquiryStatus,
} from "@ishoot/database";
import { requireInquiryAccess } from "../../lib/inquiry-access";
import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "../../lib/auth";

export async function updateDealStageAction(id: string, stage: DealStage) {
  const user = await requirePermission("deals", "write");
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

  revalidatePath("/dashboard/crm/deals");
  revalidatePath("/dashboard");
  return { success: true, deal };
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
  const user = await requirePermission("deals", "write");
  const deal = await createCRMDeal(data);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "deal",
    entity_id: deal.id,
    details: { title: data.title, value: data.value, stage: data.stage },
  });

  revalidatePath("/dashboard/crm/deals");
  revalidatePath("/dashboard");
  return { success: true, deal };
}

export async function updateDealAction(id: string, data: any) {
  const user = await requirePermission("deals", "write");
  const deal = await updateCRMDeal(id, data);
  if (!deal) throw new Error("Deal update failed");

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "deal",
    entity_id: id,
    details: data,
  });

  revalidatePath("/dashboard/crm/deals");
  revalidatePath(`/dashboard/crm/deals/${id}`);
  revalidatePath("/dashboard");
  return { success: true, deal };
}

export async function createContactAction(data: {
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  contact_type?: "client" | "agency" | "vendor" | "freelancer";
  notes?: string;
}) {
  const user = await requirePermission("contacts", "write");
  const contact = await createCRMContact(data);

  await createActivityLog({
    user_id: user.id,
    action: "create",
    entity_type: "contact",
    entity_id: contact.id,
    details: { name: data.full_name, email: data.email },
  });

  revalidatePath("/dashboard/crm/contacts");
  return { success: true, contact };
}

export async function updateContactAction(id: string, data: any) {
  const user = await requirePermission("contacts", "write");
  const contact = await updateCRMContact(id, data);
  if (!contact) throw new Error("Contact update failed");

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "contact",
    entity_id: id,
    details: data,
  });

  revalidatePath("/dashboard/crm/contacts");
  revalidatePath(`/dashboard/crm/customers/${id}`);
  return { success: true, contact };
}

export async function deleteContactAction(id: string) {
  const user = await requirePermission("contacts", "delete");
  if (!(await deleteCRMContact(id))) throw new Error("Contact deletion failed");

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "contact",
    entity_id: id,
  });

  revalidatePath("/dashboard/crm/contacts");
  return { success: true };
}

export async function lookupClientAction(term: string) {
  await requirePermission("contacts", "read");
  const contact = await lookupCRMContactByEmailOrPhone(term);
  return { success: !!contact, contact };
}

export async function searchContactsAction(query: string) {
  await requirePermission("contacts", "read");
  const contacts = await searchCRMContacts(query, 12);
  return { success: true, contacts };
}

export async function globalSearchAction(query: string) {
  const user = await requireAuth();
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
  const results = await globalAdminSearch(query, 8);
  return {
    success: true,
    results: results.filter((result) => allowed.has(result.category)),
  };
}

export async function updateInquiryStatusAction(
  id: string,
  status: InquiryStatus,
) {
  const user = await requireInquiryAccess(id, "write");
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
    throw new Error("Invalid status");
  const { db } = await import("@ishoot/database");
  const current = await db.inquiry.findUniqueOrThrow({ where: { id } });
  if (
    ["complaint", "suggestion"].includes(current.intent) &&
    ["contacted", "qualified"].includes(status)
  )
    throw new Error("Invalid feedback status");
  const inquiry = await updateInquiryStatus(id, status);
  if (!inquiry) throw new Error("Could not save request status");

  await createActivityLog({
    user_id: user.id,
    action: "update",
    entity_type: "lead",
    entity_id: id,
    details: { status },
  });

  revalidatePath("/dashboard/crm/leads");
  revalidatePath("/dashboard");
  return { success: true, inquiry };
}

export async function deleteInquiryAction(id: string) {
  const user = await requireInquiryAccess(id, "delete");
  if (!(await deleteInquiry(id))) throw new Error("Could not delete request");

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "lead",
    entity_id: id,
  });

  revalidatePath("/dashboard/crm/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function convertInquiryToClientAction(inquiryId: string) {
  const user = await requirePermission("leads", "write");

  const { db } = await import("@ishoot/database");

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Inquiry" WHERE id = ${inquiryId} FOR UPDATE`;
    const inquiry = await tx.inquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      throw new Error("Inquiry not found");
    }

    if (inquiry.mergeFlag)
      throw new Error(
        "Resolve the contact conflict before converting this inquiry",
      );
    // ponytail: audit metadata holds conversion identity; add an inquiry/deal FK before pruning audit history.
    if (!["inquiry", "quote_request"].includes(inquiry.intent))
      throw new Error("Only sales requests can be converted");
    const priorConversion = await tx.activityLog.findFirst({
      where: {
        entityType: "deal",
        action: "create",
        details: { path: ["convertedFromInquiry"], equals: inquiryId },
      },
    });
    if (priorConversion?.entityId && inquiry.customerId) {
      return {
        contactId: inquiry.customerId,
        dealId: priorConversion.entityId,
        alreadyConverted: true,
      };
    }

    // 1. Check if contact exists by normalized email or phone
    let contact = inquiry.customerId
      ? await tx.crmContact.findUnique({ where: { id: inquiry.customerId } })
      : await tx.crmContact.findFirst({
          where: {
            OR: [
              ...(inquiry.email ? [{ email: inquiry.email }] : []),
              ...(inquiry.phone ? [{ phone: inquiry.phone }] : []),
            ],
          },
        });

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
    let estimatedValue = 1000;
    if (inquiry.budgetRange) {
      const numbers = inquiry.budgetRange
        .replace(/,/g, "")
        .match(/\d+(?:\.\d+)?/g);
      if (numbers && numbers.length > 0) {
        estimatedValue = Number(numbers[0]) || 1000;
      }
    }

    const dealTitle = `${inquiry.companyName || inquiry.name} — Production Project`;
    const servicesList = inquiry.serviceType || "";

    const deal = await tx.crmDeal.create({
      data: {
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

  revalidatePath("/dashboard/crm/leads");
  revalidatePath("/dashboard/crm/contacts");
  revalidatePath("/dashboard/crm/deals");
  revalidatePath("/dashboard");

  return {
    success: true,
    contactId: result.contactId,
    dealId: result.dealId,
  };
}

export async function manageInquiryAction(
  id: string,
  data: { priority?: string; claim?: boolean; note?: string },
) {
  const user = await requireInquiryAccess(id, "write");
  const { db } = await import("@ishoot/database");
  if (data.priority && !["normal", "high", "urgent"].includes(data.priority))
    throw new Error("Invalid priority");
  if (
    data.note !== undefined &&
    (typeof data.note !== "string" ||
      !data.note.trim() ||
      data.note.length > 5000)
  )
    throw new Error("Invalid note");
  await db.$transaction(async (tx) => {
    await tx.inquiry.update({
      where: { id },
      data: {
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.claim ? { assignedToId: user.id } : {}),
        ...(data.note
          ? { notes: { create: { body: data.note.trim(), authorId: user.id } } }
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
          claimed: data.claim,
          noteAdded: !!data.note,
        },
      },
    });
  });
  revalidatePath("/dashboard/crm/leads");
  return { success: true };
}
