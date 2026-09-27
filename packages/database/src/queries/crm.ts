import { db } from "../db";
import { CRMContact, CRMDeal, DealStage, SupportedCurrency } from "../types";

function mapContact(c: any): CRMContact {
  return {
    id: c.id,
    full_name:
      `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
      c.companyName ||
      "Contact",
    first_name: c.firstName,
    last_name: c.lastName || undefined,
    email: c.email || "",
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
    currency: (d.currency as SupportedCurrency) || "BHD",
    stage: (d.dealStage as DealStage) || "lead",
    probability: d.probability,
    target_close_date: d.expectedCloseDate
      ? d.expectedCloseDate.toISOString().split("T")[0]
      : undefined,
    shoot_date: d.shootDate
      ? d.shootDate.toISOString().split("T")[0]
      : undefined,
    lost_reason: d.lostReason || undefined,
    assigned_to: d.assignedTo || undefined,
    notes: d.notes || undefined,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

export async function getCRMContacts(): Promise<CRMContact[]> {
  try {
    const contacts = await db.crmContact.findMany({
      orderBy: { createdAt: "desc" },
    });
    return contacts.map(mapContact);
  } catch (e) {
    console.error("Error fetching CRM contacts from DB:", e);
    return [];
  }
}

export async function getCRMContactById(
  id: string,
): Promise<CRMContact | null> {
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

export async function lookupCRMContactByEmailOrPhone(
  term: string,
): Promise<CRMContact | null> {
  try {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) return null;
    const contact = await db.crmContact.findFirst({
      where: {
        OR: [
          { email: { contains: cleanTerm, mode: "insensitive" } },
          { phone: { contains: cleanTerm, mode: "insensitive" } },
          { emailNorm: { contains: cleanTerm, mode: "insensitive" } },
          { phoneE164: { contains: cleanTerm, mode: "insensitive" } },
        ],
      },
    });
    return contact ? mapContact(contact) : null;
  } catch (e) {
    console.error(`Error looking up contact by email/phone ${term}:`, e);
    return null;
  }
}

export async function getCustomerDossier(id: string) {
  try {
    const contactRaw = await db.crmContact.findUnique({
      where: { id },
      include: { deals: true },
    });
    if (!contactRaw) return null;

    const contact = mapContact(contactRaw);

    const inquiriesRaw = await db.inquiry.findMany({
      where: {
        OR: [
          { customerId: id },
          ...(contact.email ? [{ email: contact.email }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const dealsRaw = await db.crmDeal.findMany({
      where: { contactId: id },
      orderBy: { createdAt: "desc" },
    });

    const invoicesRaw = await db.invoice.findMany({
      where: {
        OR: [{ clientId: id }, { deal: { contactId: id } }],
      },
      include: {
        lineItems: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const paymentsRaw = await db.payment.findMany({
      where: {
        invoice: {
          OR: [{ clientId: id }, { deal: { contactId: id } }],
        },
      },
      include: { invoice: true },
      orderBy: { paymentDate: "desc" },
    });

    const contractsRaw = await db.contract.findMany({
      where: {
        OR: [{ contactId: id }, { deal: { contactId: id } }],
      },
      orderBy: { createdAt: "desc" },
    });

    const attachmentsRaw = await db.attachment.findMany({
      where: {
        OR: [
          { entityType: "contact", entityId: id },
          { entityType: "customer_vault", entityId: id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const activitiesRaw = await db.activityLog.findMany({
      where: { entityId: id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const totalLtv = invoicesRaw
      .filter((inv) => inv.status !== "void")
      .reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
    const totalPaid = paymentsRaw.reduce((acc, p) => acc + Number(p.amount), 0);
    const totalOutstanding = Math.max(0, totalLtv - totalPaid);
    const activeDealsCount = dealsRaw.filter(
      (d) => !["delivered", "closed_won", "closed_lost"].includes(d.dealStage),
    ).length;
    const closedWonDeals = dealsRaw.filter((d) => d.dealStage === "closed_won");
    const winRate =
      dealsRaw.length > 0
        ? Math.round((closedWonDeals.length / dealsRaw.length) * 100)
        : 0;
    const totalDealValue = dealsRaw.reduce(
      (acc, d) => acc + Number(d.dealValue),
      0,
    );
    const avgDealSize =
      dealsRaw.length > 0 ? totalDealValue / dealsRaw.length : 0;

    // Find the latest activity date
    const timestamps: number[] = [];
    if (activitiesRaw.length > 0 && activitiesRaw[0].createdAt) {
      timestamps.push(new Date(activitiesRaw[0].createdAt).getTime());
    }
    if (paymentsRaw.length > 0 && paymentsRaw[0].paymentDate) {
      timestamps.push(new Date(paymentsRaw[0].paymentDate).getTime());
    }
    if (invoicesRaw.length > 0 && invoicesRaw[0].issueDate) {
      timestamps.push(new Date(invoicesRaw[0].issueDate).getTime());
    }
    if (inquiriesRaw.length > 0 && inquiriesRaw[0].createdAt) {
      timestamps.push(new Date(inquiriesRaw[0].createdAt).getTime());
    }
    const lastActivityDate =
      timestamps.length > 0
        ? new Date(Math.max(...timestamps)).toISOString()
        : contact.updated_at || contact.created_at;

    return {
      contact,
      metrics: {
        totalLtv,
        totalPaid,
        totalOutstanding,
        activeDealsCount,
        invoicesCount: invoicesRaw.length,
        winRate,
        avgDealSize,
        settledReceiptsCount: paymentsRaw.length,
        lastActivityDate,
      },
      inquiries: inquiriesRaw.map((inq: any) => ({
        id: inq.id,
        full_name: inq.name,
        email: inq.email,
        phone: inq.phone || undefined,
        company: inq.companyName || undefined,
        services_requested: inq.serviceType ? inq.serviceType.split(", ") : [],
        budget_range: inq.budgetRange || undefined,
        target_timeline: inq.timeline || undefined,
        message: inq.message,
        status: inq.status || "new",
        confirmation_sent: true,
        notification_sent: true,
        locale: inq.locale || "ar",
        created_at: inq.createdAt.toISOString(),
      })),
      deals: dealsRaw.map(mapDeal),
      invoices: invoicesRaw.map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        contact_id: id,
        deal_id: inv.dealId || undefined,
        issue_date: inv.issueDate.toISOString().split("T")[0],
        due_date: inv.dueDate.toISOString().split("T")[0],
        subtotal: Number(inv.subtotal),
        discount_type: inv.discountType || "none",
        discount_value: Number(inv.discountValue || 0),
        discount_amount: Number(inv.discountAmount || 0),
        after_discount: Number(inv.subtotal) - Number(inv.discountAmount || 0),
        vat_enabled: Number(inv.vatAmount) > 0,
        vat_percentage: 10,
        vat_amount: Number(inv.vatAmount),
        total_amount: Number(inv.totalAmount),
        amount_paid: inv.payments
          ? inv.payments.reduce(
              (acc: number, p: any) => acc + Number(p.amount),
              0,
            )
          : 0,
        amount_due: Math.max(
          0,
          Number(inv.totalAmount) -
            (inv.payments
              ? inv.payments.reduce(
                  (acc: number, p: any) => acc + Number(p.amount),
                  0,
                )
              : 0),
        ),
        currency: inv.currency || "BHD",
        language: inv.language || "ar",
        status: inv.status || "draft",
        created_at: inv.createdAt.toISOString(),
        updated_at: inv.updatedAt.toISOString(),
      })),
      payments: paymentsRaw.map((p: any) => ({
        id: p.id,
        invoice_id: p.invoiceId,
        receipt_number: p.receiptNumber,
        payment_date: p.paymentDate.toISOString().split("T")[0],
        amount: Number(p.amount),
        currency: p.currency || "BHD",
        payment_method: p.paymentMethod || "bank_transfer",
        reference_number: p.referenceNumber || undefined,
        notes: p.notes || undefined,
        receipt_pdf_path: p.receiptPdfPath || undefined,
        notification_sent: p.notificationSent,
        created_at: p.createdAt.toISOString(),
      })),
      contracts: contractsRaw.map((c: any) => ({
        id: c.id,
        contract_number: c.contractNumber,
        title_en: c.titleEn,
        title_ar: c.titleAr || undefined,
        status: c.status,
        valid_from: c.validFrom
          ? c.validFrom.toISOString().split("T")[0]
          : undefined,
        valid_until: c.validUntil
          ? c.validUntil.toISOString().split("T")[0]
          : undefined,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      })),
      attachments: attachmentsRaw.map((att: any) => ({
        id: att.id,
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_size: att.fileSize || undefined,
        mime_type: att.mimeType || undefined,
        entity_type: att.entityType,
        entity_id: att.entityId,
        uploaded_by: att.uploadedById || undefined,
        created_at: att.createdAt.toISOString(),
      })),
      activities: activitiesRaw.map((act: any) => ({
        id: act.id,
        user_id: act.userId,
        user: act.user
          ? {
              id: act.user.id,
              full_name: act.user.fullName,
              email: act.user.email,
              role: act.user.role as any,
              created_at: act.user.createdAt.toISOString(),
              updated_at: act.user.updatedAt.toISOString(),
            }
          : undefined,
        action: act.action,
        entity_type: act.entityType,
        entity_id: act.entityId || undefined,
        details: act.details,
        created_at: act.createdAt.toISOString(),
      })),
    };
  } catch (e) {
    console.error(`Error generating Customer Dossier for ${id}:`, e);
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
  contact_type?: "client" | "vendor" | "freelancer" | "agency";
  notes?: string;
}): Promise<CRMContact> {
  let firstName = data.first_name || "";
  let lastName = data.last_name || "";
  if (!firstName && data.full_name) {
    const parts = data.full_name.trim().split(" ");
    firstName = parts[0] || "Client";
    lastName = parts.slice(1).join(" ");
  }

  const created = await db.crmContact.create({
    data: {
      firstName: firstName || "Client",
      lastName: lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      companyName: data.company || null,
      jobTitle: data.job_title || null,
      contactType: data.contact_type || "client",
      notes: data.notes || null,
    },
  });
  return mapContact(created);
}

export async function updateCRMContact(
  id: string,
  data: Partial<CRMContact>,
): Promise<CRMContact | null> {
  try {
    const updateData: any = {};
    if (data.first_name !== undefined) updateData.firstName = data.first_name;
    if (data.last_name !== undefined) updateData.lastName = data.last_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.companyName = data.company;
    if (data.job_title !== undefined) updateData.jobTitle = data.job_title;
    if (data.contact_type !== undefined)
      updateData.contactType = data.contact_type;
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

export async function getCRMDeals(): Promise<CRMDeal[]> {
  try {
    const deals = await db.crmDeal.findMany({
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });
    return deals.map(mapDeal);
  } catch (e) {
    console.error("Error fetching CRM deals from DB:", e);
    return [];
  }
}

export async function getCRMDealById(id: string): Promise<CRMDeal | null> {
  try {
    const deal = await db.crmDeal.findUnique({
      where: { id },
      include: {
        contact: true,
        invoices: true,
        expenses: true,
        calendarEvents: true,
      },
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
      currency: data.currency || "BHD",
      dealStage: data.stage || "lead",
      probability: data.probability ?? 50,
      contactId: data.contact_id || null,
      shootDate: data.shoot_date ? new Date(data.shoot_date) : null,
      expectedCloseDate: data.target_close_date
        ? new Date(data.target_close_date)
        : null,
      notes: data.notes || null,
      assignedTo: data.assigned_to || null,
    },
    include: { contact: true },
  });
  return mapDeal(created);
}

export async function updateCRMDeal(
  id: string,
  data: Partial<CRMDeal>,
): Promise<CRMDeal | null> {
  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.value !== undefined) updateData.dealValue = data.value;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stage !== undefined) updateData.dealStage = data.stage;
    if (data.probability !== undefined)
      updateData.probability = data.probability;
    if (data.contact_id !== undefined) updateData.contactId = data.contact_id;
    if (data.shoot_date !== undefined)
      updateData.shootDate = data.shoot_date ? new Date(data.shoot_date) : null;
    if (data.target_close_date !== undefined)
      updateData.expectedCloseDate = data.target_close_date
        ? new Date(data.target_close_date)
        : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.lost_reason !== undefined)
      updateData.lostReason = data.lost_reason;
    if (data.assigned_to !== undefined)
      updateData.assignedTo = data.assigned_to;

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

export async function updateDealStage(
  id: string,
  stage: DealStage,
): Promise<CRMDeal | null> {
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

export async function searchCRMContacts(
  term: string,
  limit: number = 10,
): Promise<CRMContact[]> {
  try {
    const clean = term.trim();
    if (!clean) {
      const all = await db.crmContact.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return all.map(mapContact);
    }

    const contacts = await db.crmContact.findMany({
      where: {
        OR: [
          { firstName: { contains: clean, mode: "insensitive" } },
          { lastName: { contains: clean, mode: "insensitive" } },
          { companyName: { contains: clean, mode: "insensitive" } },
          { email: { contains: clean, mode: "insensitive" } },
          { phone: { contains: clean, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return contacts.map(mapContact);
  } catch (e) {
    console.error("Error searching CRM contacts:", e);
    return [];
  }
}

export interface GlobalSearchResult {
  category: "customers" | "invoices" | "deals";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
}

export async function globalAdminSearch(
  query: string,
  limit: number = 8,
): Promise<GlobalSearchResult[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  try {
    // 1. Search Contacts/Customers
    const contacts = await db.crmContact.findMany({
      where: {
        OR: [
          { firstName: { contains: clean, mode: "insensitive" } },
          { lastName: { contains: clean, mode: "insensitive" } },
          { companyName: { contains: clean, mode: "insensitive" } },
          { email: { contains: clean, mode: "insensitive" } },
          { phone: { contains: clean, mode: "insensitive" } },
        ],
      },
      take: limit,
    });

    for (const c of contacts) {
      results.push({
        category: "customers",
        id: c.id,
        title: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.companyName || "Client",
        subtitle: c.companyName ? `${c.companyName} • ${c.email || c.phone || ""}` : (c.email || c.phone || "Client"),
        url: `/dashboard/crm/customers/${c.id}`,
        badge: c.contactType || "client",
      });
    }

    // 2. Search Invoices
    const invoices = await db.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: clean, mode: "insensitive" } },
          { notesEn: { contains: clean, mode: "insensitive" } },
          { client: { companyName: { contains: clean, mode: "insensitive" } } },
          { client: { firstName: { contains: clean, mode: "insensitive" } } },
        ],
      },
      include: { client: true },
      take: limit,
    });

    for (const inv of invoices) {
      results.push({
        category: "invoices",
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: `${Number(inv.totalAmount).toFixed(3)} ${inv.currency} • ${inv.client?.companyName || inv.client?.firstName || "Client"}`,
        url: `/dashboard/invoices/${inv.id}`,
        badge: inv.status,
      });
    }

    // 3. Search Deals
    const deals = await db.crmDeal.findMany({
      where: {
        OR: [
          { title: { contains: clean, mode: "insensitive" } },
          { contact: { companyName: { contains: clean, mode: "insensitive" } } },
        ],
      },
      include: { contact: true },
      take: limit,
    });

    for (const d of deals) {
      results.push({
        category: "deals",
        id: d.id,
        title: d.title,
        subtitle: `${Number(d.dealValue).toFixed(3)} ${d.currency} • ${d.contact?.companyName || d.contact?.firstName || ""}`,
        url: `/dashboard/crm/deals/${d.id}`,
        badge: d.dealStage,
      });
    }
  } catch (e) {
    console.error("Error running global admin search:", e);
  }

  return results;
}
