"use server";
import { assertCompanyCurrency } from "@platform/database/finance/company-currency";
import { serverMessages } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { measureOperation } from "@platform/database";
import { runAtomicMutation } from "@platform/database";
import type { ClientProfileInput } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";

import {
  updateDealStage,
  createCRMDeal,
  updateCRMDeal,
  createCRMContact,
  updateCRMContact,
  deleteCRMContact,
  updateInquiryStatus,
  createActivityLog,
  lookupCRMContactByEmailOrPhone,
  searchCRMContacts,
  globalAdminSearch,
  hasPermission,
  DealStage,
  InquiryStatus,
  assertDealStage,
} from "@platform/database";
import { requireInquiryAccess } from "../../lib/inquiry-access";
import { REQUEST_PRIORITIES } from "@platform/database/constants/requests";
import { revalidatePath } from "next/cache";
import {
  getCurrentPermissions,
  requireAuth,
  requirePermission,
} from "../../lib/auth";
import { assertRecordInScope, dataScope } from "../../lib/data-scope";

async function requireDealInScope(id: string) {
}
import {
  employeeIdForUser,
  isFeatureEnabled,
  requireFeatureEnabled,
  searchRecords,
  type RecordSearchCategory,
} from "@platform/database";

export async function updateDealStageAction(id: string, stage: DealStage) {
  return measureOperation("action:updateDealStageAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("deals", "write");
    validateActionArguments("updateDealStageAction", { id, stage });
    await requireDealInScope(id);
    await assertDealStage(stage);
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
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("deals", "write");
    validateActionArguments("createCRMDealAction", { data });
    if (data.stage) await assertDealStage(data.stage);
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
    currency: import("@platform/database/types").SupportedCurrency;
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
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("deals", "write");
    validateActionArguments("updateDealAction", { id, data });
    await requireDealInScope(id);
    if (data.assigned_to) await assertRecordInScope("deals", data.assigned_to);
    if (data.stage) await assertDealStage(data.stage);
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
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("contacts", "write");
    validateActionArguments("createContactAction", { data });
    const { contact } = await runAtomicMutation(async () => {
      const contact = await createCRMContact(data);
      await createActivityLog({
        user_id: user.id,
        action: "create",
        entity_type: "contact",
        entity_id: contact.id,
        details: {
          name: contact.company || contact.full_name,
          kind: contact.client_kind,
          email: contact.email,
        },
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
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("contacts", "write");
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
    await requireFeatureEnabled("crm_deals");
    const user = await requirePermission("contacts", "delete");
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
    await requireFeatureEnabled("crm_deals");
    await requirePermission("contacts", "read");
    validateActionArguments("lookupClientAction", { term });
    const contact = await lookupCRMContactByEmailOrPhone(term);
    return { success: !!contact, contact };
  });
}

export async function searchContactsAction(query: string) {
  return measureOperation("action:searchContactsAction", async () => {
    await requireFeatureEnabled("crm_deals");
    await requirePermission("contacts", "read");
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
    allowed.add("people");
    const results = await globalAdminSearch(
      query,
      8,
      allowed,
      allowed.has("deals") ? await dataScope("deals") : null,
    );
    const grants = await getCurrentPermissions();
    const records = new Set<RecordSearchCategory>();
    const recordSources: [RecordSearchCategory, string, string][] = [
      ["orders", "orders:read", "store"],
      ["products", "products:read", "products"],
      ["shipments", "deliveries:read", "delivery"],
      ["tasks", "tasks:read", "tasks"],
      ["purchase_orders", "procurement:read", "procurement"],
      ["legal", "legal:read", "legal"],
      ["campaigns", "marketing:read", "marketing"],
    ];
    for (const [category, grant, module] of recordSources)
      if (grants[grant] === true && (await isFeatureEnabled(module)))
        records.add(category);
    const more = records.size
      ? await searchRecords(query, 5, records, {
          tasks: records.has("tasks")
            ? {
                userId: user.id,
                departmentId: user.department_id ?? null,
                all: grants["tasks:assign"] === true,
              }
            : null,
          driverId:
            records.has("shipments") && grants["deliveries:assign"] !== true
              ? ((await employeeIdForUser(user.id)) ?? "-")
              : null,
        })
      : [];
    return {
      success: true,
      results: [
        ...results.filter((result) => allowed.has(result.category)),
        ...more,
      ],
    };
  });
}

export async function updateInquiryStatusAction(
  id: string,
  status: InquiryStatus,
) {
  return measureOperation("action:updateInquiryStatusAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requireInquiryAccess(id, "write");
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
    await requireFeatureEnabled("crm_deals");
    const user = await requireInquiryAccess(inquiryId, "write");
    validateActionArguments("convertInquiryToClientAction", { inquiryId });
    await requirePermission("contacts", "write");
    await requirePermission("deals", "write");

    await createActivityLog({
      user_id: user.id,
      action: "create",
      entity_type: "deal",
      entity_id: `deal_${inquiryId}`,
      details: {
        convertedFromInquiry: inquiryId,
      },
    });

    revalidatePath(ROUTES.requests.list);
    revalidatePath(ROUTES.crm.contacts);
    revalidatePath(ROUTES.crm.deals);
    revalidatePath(ROUTES.home);

    return {
      success: true,
      contactId: inquiryId,
      dealId: `deal_${inquiryId}`,
    };
  });
}

export async function manageInquiryAction(
  id: string,
  data: {
    priority?: string;
    claim?: boolean;
    note?: string;
    slaDueDate?: string | null;
  },
) {
  return measureOperation("action:manageInquiryAction", async () => {
    await requireFeatureEnabled("crm_deals");
    const user = await requireInquiryAccess(id, "write");
    validateActionArguments("manageInquiryAction", { id, data });
    if (
      data.priority &&
      !(REQUEST_PRIORITIES as readonly string[]).includes(data.priority)
    )
      throw new Error(serverMessages.invalidPriority);
    const slaDueDate =
      data.slaDueDate === undefined
        ? undefined
        : data.slaDueDate === null || data.slaDueDate === ""
          ? null
          : new Date(data.slaDueDate);
    if (slaDueDate && Number.isNaN(slaDueDate.getTime()))
      throw new Error(serverMessages.invalidSlaDate);
    if (
      data.note !== undefined &&
      (typeof data.note !== "string" ||
        !data.note.trim() ||
        data.note.length > 5000)
    )
      throw new Error(serverMessages.invalidNote);

    await createActivityLog({
      user_id: user.id,
      action: "update",
      entity_type: "inquiry",
      entity_id: id,
      details: {
        priority: data.priority,
        slaDueDate: data.slaDueDate,
        claimed: data.claim,
        noteAdded: !!data.note,
      },
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
    await requireFeatureEnabled("crm_deals");
    const user = await requireInquiryAccess(inquiryId, "write");
    validateActionArguments("linkInquiryCustomerAction", {
      inquiryId,
      customerId,
    });
    await requirePermission("contacts", "write");

    await createActivityLog({
      user_id: user.id,
      action: "link_customer",
      entity_type: "inquiry",
      entity_id: inquiryId,
      details: { customerId },
    });

    revalidatePath(ROUTES.requests.list);
    return { success: true };
  });
}
