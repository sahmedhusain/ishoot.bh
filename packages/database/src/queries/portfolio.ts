import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockPortfolioCategories, mockPortfolioItems } from '../mock-data';
import { PortfolioCategory, PortfolioItem } from '../types';

export async function getPortfolioCategories(): Promise<PortfolioCategory[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockPortfolioCategories;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('portfolio_categories')
    .select('*')
    .order('display_order', { ascending: true });
  if (error || !data) return mockPortfolioCategories;
  return data as PortfolioCategory[];
}

export async function getPortfolioItems(categorySlug?: string): Promise<PortfolioItem[]> {
  if (!isLiveSupabaseConfigured()) {
    if (!categorySlug || categorySlug === 'all') return mockPortfolioItems;
    const cat = mockPortfolioCategories.find((c) => c.slug === categorySlug);
    if (!cat) return mockPortfolioItems;
    return mockPortfolioItems.filter((item) => item.category_id === cat.id);
  }
  const supabase = createBrowserClient();
  let query = supabase.from('portfolio_items').select('*').order('display_order', { ascending: true });
  if (categorySlug && categorySlug !== 'all') {
    const { data: catData } = await supabase.from('portfolio_categories').select('id').eq('slug', categorySlug).single();
    if (catData?.id) {
      query = query.eq('category_id', catData.id);
    }
  }
  const { data, error } = await query;
  if (error || !data) return mockPortfolioItems;
  return data as PortfolioItem[];
}

export async function getPortfolioItemBySlug(slug: string): Promise<PortfolioItem | null> {
  if (!isLiveSupabaseConfigured()) {
    return mockPortfolioItems.find((p) => p.slug === slug) || null;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('portfolio_items').select('*').eq('slug', slug).single();
  if (error || !data) return mockPortfolioItems.find((p) => p.slug === slug) || null;
  return data as PortfolioItem;
}
