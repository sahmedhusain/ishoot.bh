import { Prisma } from "@prisma/client";
import { db } from "../atomic";
import { ROUTES } from "../constants/routes";
import type { PermissionResource } from "../constants/permissions";
import {
  ARCHIVE_EXPIRY_FILTERS,
  ARCHIVE_EXPIRING_DAYS,
  ARCHIVE_GROUPS,
  ARCHIVE_KINDS,
  ARCHIVE_SORTS,
  type ArchiveGroup,
  type ArchiveKind,
} from "../constants/archive";

export * from "../constants/archive";

/** The company archive: one list over every source of files (see constants/archive). */
export interface ArchiveFilters {
  q: string;
  group: string;
  kind: string;
  expiry: string;
  from: string;
  to: string;
  sort: string;
  page: number;
}

export function archiveParameters(
  input: Record<string, string | string[] | undefined>,
): ArchiveFilters {
  const pick = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string).trim() : "";
  const date = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) ? v : "";
  const group = pick("group");
  const kind = pick("kind");
  const expiry = pick("expiry");
  const sort = pick("sort");
  return {
    q: pick("q").slice(0, 120),
    group: (ARCHIVE_GROUPS as readonly string[]).includes(group)
      ? group
      : "all",
    kind: kind in ARCHIVE_KINDS ? kind : "all",
    expiry: (ARCHIVE_EXPIRY_FILTERS as readonly string[]).includes(expiry)
      ? expiry
      : "all",
    from: date(pick("from")),
    to: date(pick("to")),
    sort: (ARCHIVE_SORTS as readonly string[]).includes(sort) ? sort : "newest",
    page: Math.max(1, Math.min(10000, Number(pick("page")) || 1)),
  };
}

/** The kinds a person may see, from their permissions. */
export function archiveKindsFor(
  can: (resource: PermissionResource) => boolean,
): ArchiveKind[] {
  return (Object.keys(ARCHIVE_KINDS) as ArchiveKind[]).filter((k) =>
    can(ARCHIVE_KINDS[k].resource),
  );
}

type Row = {
  source: string;
  id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  kind: string;
  owner_id: string | null;
  owner_en: string | null;
  owner_ar: string | null;
  uploaded_by: string | null;
  created_at: Date;
  expires_on: Date | null;
};

const employeeName = Prisma.sql`concat_ws(' ', e."firstNameEn", e."lastNameEn")`;
const employeeNameAr = Prisma.sql`concat_ws(' ', e."firstNameAr", e."lastNameAr")`;

/** One row per file. Files recorded twice (an attachment and the record's own field) are listed once. */
const documents = Prisma.sql`
  SELECT 'attachment' AS source, a.id, a."fileName" AS file_name, a."fileUrl" AS file_url, a."mimeType" AS mime_type, a."fileSize" AS file_size,
    a."entityType" AS kind, a."entityId" AS owner_id,
    COALESCE(NULLIF(c."companyName", ''), NULLIF(concat_ws(' ', c."firstName", c."lastName"), ''), i."invoiceNumber", q."quotationNumber", d.title, p."receiptNumber",
      x."descriptionEn", cl."claimNumber", NULLIF(${employeeName}, ''), cd."titleEn", su."fullName") AS owner_en,
    COALESCE(NULLIF(c."companyNameAr", ''), NULLIF(c."companyName", ''), NULLIF(concat_ws(' ', c."firstName", c."lastName"), ''), i."invoiceNumber", q."quotationNumber", d.title, p."receiptNumber",
      NULLIF(x."descriptionAr", ''), x."descriptionEn", cl."claimNumber", NULLIF(${employeeNameAr}, ''), NULLIF(cd."titleAr", ''), cd."titleEn", su."fullName") AS owner_ar,
    u."fullName" AS uploaded_by, a."createdAt" AS created_at, cd."validUntil"::timestamp AS expires_on
  FROM "Attachment" a
  LEFT JOIN "User" u ON u.id = a."uploadedById"
  LEFT JOIN "CrmContact" c ON c.id = a."entityId" AND a."entityType" IN ('contact', 'customer_vault')
  LEFT JOIN "Invoice" i ON i.id = a."entityId" AND a."entityType" = 'invoice'
  LEFT JOIN "Quotation" q ON q.id = a."entityId" AND a."entityType" = 'quotation'
  LEFT JOIN "CrmDeal" d ON d.id = a."entityId" AND a."entityType" = 'deal'
  LEFT JOIN "Payment" p ON p.id = a."entityId" AND a."entityType" = 'payment'
  LEFT JOIN "Expense" x ON x.id = a."entityId" AND a."entityType" = 'expense'
  LEFT JOIN "ExpenseClaim" cl ON cl.id = a."entityId" AND a."entityType" = 'expense_claim'
  LEFT JOIN "Employee" e ON e.id = a."entityId" AND a."entityType" = 'employee'
  LEFT JOIN "CompanyDocument" cd ON cd."fileUrl" = a."fileUrl" AND a."entityType" = 'company_document'
  LEFT JOIN "User" su ON su.id = a."entityId" AND a."entityType" = 'user_signature'
  WHERE a."entityType" <> 'cms_asset'
UNION ALL
  SELECT 'company_document', cd.id, cd."titleEn", cd."fileUrl", cd."mimeType", cd."fileSize", 'company_document', cd.id,
    COALESCE(cd."documentNumber", cd."titleEn"), COALESCE(cd."documentNumber", NULLIF(cd."titleAr", ''), cd."titleEn"),
    u."fullName", cd."createdAt", cd."validUntil"::timestamp
  FROM "CompanyDocument" cd LEFT JOIN "User" u ON u.id = cd."uploadedById"
  WHERE NOT EXISTS (SELECT 1 FROM "Attachment" a WHERE a."fileUrl" = cd."fileUrl")
UNION ALL
  SELECT 'employee_credential', ec.id, concat_ws(' · ', ec.kind, ec.number), ec."fileUrl", NULL, NULL, 'employee_credential', ec."employeeId",
    ${employeeName}, ${employeeNameAr}, NULL, ec."createdAt", ec."expiryDate"
  FROM "EmployeeCredential" ec JOIN "Employee" e ON e.id = ec."employeeId"
  WHERE ec."fileUrl" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Attachment" a WHERE a."fileUrl" = ec."fileUrl")
UNION ALL
  SELECT 'leave_evidence', lr.id, lt."nameEn", lr."attachmentUrl", NULL, NULL, 'leave_evidence', lr."employeeId",
    ${employeeName}, ${employeeNameAr}, NULL, lr."createdAt", NULL
  FROM "LeaveRequest" lr JOIN "Employee" e ON e.id = lr."employeeId" JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
  WHERE lr."attachmentUrl" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Attachment" a WHERE a."fileUrl" = lr."attachmentUrl")
UNION ALL
  SELECT 'expense', x.id, x."descriptionEn", x."receiptUrl", NULL, NULL, 'expense', x.id,
    x."descriptionEn", COALESCE(NULLIF(x."descriptionAr", ''), x."descriptionEn"), NULL, x."createdAt", NULL
  FROM "Expense" x
  WHERE x."receiptUrl" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Attachment" a WHERE a."fileUrl" = x."receiptUrl")
UNION ALL
  SELECT 'expense_claim', cl.id, cl."claimNumber", cl."receiptUrl", NULL, NULL, 'expense_claim', cl.id,
    cl."claimNumber", cl."claimNumber", u."fullName", cl."createdAt", NULL
  FROM "ExpenseClaim" cl LEFT JOIN "User" u ON u.id = cl."claimantId"
  WHERE NOT EXISTS (SELECT 1 FROM "Attachment" a WHERE a."fileUrl" = cl."receiptUrl")
UNION ALL
  SELECT 'tax_certificate', t.id, t."nameEn", t."certificateUrl", NULL, NULL, 'tax_certificate', t.code,
    t."nameEn", t."nameAr", NULL, t."updatedAt", t."certificateValidUntil"
  FROM "TaxRate" t
  WHERE t."certificateUrl" IS NOT NULL
UNION ALL
  SELECT 'vat_certificate', s.id, 'VAT', s."vatCertificateUrl", NULL, NULL, 'vat_certificate', 'vat', 'VAT', 'VAT', NULL, s."updatedAt", NULL
  FROM "CompanySetting" s
  WHERE s."vatCertificateUrl" IS NOT NULL AND s."vatCertificateUrl" <> ''
UNION ALL
  SELECT 'salary_document', sd.id, sd.kind, '/api/hr/documents/' || sd.id || '/pdf', 'application/pdf', NULL, 'salary_document', sd."employeeId",
    ${employeeName}, ${employeeNameAr}, NULL, COALESCE(sd."issuedAt", sd."createdAt"), NULL
  FROM "SalaryDocument" sd JOIN "Employee" e ON e.id = sd."employeeId"
  WHERE sd.status = 'issued'
UNION ALL
  SELECT 'asset_handover', h.id, h.reference, '/api/assets/handovers/' || h.id || '/pdf', 'application/pdf', NULL, 'asset_handover', h.id,
    concat_ws(' · ', h.reference, ast.name, ${employeeName}), concat_ws(' · ', h.reference, ast.name, ${employeeNameAr}), u."fullName", COALESCE(h."decidedAt", h."createdAt"), NULL
  FROM "AssetHandover" h JOIN "Asset" ast ON ast.id = h."assetId" JOIN "Employee" e ON e.id = h."employeeId" LEFT JOIN "User" u ON u.id = h."createdById"
  WHERE h.status = 'completed'
UNION ALL
  SELECT 'official_letter', l.id, l.reference, '/api/letters/' || l.id || '/pdf', 'application/pdf', NULL, 'official_letter', l.id,
    l."subjectEn", l."subjectAr", NULL, COALESCE(l."signedAt", l."createdAt"), NULL
  FROM "OfficialLetter" l WHERE l.status = 'approved'
UNION ALL
  SELECT 'final_settlement', f.id, f.reference, '/api/hr/settlements/' || f.id || '/pdf', 'application/pdf', NULL, 'final_settlement', f.id,
    ${employeeName}, ${employeeNameAr}, NULL, COALESCE(f."approvedAt", f."createdAt"), NULL
  FROM "FinalSettlement" f JOIN "Employee" e ON e.id = f."employeeId" WHERE f.status IN ('approved', 'paid')
`;

export type ArchiveDocument = {
  id: string;
  source: string;
  kind: ArchiveKind;
  group: ArchiveGroup;
  file_name: string;
  file_url: string;
  mime_type?: string;
  file_size?: number;
  owner_en?: string;
  owner_ar?: string;
  owner_link?: string;
  uploaded_by?: string;
  created_at: string;
  expires_on?: string;
  /** Uploaded files can be removed from the archive; issued records and fields owned by a record cannot. */
  deletable: boolean;
};

function ownerLink(kind: string, ownerId: string | null): string | undefined {
  if (!ownerId || ownerId === "pending" || ownerId === "general-vault")
    return undefined;
  switch (kind) {
    case "official_letter":
      return ROUTES.letters.detail(ownerId);
    case "final_settlement":
      return ROUTES.hr.settlement(ownerId);
    case "contact":
    case "customer_vault":
      return ROUTES.crm.customer(ownerId);
    case "deal":
      return ROUTES.crm.deal(ownerId);
    case "invoice":
      return ROUTES.invoices.detail(ownerId);
    case "quotation":
      return ROUTES.quotations.detail(ownerId);
    case "payment":
      return ROUTES.payments.detail(ownerId);
    case "expense":
      return ROUTES.expenses.list();
    case "expense_claim":
      return ROUTES.claims.list({ view: "finance" });
    case "employee":
    case "employee_credential":
    case "leave_evidence":
    case "salary_document":
      return ROUTES.hr.employee(ownerId);
    case "asset_handover":
      return ROUTES.assets.handover(ownerId);
    case "company_document":
      return ROUTES.company.documents;
    case "company_setting":
    case "tax_certificate":
    case "vat_certificate":
      return ROUTES.settings.company;
    default:
      return undefined;
  }
}

function mapRow(r: Row): ArchiveDocument {
  const kind = (r.kind in ARCHIVE_KINDS ? r.kind : "general") as ArchiveKind;
  const fileUrl = r.file_url || "";
  return {
    id: `${r.source}:${r.id}`,
    source: r.source,
    kind,
    group: ARCHIVE_KINDS[kind].group,
    file_name: r.file_name || (fileUrl ? fileUrl.split("/").pop() || "" : ""),
    file_url: fileUrl,
    mime_type: r.mime_type ?? undefined,
    file_size: r.file_size ?? undefined,
    owner_en: r.owner_en ?? undefined,
    owner_ar: r.owner_ar ?? undefined,
    owner_link: ownerLink(kind, r.owner_id),
    uploaded_by: r.uploaded_by ?? undefined,
    created_at: r.created_at
      ? (typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString())
      : new Date().toISOString(),
    expires_on: (r as any).expires_on
      ? (typeof (r as any).expires_on === "string" ? (r as any).expires_on.slice(0, 10) : (r as any).expires_on.toISOString().slice(0, 10))
      : undefined,
    deletable: r.source === "attachment",
  };
}

function conditions(f: ArchiveFilters, kinds: ArchiveKind[]) {
  const pattern = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
  const groupKinds =
    f.group === "all"
      ? kinds
      : kinds.filter((k) => ARCHIVE_KINDS[k].group === f.group);
  const visible =
    f.kind === "all" ? groupKinds : groupKinds.filter((k) => k === f.kind);
  const soon = new Date(Date.now() + ARCHIVE_EXPIRING_DAYS * 86_400_000);
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Prisma.sql`
    WHERE doc.kind = ANY(${visible.length ? visible : ["__none__"]}::text[])
      AND (${f.q} = '' OR doc.file_name ILIKE ${pattern} OR doc.file_url ILIKE ${pattern} OR doc.owner_en ILIKE ${pattern} OR doc.owner_ar ILIKE ${pattern} OR doc.uploaded_by ILIKE ${pattern})
      AND (${f.from} = '' OR doc.created_at >= ${f.from || "1970-01-01"}::date)
      AND (${f.to} = '' OR doc.created_at < (${f.to || "1970-01-01"}::date + 1))
      AND (${f.expiry} = 'all'
        OR (${f.expiry} = 'expired' AND doc.expires_on < ${today})
        OR (${f.expiry} = 'expiring' AND doc.expires_on >= ${today} AND doc.expires_on <= ${soon})
        OR (${f.expiry} = 'valid' AND doc.expires_on > ${soon})
        OR (${f.expiry} = 'none' AND doc.expires_on IS NULL))`;
}

const ORDER: Record<string, Prisma.Sql> = {
  newest: Prisma.sql`doc.created_at DESC, doc.id DESC`,
  oldest: Prisma.sql`doc.created_at ASC, doc.id ASC`,
  name: Prisma.sql`lower(doc.file_name) ASC, doc.id ASC`,
  expiry: Prisma.sql`doc.expires_on ASC NULLS LAST, doc.created_at DESC, doc.id DESC`,
  largest: Prisma.sql`doc.file_size DESC NULLS LAST, doc.created_at DESC, doc.id DESC`,
};

/** A page of the archive, with counts per group and the expiry summary for what the viewer may see. */
export async function getDocumentArchivePage(
  input: Record<string, string | string[] | undefined>,
  kinds: ArchiveKind[],
  pageSize = 50,
) {
  const f = archiveParameters(input);
  const where = conditions(f, kinds);
  const [countRows, groupRows, expiryRows] = await Promise.all([
    db.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT count(*) AS count FROM (${documents}) doc ${where}`,
    ),
    db.$queryRaw<Array<{ kind: string; count: bigint }>>(
      Prisma.sql`SELECT doc.kind, count(*) AS count FROM (${documents}) doc WHERE doc.kind = ANY(${kinds.length ? kinds : ["__none__"]}::text[]) GROUP BY doc.kind`,
    ),
    db.$queryRaw<Array<{ expired: bigint; expiring: bigint }>>(Prisma.sql`
      SELECT count(*) FILTER (WHERE doc.expires_on < current_date) AS expired,
             count(*) FILTER (WHERE doc.expires_on >= current_date AND doc.expires_on <= current_date + ${ARCHIVE_EXPIRING_DAYS}::int) AS expiring
      FROM (${documents}) doc WHERE doc.kind = ANY(${kinds.length ? kinds : ["__none__"]}::text[])`),
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / pageSize)));
  const rows = await db.$queryRaw<Row[]>(
    Prisma.sql`SELECT * FROM (${documents}) doc ${where} ORDER BY ${ORDER[f.sort] ?? ORDER.newest} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
  );
  const byKind = Object.fromEntries(
    groupRows.map((r) => [r.kind, Number(r.count)]),
  );
  const byGroup = Object.fromEntries(
    ARCHIVE_GROUPS.map((g) => [g, 0]),
  ) as Record<ArchiveGroup, number>;
  for (const [kind, n] of Object.entries(byKind))
    if (kind in ARCHIVE_KINDS)
      byGroup[ARCHIVE_KINDS[kind as ArchiveKind].group] += n;
  return {
    items: rows.map(mapRow),
    total,
    page,
    pageSize,
    filters: f,
    counts: {
      byKind,
      byGroup,
      expired: Number(expiryRows[0]?.expired ?? 0),
      expiring: Number(expiryRows[0]?.expiring ?? 0),
    },
  };
}

/** Export batches in the archive's current filter and order (keyset on the row id for stable paging). */
export async function getDocumentArchiveExportBatch(
  input: Record<string, string | string[] | undefined>,
  kinds: ArchiveKind[],
  after: string,
  batchSize: number,
) {
  const f = archiveParameters(input);
  const rows = await db.$queryRaw<Row[]>(
    Prisma.sql`SELECT * FROM (${documents}) doc ${conditions(f, kinds)} AND (doc.source || ':' || doc.id) > ${after || ""} ORDER BY (doc.source || ':' || doc.id) ASC LIMIT ${Math.min(500, batchSize)}`,
  );
  return rows.map(mapRow);
}
