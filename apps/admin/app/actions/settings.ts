'use server';

import {
  updateCompanySettings,
  CompanySettings,
} from '@ishoot/database';
import { revalidatePath } from 'next/cache';

export async function updateCompanySettingsAction(settings: CompanySettings) {
  const updated = await updateCompanySettings(settings);
  revalidatePath('/dashboard/settings/company');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/payments');
  return { success: true, settings: updated };
}
