import { isLocale } from "@platform/locales/registry";
import { countryIso } from "../constants/phone";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { isValidPhone, formatPhoneE164, phoneSearchVariants } from "../constants/phone";
import {
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
import { getCompanyConfiguration } from "../api/company";

const MAX_CONTACT_PERSONS = 20;
const clean = (value: unknown, max = 200): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))
    throw new Error(serverMessages.invalidInput);
  return text || null;
};
const oneOf = <T extends readonly string[]>(
  list: T,
  value: unknown,
): T[number] | null =>
  typeof value === "string" && (list as readonly string[]).includes(value)
    ? (value as T[number])
    : null;

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
  const preferredLanguage = isLocale(input.preferred_language)
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
      if (!crNumber)
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
    !/^[A-Za-z0-9-]{3,30}$/.test(vatNumber)
  )
    throw new Error(serverMessages.aBahrainVATNumberHas15);

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

  const crExpiryStr =
    kind === "company" &&
    companyOrigin === "local" &&
    clean(input.cr_expiry_date, 10)
      ? `${clean(input.cr_expiry_date, 10)}T00:00:00Z`
      : null;
  if (crExpiryStr && Number.isNaN(new Date(crExpiryStr).getTime()))
    throw new Error(serverMessages.invalidDate);

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
    crExpiryDate: crExpiryStr,
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
  return { data, persons: persons.map(({ ...p }) => p) };
}

async function assertUniqueCr(crNumber: string | null, exceptId?: string) {
  if (!crNumber) return;
  const contacts = await listTableRows<Record<string, any>>("sales", "crm_contact");
  const other = contacts.find(
    (c) => c.crNumber === crNumber && (!exceptId || c.id !== exceptId),
  );
  if (other)
    throw new Error(serverMessages.anotherClientIsAlreadyRegisteredWith);
}

export async function getClientProfile(id: string): Promise<CRMContact | null> {
  const [contacts, persons] = await Promise.all([
    listTableRows<Record<string, any>>("sales", "crm_contact"),
    listTableRows<Record<string, any>>("system", "client_contact_person", "display_order ASC"),
  ]);
  const row = contacts.find((c) => c.id === id);
  if (!row) return null;
  const contactPersons = persons
    .filter((p) => p.contactId === id)
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
  return mapContact({ ...row, contactPersons });
}

export async function createClientProfile(
  input: ClientProfileInput,
): Promise<CRMContact> {
  const company = await getCompanyConfiguration().catch(() => null);
  const { data, persons } = normalizeClientProfile(
    input,
    countryIso(company?.country) ?? company?.country ?? undefined,
  );
  return runAtomicMutation(async () => {
    await assertUniqueCr(data.crNumber);
    const id = crypto.randomUUID();
    const created = await upsertTableRow<Record<string, any>>("sales", "crm_contact", {
      id,
      ...data,
    });
    await upsertTableRow<Record<string, any>>("sales", "contact", {
      id,
      firstName: data.firstName || data.companyName || "Client",
      lastName: data.lastName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.companyName ?? null,
      contactType: data.contactType || "client",
      status: "active",
      notes: data.notes ?? null,
    });
    const createdPersons: Record<string, any>[] = [];
    for (const p of persons) {
      createdPersons.push(
        await upsertTableRow<Record<string, any>>("system", "client_contact_person", {
          id: crypto.randomUUID(),
          contactId: id,
          ...p,
        }),
      );
    }
    return mapContact({ ...created, contactPersons: createdPersons });
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
    if (defined.full_name) {
      merged.first_name = undefined;
      merged.last_name = undefined;
    }
    const company = await getCompanyConfiguration().catch(() => null);
    const { data, persons } = normalizeClientProfile(
      merged,
      countryIso(company?.country) ?? company?.country ?? undefined,
    );
    await assertUniqueCr(data.crNumber, id);
    const existingPersons = (
      await listTableRows<Record<string, any>>("system", "client_contact_person")
    ).filter((p) => p.contactId === id);
    for (const p of existingPersons) {
      await deleteTableRow("system", "client_contact_person", String(p.id));
    }
    const updated = await upsertTableRow<Record<string, any>>("sales", "crm_contact", {
      id,
      ...data,
    });
    await upsertTableRow<Record<string, any>>("sales", "contact", {
      id,
      firstName: data.firstName || data.companyName || "Client",
      lastName: data.lastName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      company: data.companyName ?? null,
      contactType: data.contactType || "client",
      status: "active",
      notes: data.notes ?? null,
    });
    const createdPersons: Record<string, any>[] = [];
    for (const p of persons) {
      createdPersons.push(
        await upsertTableRow<Record<string, any>>("system", "client_contact_person", {
          id: crypto.randomUUID(),
          contactId: id,
          ...p,
        }),
      );
    }
    return mapContact({ ...updated, contactPersons: createdPersons });
  });
}

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

async function baseCurrency() {
  const accountingCurrency = await getAccountingCurrency();
  const settings = await getCompanyConfiguration().catch(() => null);
  return settings?.defaultCurrency || accountingCurrency;
}

interface ComputedStanding {
  id: string;
  billed: number;
  collected: number;
  outstanding: number;
  overdue: boolean;
  invoice_count: number;
  never_billed: boolean;
  rank: number | null;
  tier: "A" | "B" | "C" | "none";
  deals_won: number;
  persons: number;
  last_activity: number;
}

async function computeAllStandings(currency: string) {
  const [contacts, persons, invoices, payments, deals, inquiries] = await Promise.all([
    listTableRows<Record<string, any>>("sales", "crm_contact"),
    listTableRows<Record<string, any>>("system", "client_contact_person"),
    listTableRows<Record<string, any>>("finance", "invoice"),
    listTableRows<Record<string, any>>("finance", "payment"),
    listTableRows<Record<string, any>>("sales", "crm_deal"),
    listTableRows<Record<string, any>>("sales", "inquiry"),
  ]);

  const dealById = new Map(deals.map((d) => [String(d.id), d]));
  const personsByContact = new Map<string, Record<string, any>[]>();
  for (const p of persons) {
    const cid = String(p.contactId ?? "");
    if (!cid) continue;
    const list = personsByContact.get(cid) ?? [];
    list.push(p);
    personsByContact.set(cid, list);
  }

  const paidByInvoice = new Map<string, { amount: number; lastMs: number }>();
  for (const p of payments) {
    if (!p.invoiceId) continue;
    const iid = String(p.invoiceId);
    const cur = paidByInvoice.get(iid) ?? { amount: 0, lastMs: 0 };
    cur.amount += Number(p.amount ?? 0);
    const ms = p.paymentDate ? new Date(p.paymentDate).getTime() : 0;
    if (ms > cur.lastMs) cur.lastMs = ms;
    paidByInvoice.set(iid, cur);
  }

  const todayMs = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const invStatsByContact = new Map<
    string,
    {
      billed: number;
      collected: number;
      outstanding: number;
      overdue: boolean;
      count: number;
      lastMs: number;
    }
  >();

  for (const inv of invoices) {
    if (inv.status === "draft" || inv.status === "void") continue;
    const cid =
      inv.clientId ??
      (inv.dealId ? dealById.get(String(inv.dealId))?.contactId : null);
    if (!cid) continue;
    const key = String(cid);
    const st = invStatsByContact.get(key) ?? {
      billed: 0,
      collected: 0,
      outstanding: 0,
      overdue: false,
      count: 0,
      lastMs: 0,
    };
    st.count += 1;
    const total = Number(inv.totalAmount ?? 0);
    const paidInfo = paidByInvoice.get(String(inv.id));
    const paid = paidInfo?.amount ?? 0;
    if (inv.currency === currency) {
      st.billed += total;
      st.collected += Math.min(total, paid);
      st.outstanding += Math.max(0, total - paid);
    }
    const dueMs = inv.dueDate ? new Date(inv.dueDate).getTime() : Infinity;
    if (total > paid && dueMs < todayMs) st.overdue = true;
    const issueMs = inv.issueDate ? new Date(inv.issueDate).getTime() : 0;
    st.lastMs = Math.max(st.lastMs, issueMs, paidInfo?.lastMs ?? 0);
    invStatsByContact.set(key, st);
  }

  const dealStatsByContact = new Map<string, { won: number; lastMs: number }>();
  for (const d of deals) {
    if (!d.contactId) continue;
    const key = String(d.contactId);
    const st = dealStatsByContact.get(key) ?? { won: 0, lastMs: 0 };
    if (d.dealStage === "closed_won") st.won += 1;
    const ms = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    if (ms > st.lastMs) st.lastMs = ms;
    dealStatsByContact.set(key, st);
  }

  const reqLastByContact = new Map<string, number>();
  for (const q of inquiries) {
    if (!q.customerId) continue;
    const key = String(q.customerId);
    const ms = q.createdAt ? new Date(q.createdAt).getTime() : 0;
    reqLastByContact.set(key, Math.max(reqLastByContact.get(key) ?? 0, ms));
  }

  const positive = Array.from(invStatsByContact.entries())
    .filter(([, s]) => s.billed > 0)
    .sort((a, b) => b[1].billed - a[1].billed || a[0].localeCompare(b[0]));
  const grand = positive.reduce((sum, [, s]) => sum + s.billed, 0);
  const rankMap = new Map<string, { rank: number; tier: "A" | "B" | "C" }>();
  let running = 0;
  positive.forEach(([cid, s], idx) => {
    const tier: "A" | "B" | "C" =
      running < grand * 0.8 ? "A" : running < grand * 0.95 ? "B" : "C";
    rankMap.set(cid, { rank: idx + 1, tier });
    running += s.billed;
  });

  const standings = new Map<string, ComputedStanding>();
  for (const c of contacts) {
    const cid = String(c.id);
    const invSt = invStatsByContact.get(cid);
    const rk = rankMap.get(cid);
    const dlSt = dealStatsByContact.get(cid);
    const rqLast = reqLastByContact.get(cid) ?? 0;
    const pList = personsByContact.get(cid) ?? [];
    const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : 0;
    standings.set(cid, {
      id: cid,
      billed: invSt?.billed ?? 0,
      collected: invSt?.collected ?? 0,
      outstanding: invSt?.outstanding ?? 0,
      overdue: invSt?.overdue ?? false,
      invoice_count: invSt?.count ?? 0,
      never_billed: !invSt,
      rank: rk?.rank ?? null,
      tier: rk?.tier ?? "none",
      deals_won: dlSt?.won ?? 0,
      persons: pList.length,
      last_activity: Math.max(createdMs, invSt?.lastMs ?? 0, dlSt?.lastMs ?? 0, rqLast),
    });
  }

  return { contacts, personsByContact, standings, rankedCount: positive.length };
}

export async function getClientsPage(
  input: ClientListParameters,
  batch?: { after?: string; batchSize: number },
) {
  const f = clientListParameters(input);
  const currency = await baseCurrency();
  const { contacts, personsByContact, standings } = await computeAllStandings(currency);

  const dormantSinceMs = Date.now() - CLIENT_DORMANT_DAYS * 86400000;
  const qLower = f.q.toLowerCase();
  const phoneVariants = f.q ? phoneSearchVariants(f.q).map((v) => v.toLowerCase()) : [];

  const filtered = contacts.filter((c) => {
    const cid = String(c.id);
    const x = standings.get(cid)!;
    const pList = personsByContact.get(cid) ?? [];
    if (batch?.after && cid <= batch.after) return false;

    if (f.q) {
      const hay = [
        c.firstName,
        c.lastName,
        `${c.firstName ?? ""} ${c.lastName ?? ""}`,
        c.companyName,
        c.companyNameAr,
        c.email,
        c.phone,
        c.crNumber,
        c.vatNumber,
        c.registrationNumber,
        c.addressCity,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      const personMatch = pList.some((p) =>
        [p.fullName, p.email, p.phone, p.department]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(qLower)),
      );
      const phoneMatch =
        phoneVariants.length > 0 &&
        phoneVariants.some(
          (v) =>
            String(c.phone ?? "").toLowerCase().includes(v) ||
            String(c.phoneE164 ?? "").toLowerCase().includes(v) ||
            pList.some((p) => String(p.phone ?? "").toLowerCase().includes(v)),
        );
      if (!hay.some((s) => s.includes(qLower)) && !personMatch && !phoneMatch) {
        return false;
      }
    }
    if (f.kind !== "all" && c.clientKind !== f.kind) return false;
    if (f.type !== "all" && c.contactType !== f.type) return false;
    if (f.origin !== "all" && c.companyOrigin !== f.origin) return false;
    if (
      f.country !== "all" &&
      c.addressCountry !== f.country &&
      c.registrationCountry !== f.country &&
      c.nationality !== f.country
    )
      return false;
    if (f.tier !== "all" && x.tier !== f.tier) return false;
    if (f.balance === "outstanding" && !(x.outstanding > 0)) return false;
    if (f.balance === "overdue" && !x.overdue) return false;
    if (f.balance === "settled" && (x.never_billed || x.outstanding > 0)) return false;
    if (f.balance === "never_billed" && !x.never_billed) return false;
    if (f.activity === "active" && !(x.last_activity >= dormantSinceMs)) return false;
    if (f.activity === "dormant" && !(x.last_activity < dormantSinceMs)) return false;
    return true;
  });

  const displayName = (c: Record<string, any>) =>
    (c.companyName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()).toLowerCase();

  if (batch) {
    filtered.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  } else {
    filtered.sort((a, b) => {
      const xa = standings.get(String(a.id))!;
      const xb = standings.get(String(b.id))!;
      const aCr = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCr = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      switch (f.sort) {
        case "oldest":
          return aCr - bCr || String(a.id).localeCompare(String(b.id));
        case "name_asc":
          return displayName(a).localeCompare(displayName(b)) || String(a.id).localeCompare(String(b.id));
        case "name_desc":
          return displayName(b).localeCompare(displayName(a)) || String(a.id).localeCompare(String(b.id));
        case "rank":
          return (xa.rank ?? Infinity) - (xb.rank ?? Infinity) || bCr - aCr || String(a.id).localeCompare(String(b.id));
        case "revenue_desc":
          return xb.billed - xa.billed || String(a.id).localeCompare(String(b.id));
        case "revenue_asc":
          return xa.billed - xb.billed || String(a.id).localeCompare(String(b.id));
        case "outstanding_desc":
          return xb.outstanding - xa.outstanding || String(a.id).localeCompare(String(b.id));
        case "activity_desc":
          return xb.last_activity - xa.last_activity || String(a.id).localeCompare(String(b.id));
        case "activity_asc":
          return xa.last_activity - xb.last_activity || String(a.id).localeCompare(String(b.id));
        case "newest":
        default:
          return bCr - aCr || String(b.id).localeCompare(String(a.id));
      }
    });
  }

  const total = filtered.length;
  const page = batch ? 1 : Math.min(f.page, Math.max(1, Math.ceil(total / 50)));
  const pageSize = batch ? Math.min(500, batch.batchSize) : 50;
  const slice = batch
    ? filtered.slice(0, pageSize)
    : filtered.slice((page - 1) * 50, page * 50);

  const items: ClientListRow[] = slice.map((c) => {
    const cid = String(c.id);
    const x = standings.get(cid)!;
    const mapped = mapContact({
      ...c,
      contactPersons: (personsByContact.get(cid) ?? []).sort(
        (a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0),
      ),
    });
    delete (mapped as any).notes;
    return {
      ...mapped,
      rank: x.rank,
      tier: x.tier,
      billed: x.billed,
      collected: x.collected,
      outstanding: x.outstanding,
      overdue: x.overdue,
      invoice_count: x.invoice_count,
      deals_won: x.deals_won,
      contact_persons_count: x.persons,
      last_activity: new Date(x.last_activity || Date.now()).toISOString(),
    };
  });

  if (batch) {
    return {
      items,
      total: 0,
      page: 1,
      pageSize: 500,
      filters: f,
      summary: null,
      currency,
    };
  }

  const summary = {
    total: contacts.length,
    companies: contacts.filter((c) => c.clientKind === "company").length,
    government: contacts.filter((c) => c.clientKind === "government").length,
    individuals: contacts.filter((c) => c.clientKind === "individual").length,
    tier_a: contacts.filter((c) => standings.get(String(c.id))?.tier === "A").length,
    with_balance: contacts.filter((c) => (standings.get(String(c.id))?.outstanding ?? 0) > 0).length,
    outstanding: contacts.reduce((s, c) => s + (standings.get(String(c.id))?.outstanding ?? 0), 0),
    billed: contacts.reduce((s, c) => s + (standings.get(String(c.id))?.billed ?? 0), 0),
  };

  return {
    items,
    total,
    page,
    pageSize: 50,
    filters: f,
    currency,
    summary,
  };
}

export async function getClientStanding(id: string) {
  const currency = await baseCurrency();
  const { standings, rankedCount } = await computeAllStandings(currency);
  const r = standings.get(id);
  if (!r) return null;
  return {
    rank: r.rank,
    rankedClients: rankedCount,
    tier: r.tier,
    billed: r.billed,
    outstanding: r.outstanding,
    overdue: r.overdue,
    currency,
  };
}
