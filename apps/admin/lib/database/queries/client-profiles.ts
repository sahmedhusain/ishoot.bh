import { isLocale } from "@platform/locales/registry";
import { countryIso } from "../constants/phone";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../atomic";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { isValidPhone, formatPhoneE164, phoneSearchVariants } from "../constants/phone";
import {
  BAHRAIN_CR_PATTERN,
  BAHRAIN_VAT_PATTERN,
  CLIENT_ACTIVITY_FILTERS,
  CLIENT_BALANCE_FILTERS,
  CLIENT_DORMANT_DAYS,
  CLIENT_KINDS,
  CLIENT_SORTS,
  CLIENT_TIERS,
  GOVERNMENT_TYPES,
  isCountryCode,
  type ClientSort,
} from "../constants/clients";
import type { ClientListRow, ClientProfileInput, CRMContact } from "../types";
import { mapContact } from "./crm";

const MAX_CONTACT_PERSONS = 20;
const clean = (value: unknown, max = 200): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error(serverMessages.invalidInput);
  return text || null;
};
const oneOf = <T extends readonly string[]>(
  list: T,
  value: unknown,
): T[number] | null =>
  typeof value === "string" && (list as readonly string[]).includes(value)
    ? (value as T[number])
    : null;

/** Turns a stored client back into form input, so a partial update can be validated as a whole profile. */
function storedProfile(c: CRMContact): ClientProfileInput {
  return {
    client_kind: c.client_kind,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    job_title: c.job_title,
    company: c.company,
    company_ar: c.company_name_ar,
    company_origin: c.company_origin,
    legal_form: c.legal_form,
    cr_number: c.cr_number,
    cr_expiry_date: c.cr_expiry_date,
    registration_number: c.registration_number,
    registration_country: c.registration_country,
    government_type: c.government_type,
    supplier_number: c.supplier_number,
    requires_purchase_order: c.requires_purchase_order,
    nationality: c.nationality,
    industry: c.industry,
    website: c.website,
    vat_number: c.vat_number,
    preferred_language: c.preferred_language,
    payment_terms_days: c.payment_terms_days,
    address: c.address_details,
    contact_type: c.contact_type,
    notes: c.notes,
    contact_persons: c.contact_persons?.map((p) => ({ ...p })),
  };
}

/**
 * Validates a client profile and returns the columns to store plus its points of contact.
 * Individuals are one person; companies and government entities need at least one point of contact,
 * and the primary one is mirrored onto the client's name, e-mail, phone and job title.
 */
export function normalizeClientProfile(input: ClientProfileInput, companyCountry?: string) {
  const kind =
    oneOf(CLIENT_KINDS, input.client_kind) ??
    (clean(input.company) ? "company" : "individual");
  const address = input.address ?? {};
  const addressCountry = clean(address.country, 2);
  if (addressCountry && !isCountryCode(addressCountry))
    throw new Error(serverMessages.chooseACountryFromTheList);
  const nationality = clean(input.nationality, 2);
  if (nationality && !isCountryCode(nationality))
    throw new Error(serverMessages.chooseACountryFromTheList);
  const preferredLanguage =
    isLocale(input.preferred_language)
      ? input.preferred_language
      : null;
  const terms = input.payment_terms_days;
  if (
    terms !== undefined &&
    terms !== null &&
    (!Number.isInteger(terms) || terms < 0 || terms > 365)
  )
    throw new Error(serverMessages.paymentTermsMustBeBetween0);
  const website = clean(input.website, 300);
  const rawEmail = clean(input.email, 254);
  if (rawEmail && !isValidEmail(rawEmail))
    throw new Error(serverMessages.enterAValidEMailAddress);
  const email = rawEmail ? normalizeEmail(rawEmail) : null;

  const companyName = clean(input.company);
  let companyOrigin: "local" | "foreign" | null = null;
  let crNumber: string | null = null;
  let registrationNumber: string | null = null;
  let registrationCountry: string | null = null;
  if (kind === "company") {
    if (!companyName) throw new Error(serverMessages.companyNameIsRequired);
    companyOrigin = input.company_origin === "foreign" ? "foreign" : "local";
    if (companyOrigin === "local") {
      registrationCountry = clean(input.registration_country, 2) ?? companyCountry ?? null;
      crNumber = clean(input.cr_number, 100)?.replace(/\s+/g, "") ?? null;
      if (!crNumber || (registrationCountry === "BH" && !BAHRAIN_CR_PATTERN.test(crNumber)))
        throw new Error(serverMessages.enterTheCommercialRegistrationCRNumber);
    } else {
      registrationCountry = clean(input.registration_country, 2);
      if (
        !registrationCountry ||
        !isCountryCode(registrationCountry) ||
        registrationCountry === companyCountry
      )
        throw new Error(serverMessages.chooseTheCountryWhereTheCompany);
      registrationNumber = clean(input.registration_number, 60);
      if (!registrationNumber)
        throw new Error(serverMessages.enterTheCompanySRegistrationNumber);
    }
  } else if (kind === "government") {
    if (!companyName)
      throw new Error(serverMessages.enterTheGovernmentEntitySName);
    registrationCountry = clean(input.registration_country, 2) ?? companyCountry ?? null;
    if (!isCountryCode(registrationCountry))
      throw new Error(serverMessages.chooseACountryFromTheList);
  }
  const vatNumber = clean(input.vat_number, 30)?.replace(/\s+/g, "") ?? null;
  if (
    vatNumber &&
    kind !== "individual" &&
    registrationCountry === "BH" &&
    !BAHRAIN_VAT_PATTERN.test(vatNumber)
  )
    throw new Error(serverMessages.aBahrainVATNumberHas15);

  // Points of contact.
  const persons =
    kind === "individual"
      ? []
      : (input.contact_persons ?? [])
          .slice(0, MAX_CONTACT_PERSONS + 1)
          .map((p, index) => {
            const fullName = clean(p.full_name, 150);
            if (!fullName)
              throw new Error(serverMessages.everyPointOfContactNeedsA);
            const rawPersonEmail = clean(p.email, 254);
            if (rawPersonEmail && !isValidEmail(rawPersonEmail))
              throw new Error(serverMessages.enterAValidEMailAddress);
            const personEmail = rawPersonEmail ? normalizeEmail(rawPersonEmail) : null;
            const personPhoneRaw = clean(p.phone, 40);
            if (personPhoneRaw && !isValidPhone(personPhoneRaw))
              throw new Error(serverMessages.invalidInput);
            const personPhone = personPhoneRaw ? formatPhoneE164(personPhoneRaw) : null;
            return {
              fullName,
              position: clean(p.position, 120),
              department: clean(p.department, 120),
              email: personEmail,
              phone: personPhone,
              notes: clean(p.notes, 500),
              isPrimary: !!p.is_primary,
              displayOrder: index,
            };
          });
  if (persons.length > MAX_CONTACT_PERSONS)
    throw new Error(serverMessages.aClientCanHaveAtMost);
  if (kind !== "individual" && !persons.length)
    throw new Error(serverMessages.addAtLeastOnePointOf);
  const primaryIndex = Math.max(
    0,
    persons.findIndex((p) => p.isPrimary),
  );
  persons.forEach((p, index) => (p.isPrimary = index === primaryIndex));
  const primary = persons[primaryIndex];

  let firstName: string;
  let lastName: string | null;
  if (primary) {
    const [first, ...rest] = primary.fullName.split(/\s+/);
    firstName = first;
    lastName = rest.join(" ") || null;
  } else {
    firstName = clean(input.first_name, 100) ?? "";
    lastName = clean(input.last_name, 100);
    const fullName = clean(input.full_name, 200);
    if (!firstName && fullName) {
      const [first, ...rest] = fullName.split(/\s+/);
      firstName = first;
      lastName = rest.join(" ") || null;
    }
    if (!firstName) throw new Error(serverMessages.clientNameIsRequired);
  }
  const rawPhone = primary ? primary.phone : clean(input.phone, 40);
  if (rawPhone && !isValidPhone(rawPhone))
    throw new Error(serverMessages.invalidInput);
  const phone = rawPhone ? formatPhoneE164(rawPhone) : null;
  const rawContactEmail = primary ? primary.email : email;
  if (rawContactEmail && !isValidEmail(rawContactEmail))
    throw new Error(serverMessages.enterAValidEMailAddress);
  const contactEmail = rawContactEmail ? normalizeEmail(rawContactEmail) : null;

  const data = {
    clientKind: kind,
    firstName,
    lastName,
    email: contactEmail,
    emailNorm: contactEmail,
    phone,
    phoneE164: phone ? formatPhoneE164(phone) : null,
    jobTitle: primary ? primary.position : clean(input.job_title, 120),
    companyName: kind === "individual" ? null : companyName,
    companyNameAr: kind === "individual" ? null : clean(input.company_ar),
    companyOrigin,
    legalForm: kind === "company" ? clean(input.legal_form, 100) : null,
    crNumber,
    crExpiryDate:
      kind === "company" &&
      companyOrigin === "local" &&
      clean(input.cr_expiry_date, 10)
        ? new Date(`${clean(input.cr_expiry_date, 10)}T00:00:00Z`)
        : null,
    registrationNumber,
    registrationCountry,
    governmentType:
      kind === "government"
        ? oneOf(GOVERNMENT_TYPES, input.government_type)
        : null,
    supplierNumber:
      kind === "government" ? clean(input.supplier_number, 60) : null,
    requiresPurchaseOrder:
      kind === "government" ? !!input.requires_purchase_order : false,
    nationality: kind === "individual" ? nationality : null,
    industry: kind === "individual" ? null : clean(input.industry, 100),
    website:
      website && !/^https?:\/\//i.test(website)
        ? `https://${website}`
        : website,
    vatNumber,
    preferredLanguage,
    paymentTermsDays: terms ?? null,
    contactType: input.contact_type ?? "client",
    notes: clean(input.notes, 5000),
    addressCountry,
    addressCity: clean(address.city, 120),
    addressArea: clean(address.area, 120),
    addressBlock: clean(address.block, 20),
    addressRoad: clean(address.road, 60),
    addressBuilding: clean(address.building, 60),
    addressUnit: clean(address.unit, 60),
    addressLine: clean(address.line, 300),
    addressState: clean(address.state, 120),
    addressPostalCode: clean(address.postal_code, 20),
    addressPoBox: clean(address.po_box, 20),
  };
  if (data.crExpiryDate && Number.isNaN(data.crExpiryDate.getTime()))
    throw new Error(serverMessages.invalidDate);
  return { data, persons: persons.map(({ ...p }) => p) };
}

async function assertUniqueCr(crNumber: string | null, exceptId?: string) {
  if (!crNumber) return;
  const other = await db.crmContact.findFirst({
    where: { crNumber, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (other)
    throw new Error(serverMessages.anotherClientIsAlreadyRegisteredWith);
}

export async function getClientProfile(id: string): Promise<CRMContact | null> {
  const row = await db.crmContact.findUnique({
    where: { id },
    include: { contactPersons: { orderBy: { displayOrder: "asc" } } },
  });
  return row ? mapContact(row) : null;
}

export async function createClientProfile(
  input: ClientProfileInput,
): Promise<CRMContact> {
  const company = await db.companySetting.findUnique({ where: { singleton: 1 }, select: { country: true } });
  const { data, persons } = normalizeClientProfile(input, countryIso(company?.country) ?? company?.country ?? undefined);
  return runAtomicMutation(async () => {
    await assertUniqueCr(data.crNumber);
    const created = await db.crmContact.create({
      data: { ...data, contactPersons: { create: persons } },
      include: { contactPersons: { orderBy: { displayOrder: "asc" } } },
    });
    return mapContact(created);
  });
}

export async function updateClientProfile(
  id: string,
  input: ClientProfileInput,
): Promise<CRMContact> {
  return runAtomicMutation(async () => {
    const existing = await getClientProfile(id);
    if (!existing) throw new Error(serverMessages.contactNotFound);
    const defined = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as ClientProfileInput;
    const merged: ClientProfileInput = {
      ...storedProfile(existing),
      ...defined,
    };
    // A changed type starts from the new type's own fields: a full name typed for an individual replaces the stored one.
    if (defined.full_name) {
      merged.first_name = undefined;
      merged.last_name = undefined;
    }
    const company = await db.companySetting.findUnique({ where: { singleton: 1 }, select: { country: true } });
    const { data, persons } = normalizeClientProfile(merged, countryIso(company?.country) ?? company?.country ?? undefined);
    await assertUniqueCr(data.crNumber, id);
    await db.clientContactPerson.deleteMany({ where: { contactId: id } });
    const updated = await db.crmContact.update({
      where: { id },
      data: { ...data, contactPersons: { create: persons } },
      include: { contactPersons: { orderBy: { displayOrder: "asc" } } },
    });
    return mapContact(updated);
  });
}

// ---------------------------------------------------------------- list, ranking, export

export type ClientListParameters = {
  q?: string;
  page?: string;
  kind?: string;
  type?: string;
  origin?: string;
  country?: string;
  tier?: string;
  balance?: string;
  activity?: string;
  sort?: string;
};

export function clientListParameters(input: ClientListParameters = {}) {
  const pick = <T extends readonly string[]>(list: T, value: unknown) =>
    oneOf(list, value) ?? "all";
  return {
    q: typeof input.q === "string" ? input.q.trim().slice(0, 200) : "",
    page: Math.min(
      1000000,
      Math.max(1, Number.parseInt(input.page || "1", 10) || 1),
    ),
    kind: pick(CLIENT_KINDS, input.kind),
    type: pick(
      ["client", "agency", "vendor", "freelancer"] as const,
      input.type,
    ),
    origin: pick(["local", "foreign"] as const, input.origin),
    country: isCountryCode(input.country) ? input.country : "all",
    tier: pick(CLIENT_TIERS, input.tier),
    balance: pick(CLIENT_BALANCE_FILTERS, input.balance),
    activity: pick(CLIENT_ACTIVITY_FILTERS, input.activity),
    sort: (oneOf(CLIENT_SORTS, input.sort) ?? "newest") as ClientSort,
  };
}
export type ClientListFilters = ReturnType<typeof clientListParameters>;

/**
 * Billing standing per client in the base currency: billed (issued, not void), collected and outstanding.
 * Other currencies convert at the latest stored rate; with no rate they are left out of the ranking.
 */
function standingSql(baseCurrency: string) {
  const convert = (expr: Prisma.Sql) =>
    Prisma.sql`CASE WHEN inv.currency = ${baseCurrency} THEN ${expr} WHEN r.rate > 0 THEN ${expr} / r.rate ELSE 0 END`;
  return Prisma.sql`
    rates AS (
      SELECT DISTINCT ON ("quoteCurrency") "quoteCurrency" AS currency, rate
      FROM "ExchangeRateSnapshot" WHERE "baseCurrency" = ${baseCurrency}
      ORDER BY "quoteCurrency", "effectiveDate" DESC
    ),
    inv AS (
      SELECT COALESCE(i."clientId", d."contactId") AS cid, i.id, i.currency, i."totalAmount" AS total, i."dueDate", i."issueDate"
      FROM "Invoice" i LEFT JOIN "CrmDeal" d ON d.id = i."dealId"
      WHERE i.status NOT IN ('draft', 'void') AND COALESCE(i."clientId", d."contactId") IS NOT NULL
    ),
    paid AS (
      SELECT p."invoiceId", SUM(p.amount) AS amount, MAX(p."paymentDate") AS last
      FROM "Payment" p JOIN inv ON inv.id = p."invoiceId" AND p.currency = inv.currency
      GROUP BY p."invoiceId"
    ),
    standing AS (
      SELECT inv.cid,
        SUM(${convert(Prisma.sql`inv.total`)}) AS billed,
        SUM(${convert(Prisma.sql`LEAST(inv.total, COALESCE(paid.amount, 0))`)}) AS collected,
        SUM(${convert(Prisma.sql`GREATEST(0, inv.total - COALESCE(paid.amount, 0))`)}) AS outstanding,
        BOOL_OR(inv.total > COALESCE(paid.amount, 0) AND inv."dueDate" < CURRENT_DATE) AS overdue,
        COUNT(*)::int AS invoice_count,
        GREATEST(MAX(inv."issueDate"), MAX(paid.last)) AS last_billing
      FROM inv LEFT JOIN paid ON paid."invoiceId" = inv.id LEFT JOIN rates r ON r.currency = inv.currency
      GROUP BY inv.cid
    ),
    ranked AS (
      SELECT cid, billed,
        ROW_NUMBER() OVER (ORDER BY billed DESC, cid) AS rank,
        SUM(billed) OVER (ORDER BY billed DESC, cid ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS billed_before,
        SUM(billed) OVER () AS grand
      FROM standing WHERE billed > 0
    ),
    deals AS (
      SELECT "contactId" AS cid, COUNT(*) FILTER (WHERE "dealStage" = 'closed_won')::int AS won, MAX("updatedAt") AS last
      FROM "CrmDeal" WHERE "contactId" IS NOT NULL GROUP BY "contactId"
    ),
    requests AS (
      SELECT "customerId" AS cid, MAX("createdAt") AS last FROM "Inquiry" WHERE "customerId" IS NOT NULL GROUP BY "customerId"
    ),
    persons AS (
      SELECT "contactId" AS cid, COUNT(*)::int AS n FROM "ClientContactPerson" GROUP BY "contactId"
    ),
    client_rows AS (
      SELECT c.id,
        COALESCE(s.billed, 0) AS billed, COALESCE(s.collected, 0) AS collected, COALESCE(s.outstanding, 0) AS outstanding,
        COALESCE(s.overdue, false) AS overdue, COALESCE(s.invoice_count, 0) AS invoice_count, s.invoice_count IS NULL AS never_billed,
        rk.rank,
        CASE WHEN rk.rank IS NULL THEN 'none'
             WHEN COALESCE(rk.billed_before, 0) < rk.grand * 0.80 THEN 'A'
             WHEN COALESCE(rk.billed_before, 0) < rk.grand * 0.95 THEN 'B'
             ELSE 'C' END AS tier,
        COALESCE(dl.won, 0) AS deals_won,
        COALESCE(pc.n, 0) AS persons,
        GREATEST(c."createdAt", s.last_billing::timestamp, dl.last, rq.last) AS last_activity
      FROM "CrmContact" c
      LEFT JOIN standing s ON s.cid = c.id
      LEFT JOIN ranked rk ON rk.cid = c.id
      LEFT JOIN deals dl ON dl.cid = c.id
      LEFT JOIN requests rq ON rq.cid = c.id
      LEFT JOIN persons pc ON pc.cid = c.id
    )`;
}

function filterSql(f: ClientListFilters, extra: Prisma.Sql[] = []) {
  const and: Prisma.Sql[] = [...extra];
  if (f.q) {
    const pattern = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
    const variants = phoneSearchVariants(f.q);
    const phoneSql =
      variants.length > 0
        ? Prisma.sql`OR ${Prisma.join(
            variants.map((v) => {
              const vPat = `%${v}%`;
              return Prisma.sql`c.phone ILIKE ${vPat} OR c."phoneE164" ILIKE ${vPat} OR EXISTS (SELECT 1 FROM "ClientContactPerson" p WHERE p."contactId" = c.id AND p.phone ILIKE ${vPat})`;
            }),
            " OR ",
          )}`
        : Prisma.empty;
    and.push(Prisma.sql`(
      c."firstName" ILIKE ${pattern} OR c."lastName" ILIKE ${pattern} OR CONCAT_WS(' ', c."firstName", c."lastName") ILIKE ${pattern}
      OR c."companyName" ILIKE ${pattern} OR c."companyNameAr" ILIKE ${pattern} OR c.email ILIKE ${pattern} OR c.phone ILIKE ${pattern}
      OR c."crNumber" ILIKE ${pattern} OR c."vatNumber" ILIKE ${pattern} OR c."registrationNumber" ILIKE ${pattern} OR c."addressCity" ILIKE ${pattern}
      OR EXISTS (SELECT 1 FROM "ClientContactPerson" p WHERE p."contactId" = c.id
        AND (p."fullName" ILIKE ${pattern} OR p.email ILIKE ${pattern} OR p.phone ILIKE ${pattern} OR p.department ILIKE ${pattern}))
      ${phoneSql}
    )`);
  }
  if (f.kind !== "all") and.push(Prisma.sql`c."clientKind" = ${f.kind}`);
  if (f.type !== "all") and.push(Prisma.sql`c."contactType" = ${f.type}`);
  if (f.origin !== "all") and.push(Prisma.sql`c."companyOrigin" = ${f.origin}`);
  if (f.country !== "all")
    and.push(
      Prisma.sql`(c."addressCountry" = ${f.country} OR c."registrationCountry" = ${f.country} OR c.nationality = ${f.country})`,
    );
  if (f.tier !== "all") and.push(Prisma.sql`x.tier = ${f.tier}`);
  if (f.balance === "outstanding") and.push(Prisma.sql`x.outstanding > 0`);
  if (f.balance === "overdue") and.push(Prisma.sql`x.overdue`);
  if (f.balance === "settled")
    and.push(Prisma.sql`NOT x.never_billed AND x.outstanding <= 0`);
  if (f.balance === "never_billed") and.push(Prisma.sql`x.never_billed`);
  const dormantSince = new Date(Date.now() - CLIENT_DORMANT_DAYS * 86400000);
  if (f.activity === "active")
    and.push(Prisma.sql`x.last_activity >= ${dormantSince}`);
  if (f.activity === "dormant")
    and.push(Prisma.sql`x.last_activity < ${dormantSince}`);
  return and.length
    ? Prisma.sql`WHERE ${Prisma.join(and, " AND ")}`
    : Prisma.empty;
}

const SORT_SQL: Record<ClientSort, Prisma.Sql> = {
  newest: Prisma.sql`c."createdAt" DESC, c.id DESC`,
  oldest: Prisma.sql`c."createdAt" ASC, c.id ASC`,
  name_asc: Prisma.sql`LOWER(COALESCE(NULLIF(c."companyName", ''), CONCAT_WS(' ', c."firstName", c."lastName"))) ASC, c.id`,
  name_desc: Prisma.sql`LOWER(COALESCE(NULLIF(c."companyName", ''), CONCAT_WS(' ', c."firstName", c."lastName"))) DESC, c.id`,
  rank: Prisma.sql`x.rank ASC NULLS LAST, c."createdAt" DESC, c.id`,
  revenue_desc: Prisma.sql`x.billed DESC, c.id`,
  revenue_asc: Prisma.sql`x.billed ASC, c.id`,
  outstanding_desc: Prisma.sql`x.outstanding DESC, c.id`,
  activity_desc: Prisma.sql`x.last_activity DESC NULLS LAST, c.id`,
  activity_asc: Prisma.sql`x.last_activity ASC NULLS LAST, c.id`,
};

type StandingRow = {
  id: string;
  billed: unknown;
  collected: unknown;
  outstanding: unknown;
  overdue: boolean;
  invoice_count: number;
  rank: bigint | null;
  tier: "A" | "B" | "C" | "none";
  deals_won: number;
  persons: number;
  last_activity: Date | null;
};

async function baseCurrency() {
  const accountingCurrency = await getAccountingCurrency();
  const settings = await db.companySetting.findFirst({
    select: { defaultCurrency: true },
  });
  return settings?.defaultCurrency || accountingCurrency;
}

async function hydrate(rows: StandingRow[]): Promise<ClientListRow[]> {
  const contacts = await db.crmContact.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { contactPersons: { orderBy: { displayOrder: "asc" } } },
  });
  const byId = new Map(contacts.map((c) => [c.id, c]));
  return rows.flatMap((r) => {
    const contact = byId.get(r.id);
    if (!contact) return [];
    const mapped = mapContact(contact);
    delete (mapped as any).notes;
    return [
      {
        ...mapped,
        rank: r.rank === null ? null : Number(r.rank),
        tier: r.tier,
        billed: Number(r.billed),
        collected: Number(r.collected),
        outstanding: Number(r.outstanding),
        overdue: r.overdue,
        invoice_count: r.invoice_count,
        deals_won: r.deals_won,
        contact_persons_count: r.persons,
        last_activity: (r.last_activity ?? (contact as any).createdAt ?? new Date()).toISOString(),
      },
    ];
  });
}

/** The client list with filters, sorting and ABC ranking. In export mode it walks every match by id. */
export async function getClientsPage(
  input: ClientListParameters,
  batch?: { after?: string; batchSize: number },
) {
  const f = clientListParameters(input);
  const currency = await baseCurrency();
  return runAtomicMutation(async () => {
    const withSql = Prisma.sql`WITH ${standingSql(currency)}`;
    const from = Prisma.sql`FROM "CrmContact" c JOIN client_rows x ON x.id = c.id ${filterSql(f)}`;
    if (batch) {
      const where = filterSql(
        f,
        batch.after ? [Prisma.sql`c.id > ${batch.after}`] : [],
      );
      const rows = await db.$queryRaw<StandingRow[]>(Prisma.sql`${withSql}
        SELECT x.* FROM "CrmContact" c JOIN client_rows x ON x.id = c.id ${where}
        ORDER BY c.id ASC LIMIT ${Math.min(500, batch.batchSize)}`);
      return {
        items: await hydrate(rows),
        total: 0,
        page: 1,
        pageSize: 500,
        filters: f,
        summary: null,
        currency,
      };
    }
    const countRows = await db.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`${withSql} SELECT COUNT(*) AS count ${from}`,
    );
    const total = Number(countRows?.[0]?.count ?? 0);
    const page = Math.min(f.page, Math.max(1, Math.ceil(total / 50)));
    const rows = await db.$queryRaw<StandingRow[]>(Prisma.sql`${withSql}
      SELECT x.* ${from} ORDER BY ${SORT_SQL[f.sort]} LIMIT 50 OFFSET ${(page - 1) * 50}`);
    const [summary] = (await db.$queryRaw<
      Array<Record<string, bigint | unknown>>
    >(Prisma.sql`${withSql}
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE c."clientKind" = 'company') AS companies,
        COUNT(*) FILTER (WHERE c."clientKind" = 'government') AS government,
        COUNT(*) FILTER (WHERE c."clientKind" = 'individual') AS individuals,
        COUNT(*) FILTER (WHERE x.tier = 'A') AS tier_a,
        COUNT(*) FILTER (WHERE x.outstanding > 0) AS with_balance,
        COALESCE(SUM(x.outstanding), 0) AS outstanding,
        COALESCE(SUM(x.billed), 0) AS billed
      FROM "CrmContact" c JOIN client_rows x ON x.id = c.id`)) || [];
    let items = await hydrate(rows || []);
    let finalTotal = total;
    if (!items.length) {
      const { listContacts, listInvoices } = await import("@platform/api-client");
      const [contacts, apiInvoices] = await Promise.all([
        listContacts().catch(() => []),
        listInvoices().catch(() => []),
      ]);
      if (contacts.length) {
        const todayStr = new Date().toISOString().slice(0, 10);
        items = contacts.map((c: any, index: number) => {
          const mapped = mapContact(c);
          delete (mapped as any).notes;
          const clientInvoices = (apiInvoices || []).filter(
            (inv: any) => (inv.contactId || inv.ContactID) === c.id,
          );
          const billed = clientInvoices.reduce(
            (sum: number, inv: any) => sum + Number(inv.total || inv.Total || inv.totalAmount || 0),
            0,
          );
          const collected = clientInvoices.reduce(
            (sum: number, inv: any) => sum + Number(inv.amountPaid || inv.AmountPaid || 0),
            0,
          );
          const outstanding = clientInvoices.reduce(
            (sum: number, inv: any) => sum + Number(inv.balanceDue || inv.BalanceDue || 0),
            0,
          );
          const isOverdue = clientInvoices.some(
            (inv: any) =>
              inv.status === "overdue" ||
              (Number(inv.balanceDue || inv.BalanceDue || 0) > 0 &&
                (inv.dueDate || inv.DueDate || todayStr).slice(0, 10) < todayStr),
          );
          return {
            ...mapped,
            rank: index + 1,
            tier: (index === 0 ? "A" : index < 3 ? "B" : "C") as "A" | "B" | "C",
            billed,
            collected,
            outstanding,
            overdue: isOverdue,
            invoice_count: clientInvoices.length,
            deals_won: 0,
            contact_persons_count: 0,
            last_activity: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
          };
        });
        finalTotal = items.length;
      }
    }
    const computedSummary = {
      total: finalTotal,
      companies: items.filter((i) => i.client_kind === "company" || i.company).length,
      government: items.filter((i) => i.client_kind === "government").length,
      individuals: items.filter((i) => i.client_kind === "individual" && !i.company).length,
      tier_a: items.filter((i) => i.tier === "A").length,
      with_balance: items.filter((i) => (i.outstanding || 0) > 0).length,
      outstanding: items.reduce((acc, i) => acc + (i.outstanding || 0), 0),
      billed: items.reduce((acc, i) => acc + (i.billed || 0), 0),
    };
    const summaryEntries = Object.entries(summary || {})
      .filter(([_, v]) => v != null && !isNaN(Number(v)))
      .map(([k, v]) => [k, Number(v)]);
    const finalSummary = {
      ...computedSummary,
      ...Object.fromEntries(summaryEntries),
    };
    return {
      items,
      total: finalTotal,
      page,
      pageSize: 50,
      filters: f,
      currency,
      summary: finalSummary as Record<
        | "total"
        | "companies"
        | "government"
        | "individuals"
        | "tier_a"
        | "with_balance"
        | "outstanding"
        | "billed",
        number
      >,
    };
  });
}

/** One client's rank and tier among all clients, for the client page. */
export async function getClientStanding(id: string) {
  const currency = await baseCurrency();
  const rows = await db.$queryRaw<StandingRow[]>(
    Prisma.sql`WITH ${standingSql(currency)} SELECT x.* FROM client_rows x WHERE x.id = ${id}`,
  );
  const r = rows[0];
  if (!r) return null;
  const rankedRows = await db.$queryRaw<Array<{ ranked: bigint }>>(
    Prisma.sql`WITH ${standingSql(currency)} SELECT COUNT(*) AS ranked FROM ranked`,
  );
  return {
    rank: r.rank === null ? null : Number(r.rank),
    rankedClients: Number(rankedRows?.[0]?.ranked ?? 0),
    tier: r.tier,
    billed: Number(r.billed),
    outstanding: Number(r.outstanding),
    overdue: r.overdue,
    currency,
  };
}
