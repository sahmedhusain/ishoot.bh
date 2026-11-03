import { getCurrencyDecimals } from "@platform/config/currency";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { phoneSearchVariants } from "../constants/phone";
import { ROUTES } from "../constants/routes";
import {
  DEAL_STAGE_DEFAULTS,
  DEAL_STAGE_ON_EVENT,
  isActiveDealStage,
  type DealProgressEvent,
} from "../constants/crm";
import { assertCompanyCurrency } from "../finance/company-currency";
import { validMoneyAmount } from "../finance/money";
import { db } from "../db";
import {
  ClientAddress,
  ClientProfileInput,
  CRMContact,
  CRMDeal,
  DealStage,
  SupportedCurrency,
} from "../types";

function mapAddress(c: any): ClientAddress | undefined {
  const address: ClientAddress = {
    country: c.addressCountry || undefined,
    city: c.addressCity || undefined,
    area: c.addressArea || undefined,
    block: c.addressBlock || undefined,
    road: c.addressRoad || undefined,
    building: c.addressBuilding || undefined,
    unit: c.addressUnit || undefined,
    line: c.addressLine || undefined,
    state: c.addressState || undefined,
    postal_code: c.addressPostalCode || undefined,
    po_box: c.addressPoBox || undefined,
  };
  return Object.values(address).some(Boolean) ? address : undefined;
}

export function mapContact(c: any): CRMContact {
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
    vat_number: c.vatNumber || undefined,
    job_title: c.jobTitle || undefined,
    contact_type: c.contactType as any,
    notes: c.notes || undefined,
    client_kind: c.clientKind ?? (c.companyName ? "company" : "individual"),
    company_origin: c.companyOrigin || undefined,
    company_name_ar: c.companyNameAr || undefined,
    legal_form: c.legalForm || undefined,
    cr_number: c.crNumber || undefined,
    cr_expiry_date: c.crExpiryDate
      ? c.crExpiryDate.toISOString().slice(0, 10)
      : undefined,
    registration_number: c.registrationNumber || undefined,
    registration_country: c.registrationCountry || undefined,
    government_type: c.governmentType || undefined,
    supplier_number: c.supplierNumber || undefined,
    requires_purchase_order: c.requiresPurchaseOrder ?? undefined,
    nationality: c.nationality || undefined,
    industry: c.industry || undefined,
    website: c.website || undefined,
    preferred_language: c.preferredLanguage || undefined,
    payment_terms_days: c.paymentTermsDays ?? undefined,
    address_details: mapAddress(c),
    contact_persons: Array.isArray(c.contactPersons)
      ? c.contactPersons.map((p: any) => ({
          id: p.id,
          full_name: p.fullName,
          position: p.position || undefined,
          department: p.department || undefined,
          email: p.email || undefined,
          phone: p.phone || undefined,
          is_primary: p.isPrimary,
          notes: p.notes || undefined,
        }))
      : undefined,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export function mapDeal(d: any): CRMDeal {
  return {
    id: d.id,
    contact_id: d.contactId || undefined,
    contact: d.contact ? mapContact(d.contact) : undefined,
    title: d.title,
    value: Number(d.dealValue),
    currency: String(d.currency ?? ""),
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
    throw e;
  }
}

export async function getCRMContactById(
  id: string,
): Promise<CRMContact | null> {
  try {
    const contact = await db.crmContact.findUnique({
      where: { id },
      include: {
        deals: true,
        contactPersons: { orderBy: { displayOrder: "asc" } },
      },
    });
    return contact ? mapContact(contact) : null;
  } catch (e) {
    console.error(`Error fetching CRM contact ${id}:`, e);
    throw e;
  }
}

export async function lookupCRMContactByEmailOrPhone(
  term: string,
): Promise<CRMContact | null> {
  try {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) return null;
    const phoneVars = phoneSearchVariants(term);
    const contact = await db.crmContact.findFirst({
      where: {
        OR: [
          { email: { contains: cleanTerm, mode: "insensitive" } },
          { emailNorm: { contains: cleanTerm, mode: "insensitive" } },
          ...phoneVars.flatMap((v) => [
            { phone: { contains: v, mode: "insensitive" as const } },
            { phoneE164: { contains: v, mode: "insensitive" as const } },
          ]),
        ],
      },
    });
    return contact ? mapContact(contact) : null;
  } catch (e) {
    console.error(`Error looking up contact by email/phone ${term}:`, e);
    return null;
  }
}

export async function getCustomerDossier(
  id: string,
  access?: Partial<
    Record<
      "invoices" | "payments" | "deals" | "leads" | "contracts" | "audit",
      boolean
    >
  >,
  options: { q?: string; pages?: Record<string, string> } = {},
) {
  const accountingCurrency = await getAccountingCurrency();
  try {
    const contactRaw = await db.crmContact.findUnique({
      where: { id },
      include: { contactPersons: { orderBy: { displayOrder: "asc" } } },
    });
    if (!contactRaw) return null;

    const contact = mapContact(contactRaw);
    const search =
      typeof options.q === "string" ? options.q.trim().slice(0, 200) : "";
    const whereByDomain: Record<string, any> = {
      inquiries: {
        AND: [
          {
            intent: { in: ["inquiry", "quote_request"] },
            OR: [{ customerId: id }],
          },
          ...(search
            ? [
                {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { message: { contains: search, mode: "insensitive" } },
                    { reference: { contains: search, mode: "insensitive" } },
                  ],
                },
              ]
            : []),
        ],
      },
      deals: {
        AND: [
          { contactId: id },
          ...(search
            ? [{ OR: [{ title: { contains: search, mode: "insensitive" } }] }]
            : []),
        ],
      },
      invoices: {
        AND: [
          {
            OR: [{ clientId: id }, { deal: { contactId: id } }],
          },
          ...(search
            ? [
                {
                  OR: [
                    {
                      invoiceNumber: { contains: search, mode: "insensitive" },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      payments: {
        AND: [
          {
            invoice: {
              OR: [{ clientId: id }, { deal: { contactId: id } }],
            },
          },
          ...(search
            ? [
                {
                  OR: [
                    {
                      receiptNumber: { contains: search, mode: "insensitive" },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      contracts: {
        AND: [
          {
            OR: [{ contactId: id }, { deal: { contactId: id } }],
          },
          ...(search
            ? [
                {
                  OR: [
                    { titleEn: { contains: search, mode: "insensitive" } },
                    {
                      contractNumber: { contains: search, mode: "insensitive" },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      attachments: {
        AND: [
          {
            OR: [
              { entityType: "contact", entityId: id },
              { entityType: "customer_vault", entityId: id },
            ],
          },
          ...(search
            ? [
                {
                  OR: [{ fileName: { contains: search, mode: "insensitive" } }],
                },
              ]
            : []),
        ],
      },
      activities: {
        AND: [
          { entityId: id },
          ...(search
            ? [
                {
                  OR: [
                    { action: { contains: search, mode: "insensitive" } },
                    { entityType: { contains: search, mode: "insensitive" } },
                  ],
                },
              ]
            : []),
        ],
      },
    };
    const counts = await Promise.all([
      access?.leads === false
        ? 0
        : db.inquiry.count({ where: whereByDomain.inquiries }),
      access?.deals === false
        ? 0
        : db.crmDeal.count({ where: whereByDomain.deals }),
      access?.invoices === false
        ? 0
        : db.invoice.count({ where: whereByDomain.invoices }),
      access?.payments === false
        ? 0
        : db.payment.count({ where: whereByDomain.payments }),
      access?.contracts === false
        ? 0
        : db.contract.count({ where: whereByDomain.contracts }),
      db.attachment.count({ where: whereByDomain.attachments }),
      access?.audit === false
        ? 0
        : db.activityLog.count({ where: whereByDomain.activities }),
    ]);
    const pagination = {
      inquiries: {
        total: counts[0],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.inquiries || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[0] / 50)),
        ),
      },
      deals: {
        total: counts[1],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.deals || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[1] / 50)),
        ),
      },
      invoices: {
        total: counts[2],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.invoices || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[2] / 50)),
        ),
      },
      payments: {
        total: counts[3],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.payments || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[3] / 50)),
        ),
      },
      contracts: {
        total: counts[4],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.contracts || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[4] / 50)),
        ),
      },
      attachments: {
        total: counts[5],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.attachments || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[5] / 50)),
        ),
      },
      activities: {
        total: counts[6],
        page: Math.min(
          Math.max(
            1,
            Math.min(
              1000000,
              Number.parseInt(options.pages?.activities || "1", 10) || 1,
            ),
          ),
          Math.max(1, Math.ceil(counts[6] / 50)),
        ),
      },
    };

    const [
      inquiriesRaw,
      dealsRaw,
      invoicesRaw,
      paymentsRaw,
      contractsRaw,
      attachmentsRaw,
      activitiesRaw,
    ] = await Promise.all([
      access?.leads === false
        ? Promise.resolve([])
        : db.inquiry.findMany({
            where: whereByDomain.inquiries,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 50,
            skip: (pagination.inquiries.page - 1) * 50,
          }),

      access?.deals === false
        ? Promise.resolve([])
        : db.crmDeal.findMany({
            where: whereByDomain.deals,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 50,
            skip: (pagination.deals.page - 1) * 50,
          }),

      access?.invoices === false
        ? Promise.resolve([])
        : db.invoice.findMany({
            where: whereByDomain.invoices,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 50,
            skip: (pagination.invoices.page - 1) * 50,
          }),

      access?.payments === false
        ? Promise.resolve([])
        : db.payment.findMany({
            where: whereByDomain.payments,
            orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
            take: 50,
            skip: (pagination.payments.page - 1) * 50,
          }),

      access?.contracts === false
        ? Promise.resolve([])
        : db.contract.findMany({
            where: whereByDomain.contracts,
            select: {
              id: true,
              contractNumber: true,
              titleEn: true,
              titleAr: true,
              status: true,
              validFrom: true,
              validUntil: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 50,
            skip: (pagination.contracts.page - 1) * 50,
          }),

      db.attachment.findMany({
        where: whereByDomain.attachments,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        skip: (pagination.attachments.page - 1) * 50,
      }),

      access?.audit === false
        ? Promise.resolve([])
        : db.activityLog.findMany({
            where: whereByDomain.activities,
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],

            take: 50,
            skip: (pagination.activities.page - 1) * 50,
          }),
    ]);

    const paidOnPage = invoicesRaw.length
      ? await db.payment.groupBy({
          by: ["invoiceId", "currency"],
          where: { invoiceId: { in: invoicesRaw.map((i) => i.id) } },
          _sum: { amount: true },
        })
      : [];
    for (const invoice of invoicesRaw as any[])
      invoice.payments = paidOnPage
        .filter(
          (p) => p.invoiceId === invoice.id && p.currency === invoice.currency,
        )
        .map((p) => ({ amount: Number(p._sum.amount), currency: p.currency }));
    const balancesByCurrency: Record<
      string,
      { totalLtv: number; totalPaid: number; totalOutstanding: number }
    > = {};
    if (access?.invoices !== false) {
      const balances = await db.$queryRaw<
        Array<{
          currency: string;
          ltv: unknown;
          paid: unknown;
          outstanding: unknown;
        }>
      >`
        WITH target AS (SELECT i.* FROM "Invoice" i WHERE (i."clientId"=${id} OR EXISTS(SELECT 1 FROM "CrmDeal" d WHERE d.id=i."dealId" AND d."contactId"=${id})) AND i.status NOT IN ('draft','void')),
        paid AS (SELECT p."invoiceId",SUM(p.amount) amount FROM "Payment" p JOIN target i ON i.id=p."invoiceId" AND p.currency=i.currency GROUP BY p."invoiceId"),
        issued AS (SELECT i.currency,i."totalAmount",COALESCE(p.amount,0) paid FROM target i LEFT JOIN paid p ON p."invoiceId"=i.id)
        SELECT currency,SUM("totalAmount") ltv,SUM(paid) paid,SUM(GREATEST(0,"totalAmount"-paid)) outstanding FROM issued GROUP BY currency
      `;
      for (const b of balances)
        balancesByCurrency[b.currency] = {
          totalLtv: Number(b.ltv),
          totalPaid: access?.payments === false ? 0 : Number(b.paid),
          totalOutstanding: Number(b.outstanding),
        };
    }
    const {
      totalLtv = 0,
      totalPaid = 0,
      totalOutstanding = 0,
    } = balancesByCurrency[accountingCurrency] || Object.values(balancesByCurrency)[0] || {};
    const stages =
      access?.deals === false
        ? []
        : await db.crmDeal.groupBy({
            by: ["dealStage", "currency"],
            where: { contactId: id },
            _sum: { dealValue: true },
            _count: true,
          });
    const activeDealsCount = stages
      .filter((s) => isActiveDealStage(s.dealStage))
      .reduce((n, s) => n + s._count, 0);
    // Win rate is measured over decided deals only; open deals have not been won or lost yet.
    const wonCount = stages
      .filter((s) => s.dealStage === "closed_won")
      .reduce((n, s) => n + s._count, 0);
    const decidedCount = stages
      .filter((s) => !isActiveDealStage(s.dealStage))
      .reduce((n, s) => n + s._count, 0);
    const winRate = decidedCount
      ? Math.round((wonCount / decidedCount) * 100)
      : 0;
    const bhd = stages.filter((s) => s.currency === accountingCurrency),
      bhdCount = bhd.reduce((n, s) => n + s._count, 0);
    const avgDealSize = bhdCount
      ? bhd.reduce((n, s) => n + Number(s._sum.dealValue), 0) / bhdCount
      : 0;
    const [invoiceCount, paymentCount] = await Promise.all([
      access?.invoices === false
        ? 0
        : db.invoice.count({
            where: { OR: [{ clientId: id }, { deal: { contactId: id } }] },
          }),
      access?.payments === false
        ? 0
        : db.payment.count({
            where: {
              invoice: { OR: [{ clientId: id }, { deal: { contactId: id } }] },
            },
          }),
    ]);
    // Global maxima must not depend on a related list's filter or current page.
    const latest = await Promise.all([
      access?.audit === false
        ? null
        : db.activityLog
            .aggregate({ where: { entityId: id }, _max: { createdAt: true } })
            .then((r) => r._max.createdAt),
      access?.payments === false
        ? null
        : db.payment
            .aggregate({
              where: {
                invoice: {
                  OR: [{ clientId: id }, { deal: { contactId: id } }],
                },
              },
              _max: { paymentDate: true },
            })
            .then((r) => r._max.paymentDate),
      access?.invoices === false
        ? null
        : db.invoice
            .aggregate({
              where: { OR: [{ clientId: id }, { deal: { contactId: id } }] },
              _max: { issueDate: true },
            })
            .then((r) => r._max.issueDate),
      access?.leads === false
        ? null
        : db.inquiry
            .aggregate({ where: { customerId: id }, _max: { createdAt: true } })
            .then((r) => r._max.createdAt),
    ]);
    const timestamps = latest
      .filter((d): d is Date => d !== null)
      .map((d) => d.getTime());
    const lastActivityDate = timestamps.length
      ? new Date(Math.max(...timestamps)).toISOString()
      : contact.updated_at || contact.created_at;

    return {
      contact,
      pagination,
      metrics: {
        balancesByCurrency,
        totalLtv,
        totalPaid,
        totalOutstanding,
        activeDealsCount,
        invoicesCount: invoiceCount,
        winRate,
        avgDealSize,
        settledReceiptsCount: paymentCount,
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
        confirmation_sent: inq.confirmationStatus === "sent",
        notification_sent: inq.notificationStatus === "sent",
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
        vat_enabled: inv.vatEnabled,
        vat_percentage: Number(inv.vatPercentage),
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
        currency: inv.currency || accountingCurrency,
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
        currency: p.currency || accountingCurrency,
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
    throw e;
  }
}

export async function createCRMContact(
  data: ClientProfileInput,
): Promise<CRMContact> {
  const { createClientProfile } = await import("./client-profiles");
  return createClientProfile(data);
}

export async function updateCRMContact(
  id: string,
  data: ClientProfileInput,
): Promise<CRMContact | null> {
  const { updateClientProfile } = await import("./client-profiles");
  return updateClientProfile(id, data);
}

export async function deleteCRMContact(id: string): Promise<boolean> {
  try {
    // Issued financial documents must keep their customer; deleting would blank it on tax invoices.
    const [invoices, quotations] = await Promise.all([
      db.invoice.count({ where: { clientId: id } }),
      db.quotation.count({ where: { clientId: id } }),
    ]);
    if (invoices || quotations)
      throw new Error(serverMessages.thisContactHasInvoicesOrQuotationsAnd);
    await db.crmContact.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting CRM contact ${id}:`, e);
    throw e;
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
    throw e;
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
    throw e;
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
  const currency = await assertCompanyCurrency(data.currency);
  if (!validMoneyAmount(data.value, currency, true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  const created = await db.crmDeal.create({
    data: {
      title: data.title,
      dealValue: data.value,
      currency,
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
  data: Partial<
    Omit<
      CRMDeal,
      "shoot_date" | "target_close_date" | "assigned_to" | "lost_reason"
    >
  > & {
    shoot_date?: string | null;
    target_close_date?: string | null;
    assigned_to?: string | null;
    lost_reason?: string | null;
  },
): Promise<CRMDeal | null> {
  try {
    if (data.value !== undefined || data.currency !== undefined) {
      const existing = await db.crmDeal.findUnique({ where: { id }, select: { currency: true } });
      if (!existing) return null;
      const currency = await assertCompanyCurrency(existing.currency);
      if (data.currency !== undefined) await assertCompanyCurrency(data.currency);
      if (data.value !== undefined && !validMoneyAmount(data.value, currency, true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
    }
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

    const existing = await db.crmDeal.findUnique({ where: { id } });
    if (!existing) throw new Error(serverMessages.dealNotFound);
    if (
      (data.stage || existing.dealStage) === "closed_lost" &&
      !(data.lost_reason ?? existing.lostReason)?.trim()
    )
      throw new Error(serverMessages.lostReasonIsRequired);
    if (
      data.assigned_to &&
      !(await db.user.findFirst({
        where: { id: data.assigned_to, isActive: true },
        select: { id: true },
      }))
    )
      throw new Error(serverMessages.invalidDealOwner);
    const updated = await db.crmDeal.update({
      where: { id },
      data: updateData,
      include: { contact: true },
    });
    return mapDeal(updated);
  } catch (e) {
    console.error(`Error updating CRM deal ${id}:`, e);
    throw e;
  }
}

export async function updateDealStage(
  id: string,
  stage: DealStage,
): Promise<CRMDeal | null> {
  return updateCRMDeal(id, { stage });
}

/**
 * Moves a linked deal forward when a quotation or invoice reaches a milestone. Never moves a deal
 * backwards and never reopens a closed one; a single conditional update keeps it race-free.
 */
export async function advanceDealForEvent(
  client: Pick<typeof db, "crmDeal" | "dealPipelineStage">,
  dealId: string | null | undefined,
  event: DealProgressEvent,
): Promise<boolean> {
  if (!dealId) return false;
  const target = DEAL_STAGE_ON_EVENT[event];
  // The company's own pipeline decides what "before" means: every open stage ordered ahead of the target.
  const stages = await client.dealPipelineStage.findMany({
    select: { id: true, sortOrder: true, kind: true, probability: true },
  });
  const goal = stages.find((stage) => stage.id === target);
  if (!goal) return false;
  const before = stages
    .filter(
      (stage) => stage.kind === "open" && stage.sortOrder < goal.sortOrder,
    )
    .map((stage) => stage.id);
  const { count } = await client.crmDeal.updateMany({
    where: { id: dealId, dealStage: { in: before } },
    data: {
      dealStage: target,
      probability: goal.probability ?? DEAL_STAGE_DEFAULTS[target].probability,
    },
  });
  return count > 0;
}

export async function deleteCRMDeal(id: string): Promise<boolean> {
  try {
    await db.crmDeal.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting CRM deal ${id}:`, e);
    throw e;
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

    const phoneVars = phoneSearchVariants(clean);
    const contacts = await db.crmContact.findMany({
      where: {
        OR: [
          { firstName: { contains: clean, mode: "insensitive" } },
          { lastName: { contains: clean, mode: "insensitive" } },
          { companyName: { contains: clean, mode: "insensitive" } },
          { email: { contains: clean, mode: "insensitive" } },
          ...phoneVars.map((v) => ({ phone: { contains: v, mode: "insensitive" as const } })),
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return contacts.map(mapContact);
  } catch (e) {
    console.error("Error searching CRM contacts:", e);
    throw e;
  }
}

export interface GlobalSearchResult {
  category:
    | "customers"
    | "invoices"
    | "deals"
    | "people"
    | "orders"
    | "products"
    | "shipments"
    | "tasks"
    | "purchase_orders"
    | "legal"
    | "campaigns";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
}

export async function globalAdminSearch(
  query: string,
  limit: number = 8,
  categories: ReadonlySet<string> = new Set(["customers", "invoices", "deals"]),
  /** Data scope for deals: the owners whose deals may appear; null or missing for all. */
  dealScope?: string[] | null,
): Promise<GlobalSearchResult[]> {
  if (
    typeof query !== "string" ||
    query.length > 200 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  )
    throw new Error(serverMessages.invalidSearch);
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  try {
    const phoneVars = phoneSearchVariants(query);
    // 1. Search Contacts/Customers
    const contacts = categories.has("customers")
      ? await db.crmContact.findMany({
          where: {
            OR: [
              { firstName: { contains: clean, mode: "insensitive" } },
              { lastName: { contains: clean, mode: "insensitive" } },
              { companyName: { contains: clean, mode: "insensitive" } },
              { email: { contains: clean, mode: "insensitive" } },
              ...phoneVars.map((v) => ({ phone: { contains: v, mode: "insensitive" as const } })),
            ],
          },
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            contactType: true,
          },
        })
      : [];

    for (const c of contacts) {
      results.push({
        category: "customers",
        id: c.id,
        title:
          `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
          c.companyName ||
          "Client",
        subtitle: c.companyName
          ? `${c.companyName} • ${c.email || c.phone || ""}`
          : c.email || c.phone || "Client",
        url: ROUTES.crm.customer(c.id),
        badge: c.contactType || "client",
      });
    }

    // 2. Search Invoices
    const invoices = categories.has("invoices")
      ? await db.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: clean, mode: "insensitive" } },
              { notesEn: { contains: clean, mode: "insensitive" } },
              {
                client: {
                  companyName: { contains: clean, mode: "insensitive" },
                },
              },
              {
                client: { firstName: { contains: clean, mode: "insensitive" } },
              },
            ],
          },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            currency: true,
            status: true,
            client: { select: { companyName: true, firstName: true } },
          },
          take: limit,
        })
      : [];

    for (const inv of invoices) {
      results.push({
        category: "invoices",
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: `${Number(inv.totalAmount).toFixed(getCurrencyDecimals(inv.currency))} ${inv.currency} • ${inv.client?.companyName || inv.client?.firstName || "Client"}`,
        url: ROUTES.invoices.detail(inv.id),
        badge: inv.status,
      });
    }

    // 3. Search Deals
    const deals = categories.has("deals")
      ? await db.crmDeal.findMany({
          where: {
            ...(dealScope ? { assignedTo: { in: dealScope } } : {}),
            OR: [
              { title: { contains: clean, mode: "insensitive" } },
              {
                contact: {
                  companyName: { contains: clean, mode: "insensitive" },
                },
              },
            ],
          },
          select: {
            id: true,
            title: true,
            dealValue: true,
            currency: true,
            dealStage: true,
            contact: { select: { companyName: true, firstName: true } },
          },
          take: limit,
        })
      : [];

    for (const d of deals) {
      results.push({
        category: "deals",
        id: d.id,
        title: d.title,
        subtitle: `${Number(d.dealValue).toFixed(getCurrencyDecimals(d.currency))} ${d.currency} • ${d.contact?.companyName || d.contact?.firstName || ""}`,
        url: ROUTES.crm.deal(d.id),
        badge: d.dealStage,
      });
    }
    // 4. People: colleagues by name (either language), email or phone; links open the directory.
    const people = categories.has("people")
      ? await db.user.findMany({
          where: {
            isActive: true,
            archivedAt: null,
            OR: [
              { fullName: { contains: clean, mode: "insensitive" } },
              { email: { contains: clean, mode: "insensitive" } },
              ...phoneVars.map((v) => ({ phone: { contains: v } })),
              {
                employee: {
                  OR: [
                    { firstNameAr: { contains: clean } },
                    { lastNameAr: { contains: clean } },
                  ],
                },
              },
            ],
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            employee: { select: { jobTitleEn: true } },
          },
          orderBy: { fullName: "asc" },
          take: limit,
        })
      : [];
    for (const p of people) {
      results.push({
        category: "people",
        id: p.id,
        title: p.fullName,
        subtitle: [p.employee?.jobTitleEn, p.email].filter(Boolean).join(" • "),
        url: `${ROUTES.directory}?q=${encodeURIComponent(p.email)}`,
        badge: p.role,
      });
    }
  } catch (e) {
    console.error("Error running global admin search:", e);
  }

  return results;
}

export async function getCRMDealOverview(
  includeAnalytics = true,
  /** Owners whose deals count; null or missing for all. */ scope?:
    string[] | null,
) {
  const accountingCurrency = await getAccountingCurrency();
  const where = scope ? { assignedTo: { in: scope } } : {};
  const [groups, recent] = await Promise.all([
    includeAnalytics
      ? db.crmDeal.groupBy({
          where,
          by: ["dealStage", "currency"],
          _count: { _all: true },
          _sum: { dealValue: true },
        })
      : Promise.resolve([]),
    db.crmDeal.findMany({
      where,
      take: 5,
      include: { contact: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);
  const stageStats: Record<string, { count: number; value: number }> = {};
  let activeCount = 0,
    activePipelineValue = 0;
  for (const group of groups) {
    const entry = (stageStats[group.dealStage] ||= { count: 0, value: 0 });
    entry.count += group._count._all;
    if (group.currency === accountingCurrency)
      entry.value += Number(group._sum.dealValue || 0);
    if (isActiveDealStage(group.dealStage)) {
      activeCount += group._count._all;
      if (group.currency === accountingCurrency)
        activePipelineValue += Number(group._sum.dealValue || 0);
    }
  }
  return {
    recent: recent.map(mapDeal),
    stageStats,
    activeCount,
    activePipelineValue,
  };
}
