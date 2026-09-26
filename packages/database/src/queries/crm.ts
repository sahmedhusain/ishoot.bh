import { db } from '../db';
import { CRMContact, CRMDeal, DealStage, SupportedCurrency } from '../types';

function mapContact(c: any): CRMContact {
  return {
    id: c.id,
    full_name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Contact',
    first_name: c.firstName,
    last_name: c.lastName || undefined,
    email: c.email || '',
    phone: c.phone || undefined,
    company: c.companyName || undefined,
    job_title: c.jobTitle || undefined,
    contact_type: c.contactType as any,
    notes: c.notes || undefined,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

function mapDeal(d: any): CRMDeal {
  return {
    id: d.id,
    contact_id: d.contactId || undefined,
    contact: d.contact ? mapContact(d.contact) : undefined,
    title: d.title,
    value: Number(d.dealValue),
    currency: (d.currency as SupportedCurrency) || 'BHD',
    stage: (d.dealStage as DealStage) || 'lead',
    probability: d.probability,
    target_close_date: d.expectedCloseDate ? d.expectedCloseDate.toISOString().split('T')[0] : undefined,
    shoot_date: d.shootDate ? d.shootDate.toISOString().split('T')[0] : undefined,
    lost_reason: d.lostReason || undefined,
    assigned_to: d.assignedTo || undefined,
    notes: d.notes || undefined,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

// Contacts CRUD
export async function getCRMContacts(): Promise<CRMContact[]> {
  try {
    const contacts = await db.crmContact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return contacts.map(mapContact);
  } catch (e) {
    console.error('Error fetching CRM contacts from DB:', e);
    return [];
  }
}

export async function getCRMContactById(id: string): Promise<CRMContact | null> {
  try {
    const contact = await db.crmContact.findUnique({
      where: { id },
      include: { deals: true },
    });
    return contact ? mapContact(contact) : null;
  } catch (e) {
    console.error(`Error fetching CRM contact ${id}:`, e);
    return null;
  }
}

export async function createCRMContact(data: {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  contact_type?: 'client' | 'vendor' | 'freelancer' | 'agency';
  notes?: string;
}): Promise<CRMContact> {
  let firstName = data.first_name || '';
  let lastName = data.last_name || '';
  if (!firstName && data.full_name) {
    const parts = data.full_name.trim().split(' ');
    firstName = parts[0] || 'Client';
    lastName = parts.slice(1).join(' ');
  }

  const created = await db.crmContact.create({
    data: {
      firstName: firstName || 'Client',
      lastName: lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      companyName: data.company || null,
      jobTitle: data.job_title || null,
      contactType: data.contact_type || 'client',
      notes: data.notes || null,
    },
  });
  return mapContact(created);
}

export async function updateCRMContact(id: string, data: Partial<CRMContact>): Promise<CRMContact | null> {
  try {
    const updateData: any = {};
    if (data.first_name !== undefined) updateData.firstName = data.first_name;
    if (data.last_name !== undefined) updateData.lastName = data.last_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.companyName = data.company;
    if (data.job_title !== undefined) updateData.jobTitle = data.job_title;
    if (data.contact_type !== undefined) updateData.contactType = data.contact_type;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await db.crmContact.update({
      where: { id },
      data: updateData,
    });
    return mapContact(updated);
  } catch (e) {
    console.error(`Error updating CRM contact ${id}:`, e);
    return null;
  }
}

export async function deleteCRMContact(id: string): Promise<boolean> {
  try {
    await db.crmContact.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting CRM contact ${id}:`, e);
    return false;
  }
}

// Deals CRUD
export async function getCRMDeals(): Promise<CRMDeal[]> {
  try {
    const deals = await db.crmDeal.findMany({
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });
    return deals.map(mapDeal);
  } catch (e) {
    console.error('Error fetching CRM deals from DB:', e);
    return [];
  }
}

export async function getCRMDealById(id: string): Promise<CRMDeal | null> {
  try {
    const deal = await db.crmDeal.findUnique({
      where: { id },
      include: { contact: true, invoices: true, expenses: true, calendarEvents: true },
    });
    return deal ? mapDeal(deal) : null;
  } catch (e) {
    console.error(`Error fetching CRM deal ${id}:`, e);
    return null;
  }
}

export async function createCRMDeal(data: {
  title: string;
  value: number;
  currency?: SupportedCurrency;
  stage?: DealStage;
  probability?: number;
  contact_id?: string;
  shoot_date?: string;
  target_close_date?: string;
  notes?: string;
  assigned_to?: string;
}): Promise<CRMDeal> {
  const created = await db.crmDeal.create({
    data: {
      title: data.title,
      dealValue: data.value,
      currency: data.currency || 'BHD',
      dealStage: data.stage || 'lead',
      probability: data.probability ?? 50,
      contactId: data.contact_id || null,
      shootDate: data.shoot_date ? new Date(data.shoot_date) : null,
      expectedCloseDate: data.target_close_date ? new Date(data.target_close_date) : null,
      notes: data.notes || null,
      assignedTo: data.assigned_to || null,
    },
    include: { contact: true },
  });
  return mapDeal(created);
}

export async function updateCRMDeal(id: string, data: Partial<CRMDeal>): Promise<CRMDeal | null> {
  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.value !== undefined) updateData.dealValue = data.value;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stage !== undefined) updateData.dealStage = data.stage;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.contact_id !== undefined) updateData.contactId = data.contact_id;
    if (data.shoot_date !== undefined) updateData.shootDate = data.shoot_date ? new Date(data.shoot_date) : null;
    if (data.target_close_date !== undefined) updateData.expectedCloseDate = data.target_close_date ? new Date(data.target_close_date) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.lost_reason !== undefined) updateData.lostReason = data.lost_reason;
    if (data.assigned_to !== undefined) updateData.assignedTo = data.assigned_to;

    const updated = await db.crmDeal.update({
      where: { id },
      data: updateData,
      include: { contact: true },
    });
    return mapDeal(updated);
  } catch (e) {
    console.error(`Error updating CRM deal ${id}:`, e);
    return null;
  }
}

export async function updateDealStage(id: string, stage: DealStage): Promise<CRMDeal | null> {
  return updateCRMDeal(id, { stage });
}

export async function deleteCRMDeal(id: string): Promise<boolean> {
  try {
    await db.crmDeal.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting CRM deal ${id}:`, e);
    return false;
  }
}
