import { serverMessages } from "@platform/locales";
import crypto from "crypto";
import { resolveSigningSignature } from "./signature-policies";
import { db, runAtomicMutation } from "../atomic";
import { LETTER_CLASSIFICATIONS } from "../constants/communications";
import {
  registerApprovalFinalizer,
  submitForApproval,
  cancelPendingApprovals,
} from "../services/approval-engine";
import { getNextSequenceNumber } from "./sequence";
import { getCompanySettings } from "./company-settings";
import { getCurrencyLabel } from "@platform/config/currency";

// ---------- Templates ----------

export interface LetterTemplateInput {
  key?: string;
  name_en: string;
  name_ar: string;
  subject_en: string;
  subject_ar: string;
  body_en: string;
  body_ar: string;
  about_employee: boolean;
  is_active: boolean;
}

export async function listLetterTemplates(includeInactive = true) {
  const rows = await db.letterTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { letters: true } } },
  });
  return rows.map((t) => ({
    id: t.id,
    key: t.key,
    nameEn: t.nameEn,
    nameAr: t.nameAr,
    subjectEn: t.subjectEn,
    subjectAr: t.subjectAr,
    bodyEn: t.bodyEn,
    bodyAr: t.bodyAr,
    aboutEmployee: t.aboutEmployee,
    isActive: t.isActive,
    letters: t._count.letters,
  }));
}

export async function saveLetterTemplate(
  input: LetterTemplateInput,
  id?: string,
) {
  const nameEn = input.name_en?.trim().slice(0, 120);
  const nameAr = input.name_ar?.trim().slice(0, 120);
  if (!nameEn || !nameAr) throw new Error(serverMessages.communicationError13);
  const data = {
    nameEn,
    nameAr,
    subjectEn: input.subject_en?.trim().slice(0, 300) ?? "",
    subjectAr: input.subject_ar?.trim().slice(0, 300) ?? "",
    bodyEn: input.body_en?.slice(0, 20000) ?? "",
    bodyAr: input.body_ar?.slice(0, 20000) ?? "",
    aboutEmployee: !!input.about_employee,
    isActive: !!input.is_active,
  };
  if (id) return db.letterTemplate.update({ where: { id }, data });
  let key =
    (input.key?.trim().toLowerCase() || nameEn.toLowerCase())
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "template";
  for (
    let n = 2;
    await db.letterTemplate.findUnique({
      where: { key },
      select: { id: true },
    });
    n++
  )
    key = `${key.replace(/_\d+$/, "")}_${n}`;
  return db.letterTemplate.create({
    data: { ...data, key, displayOrder: await db.letterTemplate.count() },
  });
}

// ---------- Placeholders ----------

const fmtDate = (value: Date, language: "ar" | "en", timeZone = "UTC") =>
  new Intl.DateTimeFormat(language === "ar" ? "ar-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(value);
const fmtMoney = (value: number, language: "ar" | "en", currency = "USD", decimals = 2) => {
  const amount = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const symbol = getCurrencyLabel(currency, language === "ar", false);
  return language === "ar" ? `${amount} ${symbol}` : `${symbol} ${amount}`;
};

/** The values a template's {{placeholders}} take, in one language. */
export async function letterValues(input: {
  language: "ar" | "en";
  employeeId?: string | null;
  recipient?: {
    name?: string | null;
    title?: string | null;
    organization?: string | null;
  };
  date?: Date;
  reference?: string;
  purpose?: string | null;
}) {
  const isAr = input.language === "ar";
  const company = await getCompanySettings();
  const tz = company.time_zone || "UTC";
  const curr = company.default_currency || "USD";
  const dec = company.currency_decimals ?? 3;
  const values: Record<string, string> = {
    "company.name":
      (isAr ? company.company_name_ar : company.company_name_en) ?? "",
    "company.cr": company.cr_number ?? "",
    "company.address": (isAr ? company.address_ar : company.address_en) ?? "",
    "company.phone": company.phone ?? "",
    "company.email": company.email ?? "",
    date: fmtDate(input.date ?? new Date(), input.language, tz),
    reference: input.reference ?? "{{reference}}",
    "recipient.name": input.recipient?.name ?? "",
    "recipient.title": input.recipient?.title ?? "",
    "recipient.organization": input.recipient?.organization ?? "",
    purpose: input.purpose ?? "",
  };
  if (input.employeeId) {
    const e = await db.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        department: true,
        employmentRecords: { where: { isCurrent: true }, take: 1 },
      },
    });
    if (e) {
      const pay = e.employmentRecords[0];
      const gross = pay
        ? Number(pay.basicSalary) +
          Number(pay.housingAllowance) +
          Number(pay.transportAllowance) +
          Number(pay.otherAllowances)
        : 0;
      Object.assign(values, {
        "employee.name": isAr
          ? `${e.firstNameAr} ${e.lastNameAr}`
          : `${e.firstNameEn} ${e.lastNameEn}`,
        "employee.number": e.employeeNumber,
        "employee.jobTitle": isAr ? e.jobTitleAr : e.jobTitleEn,
        "employee.department":
          (isAr ? e.department?.nameAr : e.department?.nameEn) ?? "",
        "employee.hireDate": fmtDate(e.hireDate, input.language, tz),
        "employee.cpr": e.cprNumber ?? "",
        "employee.nationality": e.nationality ?? "",
        "employee.passport": e.passportNumber ?? "",
        "employee.basicSalary": pay
          ? fmtMoney(Number(pay.basicSalary), input.language, curr, dec)
          : "",
        "employee.grossSalary": pay ? fmtMoney(gross, input.language, curr, dec) : "",
      });
    }
  }
  return values;
}

export const fillPlaceholders = (
  text: string,
  values: Record<string, string>,
) =>
  text.replace(
    /\{\{\s*([a-zA-Z.]+)\s*\}\}/g,
    (match, key: string) => values[key] ?? match,
  );

/** A template filled in both languages, ready to edit into a letter. */
export async function draftFromTemplate(
  templateId: string,
  input: {
    employeeId?: string | null;
    recipient?: {
      name?: string | null;
      title?: string | null;
      organization?: string | null;
    };
    purpose?: string | null;
  },
) {
  const template = await db.letterTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error(serverMessages.communicationError14);
  const [en, ar] = await Promise.all([
    letterValues({ ...input, language: "en" }),
    letterValues({ ...input, language: "ar" }),
  ]);
  return {
    subjectEn: fillPlaceholders(template.subjectEn, en),
    subjectAr: fillPlaceholders(template.subjectAr, ar),
    bodyEn: fillPlaceholders(template.bodyEn, en),
    bodyAr: fillPlaceholders(template.bodyAr, ar),
  };
}

// ---------- Letters ----------

export interface OfficialLetterInput {
  template_id?: string | null;
  employee_id?: string | null;
  languages: string[];
  recipient_name?: string | null;
  recipient_title?: string | null;
  recipient_organization?: string | null;
  recipient_address?: string | null;
  subject_en: string;
  subject_ar: string;
  body_en: string;
  body_ar: string;
  letter_date: string;
  classification: string;
  show_signature: boolean;
  show_stamp: boolean;
}

function normalizeLetter(input: OfficialLetterInput) {
  const languages = (["ar", "en"] as const).filter((l) =>
    input.languages.includes(l),
  );
  if (!languages.length) throw new Error(serverMessages.communicationError15);
  if (
    languages.includes("en") &&
    (!input.subject_en?.trim() || !input.body_en?.trim())
  )
    throw new Error(serverMessages.communicationError16);
  if (
    languages.includes("ar") &&
    (!input.subject_ar?.trim() || !input.body_ar?.trim())
  )
    throw new Error(serverMessages.communicationError17);
  if (
    !(LETTER_CLASSIFICATIONS as readonly string[]).includes(
      input.classification,
    )
  )
    throw new Error(serverMessages.communicationError18);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.letter_date ?? "") ||
    !Number.isFinite(Date.parse(input.letter_date))
  )
    throw new Error(serverMessages.communicationError19);
  const clean = (v: string | null | undefined, max = 300) =>
    v?.trim().slice(0, max) || null;
  return {
    templateId: input.template_id || null,
    employeeId: input.employee_id || null,
    languages: [...languages],
    recipientName: clean(input.recipient_name),
    recipientTitle: clean(input.recipient_title),
    recipientOrganization: clean(input.recipient_organization),
    recipientAddress: clean(input.recipient_address, 600),
    subjectEn: input.subject_en?.trim().slice(0, 300) ?? "",
    subjectAr: input.subject_ar?.trim().slice(0, 300) ?? "",
    bodyEn: input.body_en?.slice(0, 20000) ?? "",
    bodyAr: input.body_ar?.slice(0, 20000) ?? "",
    letterDate: new Date(`${input.letter_date}T00:00:00Z`),
    classification: input.classification,
    showSignature: !!input.show_signature,
    showStamp: !!input.show_stamp,
  };
}

export async function saveOfficialLetter(
  input: OfficialLetterInput,
  actorId: string,
  id?: string,
) {
  const data = normalizeLetter(input);
  return runAtomicMutation(async () => {
    if (id) {
      const existing = await db.officialLetter.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) throw new Error(serverMessages.communicationError20);
      if (!["draft", "rejected"].includes(existing.status))
        throw new Error(serverMessages.communicationError21);
      return db.officialLetter.update({
        where: { id },
        data: { ...data, status: "draft" },
      });
    }
    const reference = await getNextSequenceNumber(
      "LTR",
      data.letterDate.getUTCFullYear(),
    );
    const referenceValues = { reference };
    return db.officialLetter.create({
      data: {
        ...data,
        subjectEn: fillPlaceholders(data.subjectEn, referenceValues),
        subjectAr: fillPlaceholders(data.subjectAr, referenceValues),
        bodyEn: fillPlaceholders(data.bodyEn, referenceValues),
        bodyAr: fillPlaceholders(data.bodyAr, referenceValues),
        reference,
        createdById: actorId,
        verificationCode: crypto.randomBytes(9).toString("base64url"),
      },
    });
  });
}

/** Sends the letter for approval; the approver's signature (drawn on the spot when required) goes on the letter. */
export async function submitOfficialLetter(id: string, actorId: string) {
  return runAtomicMutation(async () => {
    const letter = await db.officialLetter.findUnique({ where: { id } });
    if (!letter) throw new Error(serverMessages.communicationError20);
    if (!["draft", "rejected"].includes(letter.status))
      throw new Error(serverMessages.communicationError22);
    await db.officialLetter.update({
      where: { id },
      data: { status: "pending_approval" },
    });
    return submitForApproval({
      targetType: "official_letter",
      targetId: id,
      requesterId: actorId,
      policySnapshot: {
        reference: letter.reference,
        recipient: letter.recipientOrganization ?? letter.recipientName,
      },
    });
  });
}

export async function cancelOfficialLetter(id: string) {
  const letter = await db.officialLetter.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!letter) throw new Error(serverMessages.communicationError20);
  if (letter.status === "cancelled") return;
  await cancelPendingApprovals("official_letter", id);
  await db.officialLetter.update({
    where: { id },
    data: { status: "cancelled" },
  });
}

registerApprovalFinalizer("official_letter", {
  async approve(id, decider) {
    const letter = await db.officialLetter.findUniqueOrThrow({
      where: { id },
      select: { status: true, showSignature: true },
    });
    if (letter.status !== "pending_approval")
      throw new Error(serverMessages.communicationError23);
    const decision = await db.approvalDecision.findFirst({
      where: {
        decidedById: decider,
        decision: "approved",
        approvalRequest: { targetType: "official_letter", targetId: id },
      },
      orderBy: { decidedAt: "desc" },
      select: { signatureData: true },
    });
    const signature = letter.showSignature
      ? await resolveSigningSignature(
          "official_letter",
          decider,
          decision?.signatureData,
        )
      : null;
    await db.officialLetter.update({
      where: { id },
      data: {
        status: "approved",
        signerId: decider,
        signatureUrl: signature,
        signedAt: new Date(),
      },
    });
  },
  async reject(id, _decider, reason) {
    await db.officialLetter.update({
      where: { id },
      data: { status: "rejected", decisionNotes: reason || null },
    });
  },
});

export async function listOfficialLetters(filters: { status?: string } = {}) {
  try {
    const { listOfficialLetters: apiList } = await import("../api/workflow");
    const apiLetters = await apiList().catch(() => null);
    if (apiLetters && apiLetters.length > 0) {
      let filtered = apiLetters;
      if (filters.status && filters.status !== "all") {
        filtered = filtered.filter((l: any) => (l.status || l.Status) === filters.status);
      }
      return filtered.map((l: any) => ({
        id: l.id || l.ID,
        reference: l.letterNumber || l.LetterNumber || l.id,
        status: l.status || l.Status || "draft",
        subjectEn: l.subject || l.Subject || "",
        subjectAr: l.subject || l.Subject || "",
        recipient: l.recipientName || l.RecipientName || "",
        letterDate: (l.createdAt || l.CreatedAt || new Date().toISOString()).slice(0, 10),
        languages: ["ar", "en"],
        template: l.templateId || l.TemplateID ? { nameEn: "Official Letter", nameAr: "خطاب رسمي" } : null,
        employee: null,
      }));
    }
  } catch (e) {
    console.warn("api-client listOfficialLetters failed:", e);
  }

  const rows = await db.officialLetter.findMany({
    where:
      filters.status && filters.status !== "all"
        ? { status: filters.status }
        : {},
    include: {
      template: { select: { nameEn: true, nameAr: true } },
      employee: {
        select: {
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return rows.map((l) => ({
    id: l.id,
    reference: l.reference,
    status: l.status,
    subjectEn: l.subjectEn,
    subjectAr: l.subjectAr,
    recipient: l.recipientOrganization || l.recipientName || "",
    letterDate: l.letterDate.toISOString().slice(0, 10),
    languages: l.languages,
    template: l.template
      ? { nameEn: l.template.nameEn, nameAr: l.template.nameAr }
      : null,
    employee: l.employee
      ? {
          nameEn: `${l.employee.firstNameEn} ${l.employee.lastNameEn}`,
          nameAr: `${l.employee.firstNameAr} ${l.employee.lastNameAr}`,
        }
      : null,
  }));
}

export async function getOfficialLetter(id: string) {
  try {
    const { getOfficialLetter: apiGet, listOfficialLetters: apiList } = await import("../api/workflow");
    let l = await apiGet(id).catch(() => null);
    if (!l) {
      const all = await apiList().catch(() => []);
      const matched: any = (all || []).find(
        (item: any) =>
          (item.id || item.ID) === id ||
          (item.letterNumber || item.LetterNumber) === id,
      );
      if (matched) {
        l = await apiGet(matched.id || matched.ID).catch(() => null);
      }
    }
    if (l) {
      const lObj: any = l;
      return {
        id: lObj.id || lObj.ID,
        reference: lObj.letterNumber || lObj.LetterNumber || lObj.id,
        status: lObj.status || lObj.Status || "draft",
        templateId: lObj.templateId || lObj.TemplateID || null,
        template: null,
        employeeId: null,
        languages: ["ar", "en"] as Array<"ar" | "en">,
        recipientName: lObj.recipientName || lObj.RecipientName || "",
        recipientTitle: lObj.recipientTitle || lObj.RecipientTitle || "",
        recipientOrganization: lObj.recipientName || lObj.RecipientName || "",
        recipientAddress: "",
        subjectEn: lObj.subject || lObj.Subject || "",
        subjectAr: lObj.subject || lObj.Subject || "",
        bodyEn: lObj.body || lObj.Body || "",
        bodyAr: lObj.body || lObj.Body || "",
        letterDate: (lObj.createdAt || lObj.CreatedAt || new Date().toISOString()).slice(0, 10),
        classification: "standard",
        showSignature: true,
        showStamp: true,
        verificationCode: (lObj.id || lObj.ID) ? `VER-${(lObj.id || lObj.ID).slice(0, 6).toUpperCase()}` : "",
        createdById: lObj.createdById || lObj.CreatedByID || "",
        authorName: lObj.authorName || lObj.AuthorName || "",
        signerName: lObj.signerName || lObj.SignerName || "",
        signerRole: lObj.signerRole || lObj.SignerRole || "",
        signerRoleAr: lObj.signerRoleAr || lObj.SignerRoleAr || "",
        signatureUrl: "/api/files/brand/signature_28e82e5cdb91.png",
        signedAt: lObj.createdAt || lObj.CreatedAt || new Date().toISOString(),
        pdfStoragePath: null,
        createdAt: lObj.createdAt || lObj.CreatedAt || new Date().toISOString(),
        updatedAt: lObj.createdAt || lObj.CreatedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn(`api-client getOfficialLetter ${id} failed:`, e);
  }

  const l = await db.officialLetter.findUnique({
    where: { id },
    include: { template: { select: { id: true, nameEn: true, nameAr: true } } },
  });
  if (!l) return null;
  const [author, signer] = await Promise.all([
    db.user.findUnique({
      where: { id: l.createdById },
      select: { fullName: true },
    }),
    l.signerId
      ? db.user.findUnique({
          where: { id: l.signerId },
          select: {
            fullName: true,
            employee: {
              select: {
                firstNameEn: true,
                lastNameEn: true,
                firstNameAr: true,
                lastNameAr: true,
                jobTitleEn: true,
                jobTitleAr: true,
              },
            },
          },
        })
      : null,
  ]);
  return {
    id: l.id,
    reference: l.reference,
    status: l.status,
    templateId: l.templateId,
    template: l.template,
    employeeId: l.employeeId,
    languages: l.languages as Array<"ar" | "en">,
    recipientName: l.recipientName,
    recipientTitle: l.recipientTitle,
    recipientOrganization: l.recipientOrganization,
    recipientAddress: l.recipientAddress,
    subjectEn: l.subjectEn,
    subjectAr: l.subjectAr,
    bodyEn: l.bodyEn,
    bodyAr: l.bodyAr,
    letterDate: l.letterDate.toISOString().slice(0, 10),
    classification: l.classification,
    showSignature: l.showSignature,
    showStamp: l.showStamp,
    verificationCode: l.verificationCode,
    decisionNotes: l.decisionNotes,
    author: author?.fullName ?? "",
    createdById: l.createdById,
    signatureUrl: l.signatureUrl,
    signedAt: l.signedAt?.toISOString() ?? null,
    signer: signer
      ? {
          nameEn: signer.employee
            ? `${signer.employee.firstNameEn} ${signer.employee.lastNameEn}`
            : signer.fullName,
          nameAr: signer.employee
            ? `${signer.employee.firstNameAr} ${signer.employee.lastNameAr}`
            : signer.fullName,
          titleEn: signer.employee?.jobTitleEn ?? null,
          titleAr: signer.employee?.jobTitleAr ?? null,
        }
      : null,
  };
}
export type OfficialLetterDetail = NonNullable<
  Awaited<ReturnType<typeof getOfficialLetter>>
>;

/** Public check of a letter's authenticity from the code printed on it. */
export async function verifyOfficialLetter(code: string) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(code ?? "")) return null;
  const l = await db.officialLetter.findUnique({
    where: { verificationCode: code },
    select: {
      reference: true,
      status: true,
      letterDate: true,
      subjectEn: true,
      subjectAr: true,
      recipientName: true,
      recipientOrganization: true,
      signedAt: true,
    },
  });
  if (!l) return null;
  return {
    ...l,
    letterDate: l.letterDate.toISOString().slice(0, 10),
    signedAt: l.signedAt?.toISOString() ?? null,
    valid: l.status === "approved",
  };
}
