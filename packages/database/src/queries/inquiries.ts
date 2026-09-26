import { isLiveSupabaseConfigured, createBrowserClient } from '../client';
import { mockInquiries } from '../mock-data';
import { Inquiry } from '../types';

export async function createInquiry(inquiry: Omit<Inquiry, 'id' | 'created_at' | 'status' | 'confirmation_sent' | 'notification_sent'>): Promise<Inquiry> {
  const newInquiry: Inquiry = {
    ...inquiry,
    id: `inq-${Date.now()}`,
    status: 'new',
    confirmation_sent: false,
    notification_sent: false,
    created_at: new Date().toISOString(),
  };

  if (!isLiveSupabaseConfigured()) {
    mockInquiries.unshift(newInquiry);
    return newInquiry;
  }

  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('inquiries').insert([newInquiry]).select().single();
  if (error || !data) return newInquiry;
  return data as Inquiry;
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  if (!isLiveSupabaseConfigured()) {
    return mockInquiries;
  }
  const supabase = createBrowserClient();
  const { data, error } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false });
  if (error || !data) return mockInquiries;
  return data as Inquiry;
}
