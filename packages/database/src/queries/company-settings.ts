import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockCompanySettings } from '../mock-data';
import { CompanySettings } from '../types';

export async function getCompanySettings(): Promise<CompanySettings> {
  if (!isLiveSupabaseConfigured()) {
    return mockCompanySettings;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('company_settings').select('*').single();
  if (error || !data) return mockCompanySettings;
  return data as CompanySettings;
}

export async function updateCompanySettings(updates: Partial<CompanySettings>): Promise<CompanySettings> {
  if (!isLiveSupabaseConfigured()) {
    Object.assign(mockCompanySettings, updates, { updated_at: new Date().toISOString() });
    return mockCompanySettings;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('company_settings')
    .update(updates)
    .eq('id', mockCompanySettings.id)
    .select()
    .single();
  if (error || !data) return mockCompanySettings;
  return data as CompanySettings;
}
