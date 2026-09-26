import { db } from '../db';
import { mockContacts, mockDeals } from '../mock-data';
import { CRMContact, CRMDeal } from '../types';

export async function getCRMContacts(): Promise<CRMContact[]> {
  try {
    const contacts = await db.crmContact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    if (contacts && contacts.length > 0) {
      return contacts.map((c) => ({
        id: c.id,
        full_name: `${c.firstName} ${c.lastName || ''}`.trim(),
        email: c.email || '',
        phone: c.phone || undefined,
        company: c.companyName || undefined,
        job_title: c.jobTitle || undefined,
        notes: c.notes || undefined,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching CRM contacts from DB:', e);
  }
  return mockContacts;
}

export async function getCRMDeals(): Promise<CRMDeal[]> {
  try {
    const deals = await db.crmDeal.findMany({
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });
    if (deals && deals.length > 0) {
      return deals.map((d) => ({
        id: d.id,
        contact_id: d.contactId || undefined,
        contact: d.contact
          ? {
              id: d.contact.id,
              full_name: `${d.contact.firstName} ${d.contact.lastName || ''}`.trim(),
              email: d.contact.email || '',
              phone: d.contact.phone || undefined,
              company: d.contact.companyName || undefined,
              job_title: d.contact.jobTitle || undefined,
              notes: d.contact.notes || undefined,
              created_at: d.contact.createdAt.toISOString(),
              updated_at: d.contact.updatedAt.toISOString(),
            }
          : undefined,
        title: d.title,
        value: Number(d.dealValue),
        currency: d.currency as any,
        stage: d.dealStage as any,
        probability: d.probability,
        target_close_date: d.expectedCloseDate ? d.expectedCloseDate.toISOString().split('T')[0] : undefined,
        shoot_date: undefined,
        lost_reason: undefined,
        assigned_to: undefined,
        created_at: d.createdAt.toISOString(),
        updated_at: d.updatedAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error('Error fetching CRM deals from DB:', e);
  }
  return mockDeals;
}
