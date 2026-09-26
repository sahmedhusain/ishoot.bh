import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockClientLogos } from '../mock-data';
import { ClientLogo } from '../types';

export async function getActiveClientLogos(): Promise<ClientLogo[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockClientLogos.filter((c) => c.is_active);
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('client_logos')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error || !data) return mockClientLogos;
  return data as ClientLogo[];
}
