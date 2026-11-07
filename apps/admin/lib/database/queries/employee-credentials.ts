import { companyCurrency } from "../finance/company-currency";
import { roundMoney, validMoneyAmount } from "../finance/money";
import { serverMessages } from "@platform/locales";
import { claimUploadOrLink } from "../services/uploads";
import { db, runAtomicMutation } from "../atomic";
import { isCountryCode } from "../constants/clients";
import {
  COST_FREQUENCIES,
  CREDENTIAL_KINDS,
  VISA_TYPES,
  expiryStatus,
  monthlyCost,
  type ExpiryStatus,
} from "../constants/employee-documents";

export interface EmployeeIdentityInput {
  nationality?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "";
  cpr_number?: string;
  cpr_expiry_date?: string;
  passport_number?: string;
  passport_country?: string;
  passport_expiry_date?: string;
}

export interface EmployeeCredentialInput {
  kind: string;
  visa_type?: string;
  label?: string;
  number?: string;
  issuing_country?: string;
  issue_date?: string;
  expiry_date?: string;
  sponsor?: string;
  cost_amount?: number;
  cost_frequency?: string;
  cost_term_months?: number;
  paid_by?: "company" | "employee";
  file_url?: string;
  notes?: string;
}

export interface EmployeeCredentialRecord {
  id: string;
  kind: string;
  visa_type?: string;
  label?: string;
  number?: string;
  issuing_country?: string;
  issue_date?: string;
  expiry_date?: string;
  sponsor?: string;
  cost_amount?: number;
  cost_currency: string;
  cost_frequency?: string;
  cost_term_months?: number;
  paid_by: string;
  file_url?: string;
  notes?: string;
  status: ExpiryStatus;
  days_left: number | null;
  monthly_cost: number;
}

export interface EmployeeResidency {
  identity: {
    nationality?: string;
    date_of_birth?: string;
    gender?: string;
    cpr_number?: string;
    cpr_expiry_date?: string;
    passport_number?: string;
    passport_country?: string;
    passport_expiry_date?: string;
  };
  credentials: EmployeeCredentialRecord[];
  /** Recurring cost to the company per month and per year, in the company currency. */
  monthlyCost: number;
  yearlyCost: number;
  oneTimeCost: number;
}

const clean = (value: unknown, max = 120) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error(serverMessages.invalidInput);
  return text || null;
};
const day = (value: unknown) => {
  const text = clean(value, 10);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)))
    throw new Error(serverMessages.invalidDate);
  const date = new Date(`${text}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== text) throw new Error(serverMessages.invalidDate);
  return date;
};
const iso = (date: Date | null | undefined) =>
  date ? date.toISOString().slice(0, 10) : undefined;
const country = (value: unknown) => {
  const code = clean(value, 2);
  if (code && !isCountryCode(code))
    throw new Error(serverMessages.chooseACountryFromTheList);
  return code;
};

/** Identity columns for an employee, using the issuing country recorded alongside them. */
export function normalizeEmployeeIdentity(input: EmployeeIdentityInput) {
  const cpr = clean(input.cpr_number, 64)?.replace(/\s+/g, "") ?? null;
  if (cpr && (!new RegExp("^[\\p{L}\\p{N}./-]+$", "u").test(cpr) || cpr.length > 64))
    throw new Error(serverMessages.aCPRNumberHas9Digits);
  const birth = day(input.date_of_birth);
  if (birth && (birth > new Date() || birth.getUTCFullYear() < 1920))
    throw new Error(serverMessages.enterAValidDateOfBirth);
  return {
    nationality: country(input.nationality),
    dateOfBirth: birth,
    gender:
      input.gender === "male" || input.gender === "female"
        ? input.gender
        : null,
    cprNumber: cpr,
    cprExpiryDate: day(input.cpr_expiry_date),
    passportNumber: clean(input.passport_number, 30)?.toUpperCase() ?? null,
    passportCountry: country(input.passport_country),
    passportExpiryDate: day(input.passport_expiry_date),
  };
}

export function normalizeEmployeeCredential(input: EmployeeCredentialInput) {
  if (!(CREDENTIAL_KINDS as readonly string[]).includes(input.kind))
    throw new Error(serverMessages.chooseTheDocumentType);
  const issueDate = day(input.issue_date);
  const expiryDate = day(input.expiry_date);
  if (issueDate && expiryDate && expiryDate < issueDate)
    throw new Error(serverMessages.theExpiryDateCannotBeBefore);
  const amount =
    input.cost_amount === undefined ||
    input.cost_amount === null ||
    Number.isNaN(input.cost_amount)
      ? null
      : Math.round(Number(input.cost_amount) * 1_000_000) / 1_000_000;
  if (
    amount !== null &&
    (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000)
  )
    throw new Error(serverMessages.enterAValidCost);
  const frequency =
    amount === null
      ? null
      : (COST_FREQUENCIES as readonly string[]).includes(
            input.cost_frequency ?? "",
          )
        ? input.cost_frequency!
        : null;
  if (amount !== null && !frequency)
    throw new Error(serverMessages.chooseHowOftenTheCostIs);
  const termMonths =
    frequency === "term" ? Number(input.cost_term_months) : null;
  if (
    frequency === "term" &&
    (!Number.isInteger(termMonths) || termMonths! < 1 || termMonths! > 120)
  )
    throw new Error(serverMessages.enterTheNumberOfMonthsThe);
  if (input.kind === "other" && !clean(input.label))
    throw new Error(serverMessages.nameTheDocument);
  return {
    kind: input.kind,
    visaType:
      input.kind === "visa" &&
      (VISA_TYPES as readonly string[]).includes(input.visa_type ?? "")
        ? input.visa_type!
        : null,
    label: clean(input.label),
    number: clean(input.number, 60),
    issuingCountry: country(input.issuing_country),
    issueDate,
    expiryDate,
    sponsor: clean(input.sponsor),
    costAmount: amount,
    costFrequency: frequency,
    costTermMonths: termMonths,
    paidBy: input.paid_by === "employee" ? "employee" : "company",
    fileUrl: clean(input.file_url, 300),
    notes: clean(input.notes, 1000),
  };
}

type CredentialRow = Awaited<
  ReturnType<typeof db.employeeCredential.findMany>
>[number];
export function mapEmployeeCredential(
  c: CredentialRow,
): EmployeeCredentialRecord {
  const expiry = expiryStatus(c.expiryDate);
  const amount = c.costAmount === null ? undefined : Number(c.costAmount);
  return {
    id: c.id,
    kind: c.kind,
    visa_type: c.visaType ?? undefined,
    label: c.label ?? undefined,
    number: c.number ?? undefined,
    issuing_country: c.issuingCountry ?? undefined,
    issue_date: iso(c.issueDate),
    expiry_date: iso(c.expiryDate),
    sponsor: c.sponsor ?? undefined,
    cost_amount: amount,
    cost_currency: c.costCurrency,
    cost_frequency: c.costFrequency ?? undefined,
    cost_term_months: c.costTermMonths ?? undefined,
    paid_by: c.paidBy,
    file_url: c.fileUrl ?? undefined,
    notes: c.notes ?? undefined,
    status: expiry.status,
    days_left: expiry.days,
    monthly_cost:
      c.paidBy === "company"
        ? monthlyCost(amount, c.costFrequency, c.costTermMonths)
        : 0,
  };
}

export async function getEmployeeResidency(
  employeeId: string,
): Promise<EmployeeResidency | null> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      credentials: {
        orderBy: [
          { expiryDate: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" },
        ],
      },
    },
  });
  if (!employee) return null;
  const credentials = employee.credentials.map(mapEmployeeCredential);
  const currency = await companyCurrency();
  const monthly = credentials.reduce((sum, c) => sum + c.monthly_cost, 0);
  return {
    identity: {
      nationality: employee.nationality ?? undefined,
      date_of_birth: iso(employee.dateOfBirth),
      gender: employee.gender ?? undefined,
      cpr_number: employee.cprNumber ?? undefined,
      cpr_expiry_date: iso(employee.cprExpiryDate),
      passport_number: employee.passportNumber ?? undefined,
      passport_country: employee.passportCountry ?? undefined,
      passport_expiry_date: iso(employee.passportExpiryDate),
    },
    credentials,
    monthlyCost: roundMoney(monthly, currency),
    yearlyCost: roundMoney(monthly * 12, currency),
    oneTimeCost: credentials
      .filter((c) => c.cost_frequency === "one_time" && c.paid_by === "company")
      .reduce((sum, c) => sum + (c.cost_amount ?? 0), 0),
  };
}

export async function updateEmployeeIdentity(
  employeeId: string,
  input: EmployeeIdentityInput,
) {
  const data = normalizeEmployeeIdentity(input);
  return runAtomicMutation(async () => {
    const exists = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!exists) throw new Error(serverMessages.employeeNotFound);
    await db.employee.update({ where: { id: employeeId }, data });
  });
}

export async function saveEmployeeCredential(
  employeeId: string,
  input: EmployeeCredentialInput & { id?: string },
  actorId?: string,
) {
  const data = normalizeEmployeeCredential(input);
  if (data.costAmount !== null && !validMoneyAmount(data.costAmount, await companyCurrency(), true)) throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  return runAtomicMutation(async () => {
    const existing = input.id
      ? await db.employeeCredential.findUnique({
          where: { id: input.id },
          select: { employeeId: true, fileUrl: true },
        })
      : null;
    if (input.id && (!existing || existing.employeeId !== employeeId))
      throw new Error(serverMessages.documentNotFound);
    // A new file is an uploaded copy (claimed now) or a link to where the document is kept.
    if (data.fileUrl && data.fileUrl !== existing?.fileUrl)
      await claimUploadOrLink(data.fileUrl, actorId);
    if (input.id)
      return db.employeeCredential.update({ where: { id: input.id }, data });
    const exists = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!exists) throw new Error(serverMessages.employeeNotFound);
    return db.employeeCredential.create({ data: { ...data, employeeId } });
  });
}

export async function deleteEmployeeCredential(id: string) {
  const existing = await db.employeeCredential.findUnique({
    where: { id },
    select: { employeeId: true },
  });
  if (!existing) throw new Error(serverMessages.documentNotFound);
  await db.employeeCredential.delete({ where: { id } });
  return existing.employeeId;
}

/** Employee documents expiring within `days` (or already expired) for the HR overview and reminders. */
export async function listExpiringEmployeeDocuments(days = 60) {
  const until = new Date(Date.now() + days * 86400000);
  const employees = await db.employee.findMany({
    where: {
      status: { not: "terminated" },
      OR: [
        { passportExpiryDate: { lte: until } },
        { cprExpiryDate: { lte: until } },
        { credentials: { some: { expiryDate: { lte: until } } } },
      ],
    },
    select: {
      id: true,
      employeeNumber: true,
      firstNameEn: true,
      lastNameEn: true,
      firstNameAr: true,
      lastNameAr: true,
      passportExpiryDate: true,
      cprExpiryDate: true,
      credentials: {
        where: { expiryDate: { lte: until } },
        select: { id: true, kind: true, label: true, expiryDate: true },
      },
    },
  });
  const rows: Array<{
    employeeId: string;
    employeeNumber: string;
    nameEn: string;
    nameAr: string;
    document: string;
    label?: string;
    expiryDate: string;
    days: number;
  }> = [];
  for (const e of employees) {
    const base = {
      employeeId: e.id,
      employeeNumber: e.employeeNumber,
      nameEn: `${e.firstNameEn} ${e.lastNameEn}`,
      nameAr: `${e.firstNameAr} ${e.lastNameAr}`,
    };
    const push = (
      document: string,
      date: Date | null,
      label?: string | null,
    ) => {
      if (!date || date > until) return;
      rows.push({
        ...base,
        document,
        label: label ?? undefined,
        expiryDate: iso(date)!,
        days: expiryStatus(date).days!,
      });
    };
    push("passport", e.passportExpiryDate);
    push("cpr", e.cprExpiryDate);
    for (const c of e.credentials) push(c.kind, c.expiryDate, c.label);
  }
  return rows.sort((a, b) => a.days - b.days);
}
