import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockHeroBanners } from '../mock-data';
import { HeroBanner } from '../types';

export async function getActiveBanners(): Promise<HeroBanner[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockHeroBanners.filter((b) => b.is_active);
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('hero_banners')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error || !data) return mockHeroBanners;
  return data as HeroBanner[];
}

export async function getAllBanners(): Promise<HeroBanner[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockHeroBanners;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('hero_banners')
    .select('*')
    .order('display_order', { ascending: true });
  if (error || !data) return mockHeroBanners;
  return data as HeroBanner[];
}
