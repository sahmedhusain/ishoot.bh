import { db } from '../db';
import { mockInquiries } from '../mock-data';
import { Inquiry } from '../types';

export async function createInquiry(
  inquiry: Omit<Inquiry, 'id' | 'created_at' | 'status' | 'confirmation_sent' | 'notification_sent'>
): Promise<Inquiry> {
  try {
    const created = await db.inquiry.create({
      data: {
        name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone || null,
        companyName: inquiry.company || null,
        serviceType: inquiry.services_requested ? inquiry.services_requested.join(', ') : null,
        budgetRange: inquiry.budget_range || null,
        message: inquiry.message || '',
        status: 'new',
      },
    });

    return {
      id: created.id,
      full_name: created.name,
      email: created.email,
      phone: created.phone || undefined,
      company: created.companyName || undefined,
      services_requested: created.serviceType ? created.serviceType.split(', ') : [],
      budget_range: created.budgetRange || undefined,
      target_timeline: undefined,
      message: created.message,
      status: created.status as any,
      confirmation_sent: false,
      notification_sent: false,
      locale: inquiry.locale || 'ar',
      created_at: created.createdAt.toISOString(),
    };
  } catch (e) {
    console.error('Error creating inquiry in DB:', e);
  }

  const newInquiry: Inquiry = {
    ...inquiry,
    id: `inq-${Date.now()}`,
    status: 'new',
    confirmation_sent: false,
    notification_sent: false,
    created_at: new Date().toISOString(),
  };
  mockInquiries.unshift(newInquiry);
  return newInquiry;
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  try {
    const inquiries = await db.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    if (inquiries && inquiries.length > 0) {
      return inquiries.map((inq) => ({
        id: inq.id,
        full_name: inq.name,
        email: inq.email,
        phone: inq.phone || undefined,
        company: inq.companyName || undefined,
        services_requested: inq.serviceType ? inq.serviceType.split(', ') : [],
        budget_range: inq.budgetRange || undefined,
        target_timeline: undefined,
        message: inq.message,
        status: inq.status as any,
        confirmation_sent: false,
        notification_sent: false,
        locale: 'ar',
        created_at: inq.createdAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching inquiries from DB:', e);
  }
  return mockInquiries;
}
