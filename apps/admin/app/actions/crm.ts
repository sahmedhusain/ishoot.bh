"use server";

import {
  updateDealStage,
  createCRMDeal,
  updateCRMDeal,
  deleteCRMDeal,
  createCRMContact,
  updateCRMContact,
  deleteCRMContact,
  updateInquiryStatus,
  deleteInquiry,
  createActivityLog,
  lookupCRMContactByEmailOrPhone,
  searchCRMContacts,
  globalAdminSearch,
  getCustomerDossier,
  DealStage,
  InquiryStatus,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requirePermission } from "../../lib/auth";

export async function updateDealStageAction(id: string, stage: DealStage) {
  const user = await requirePermission("deals", "write");
  const deal = await updateDealStage(id, stage);

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

export async function deleteCRMDealAction(id: string) {
  const user = await requirePermission("deals", "delete");
  await deleteCRMDeal(id);

  await createActivityLog({
    user_id: user.id,
    action: "delete",
    entity_type: "deal",
    entity_id: id,
  });

  revalidatePath("/dashboard/crm/deals");
  revalidatePath("/dashboard");
  return { success: true };
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
  await deleteCRMContact(id);

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
  // Allow any authenticated user with dashboard access to search
  const results = await globalAdminSearch(query, 8);
  return { success: true, results };
}

export async function getCustomerDossierAction(id: string) {
  await requirePermission("contacts", "read");
  const dossier = await getCustomerDossier(id);
  return { success: !!dossier, dossier };
}

export async function updateInquiryStatusAction(
  id: string,
  status: InquiryStatus,
) {
  const user = await requirePermission("leads", "write");
  const inquiry = await updateInquiryStatus(id, status);

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
  const user = await requirePermission("leads", "delete");
  await deleteInquiry(id);

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
