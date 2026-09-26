import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockStudioEquipment } from '../mock-data';
import { StudioEquipment } from '../types';

export async function getStudioEquipment(): Promise<StudioEquipment[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockStudioEquipment;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('studio_equipment')
    .select('*')
    .order('display_order', { ascending: true });
  if (error || !data) return mockStudioEquipment;
  return data as StudioEquipment[];
}
