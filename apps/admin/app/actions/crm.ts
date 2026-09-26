'use server';

import {
  updateDealStage,
  createCRMDeal,
  deleteCRMDeal,
  createCRMContact,
  deleteCRMContact,
  updateInquiryStatus,
  deleteInquiry,
  DealStage,
  InquiryStatus,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

export async function updateDealStageAction(id: string, stage: DealStage) {
  const deal = await updateDealStage(id, stage);
  revalidatePath('/dashboard/crm/deals');
  revalidatePath('/dashboard');
  return { success: true, deal };
}

export async function createCRMDealAction(data: {
  title: string;
  value: number;
  stage?: DealStage;
  contact_id?: string;
  shoot_date?: string;
  notes?: string;
}) {
  const deal = await createCRMDeal(data);
  revalidatePath('/dashboard/crm/deals');
  revalidatePath('/dashboard');
  return { success: true, deal };
}

export async function deleteCRMDealAction(id: string) {
  await deleteCRMDeal(id);
  revalidatePath('/dashboard/crm/deals');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function createContactAction(data: {
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  contact_type?: 'client' | 'agency' | 'vendor' | 'freelancer';
  notes?: string;
}) {
  const contact = await createCRMContact(data);
  revalidatePath('/dashboard/crm/contacts');
  return { success: true, contact };
}

export async function deleteContactAction(id: string) {
  await deleteCRMContact(id);
  revalidatePath('/dashboard/crm/contacts');
  return { success: true };
}

export async function updateInquiryStatusAction(id: string, status: InquiryStatus) {
  const inquiry = await updateInquiryStatus(id, status);
  revalidatePath('/dashboard/crm/leads');
  revalidatePath('/dashboard');
  return { success: true, inquiry };
}

export async function deleteInquiryAction(id: string) {
  await deleteInquiry(id);
  revalidatePath('/dashboard/crm/leads');
  revalidatePath('/dashboard');
  return { success: true };
}
