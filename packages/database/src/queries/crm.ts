import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockContacts, mockDeals } from '../mock-data';
import { CRMContact, CRMDeal } from '../types';

export async function getCRMContacts(): Promise<CRMContact[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockContacts;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('crm_contacts').select('*').order('created_at', { ascending: false });
  if (error || !data) return mockContacts;
  return data as CRMContact[];
}

export async function getCRMDeals(): Promise<CRMDeal[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockDeals;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('crm_deals')
    .select('*, contact:crm_contacts(*)')
    .order('created_at', { ascending: false });
  if (error || !data) return mockDeals;
  return data as CRMDeal[];
}
