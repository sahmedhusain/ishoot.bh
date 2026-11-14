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
import { getAllAttachments } from "./attachments";
import { getCompanyDocuments } from "./company-documents";
import { listContracts } from "../api/workflow";

export * from "../constants/archive";

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

export function archiveKindsFor(
  can: (resource: PermissionResource) => boolean,
): ArchiveKind[] {
  return (Object.keys(ARCHIVE_KINDS) as ArchiveKind[]).filter((k) =>
    can(ARCHIVE_KINDS[k].resource),
  );
}

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
  deletable: boolean;
};

function ownerLink(kind: string, ownerId: string | null | undefined): string | undefined {
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

async function collectAllArchiveDocs(kinds: ArchiveKind[]): Promise<ArchiveDocument[]> {
  const allowed = new Set<string>(kinds);
  const [attachments, companyDocs, contracts] = await Promise.all([
    getAllAttachments().catch(() => []),
    getCompanyDocuments().catch(() => []),
    listContracts().catch(() => []),
  ]);

  const docs: ArchiveDocument[] = [];

  for (const att of attachments) {
    const kind = (att.entity_type in ARCHIVE_KINDS ? att.entity_type : "general") as ArchiveKind;
    if (!allowed.has(kind)) continue;
    docs.push({
      id: `attachment:${att.id}`,
      source: "attachment",
      kind,
      group: ARCHIVE_KINDS[kind].group,
      file_name: att.file_name,
      file_url: att.file_url,
      mime_type: att.mime_type,
      file_size: att.file_size,
      owner_en: att.entity_label,
      owner_ar: att.entity_label,
      owner_link: att.entity_link ?? ownerLink(kind, att.entity_id),
      uploaded_by: att.uploaded_by,
      created_at: att.created_at,
      deletable: true,
    });
  }

  if (allowed.has("company_document")) {
    for (const cd of companyDocs) {
      docs.push({
        id: `company_document:${cd.id}`,
        source: "company_document",
        kind: "company_document",
        group: ARCHIVE_KINDS.company_document.group,
        file_name: cd.title_en,
        file_url: cd.file_url,
        mime_type: cd.mime_type,
        file_size: cd.file_size,
        owner_en: cd.title_en,
        owner_ar: cd.title_ar ?? cd.title_en,
        owner_link: ROUTES.company.documents,
        uploaded_by: cd.uploaded_by_id,
        created_at: cd.created_at,
        expires_on: cd.valid_until,
        deletable: false,
      });
    }
  }

  for (const c of contracts) {
    if (!c.fileUrl || !allowed.has("general")) continue;
    docs.push({
      id: `contract:${c.id}`,
      source: "contract",
      kind: "general",
      group: ARCHIVE_KINDS.general.group,
      file_name: `${c.contractNumber} · ${c.title}`,
      file_url: c.fileUrl,
      owner_en: c.title,
      owner_ar: c.title,
      owner_link: c.dealId ? ROUTES.crm.deal(c.dealId) : c.clientId ? ROUTES.crm.customer(c.clientId) : undefined,
      created_at: c.createdAt,
      expires_on: c.endDate?.slice(0, 10),
      deletable: false,
    });
  }

  return docs;
}

function applyArchiveFilters(docs: ArchiveDocument[], f: ArchiveFilters, kinds: ArchiveKind[]): ArchiveDocument[] {
  const groupKinds = f.group === "all" ? kinds : kinds.filter((k) => ARCHIVE_KINDS[k].group === f.group);
  const visible = new Set<string>(f.kind === "all" ? groupKinds : groupKinds.filter((k) => k === f.kind));
  const q = f.q.toLowerCase();
  const todayStr = new Date().toISOString().slice(0, 10);
  const soonStr = new Date(Date.now() + ARCHIVE_EXPIRING_DAYS * 86_400_000).toISOString().slice(0, 10);

  return docs.filter((d) => {
    if (!visible.has(d.kind)) return false;
    if (q && ![d.file_name, d.file_url, d.owner_en, d.owner_ar, d.uploaded_by].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))) {
      return false;
    }
    const createdDay = d.created_at.slice(0, 10);
    if (f.from && createdDay < f.from) return false;
    if (f.to && createdDay > f.to) return false;
    if (f.expiry === "expired" && (!d.expires_on || d.expires_on >= todayStr)) return false;
    if (f.expiry === "expiring" && (!d.expires_on || d.expires_on < todayStr || d.expires_on > soonStr)) return false;
    if (f.expiry === "valid" && (!d.expires_on || d.expires_on <= soonStr)) return false;
    if (f.expiry === "none" && d.expires_on) return false;
    return true;
  });
}

export async function getDocumentArchivePage(
  input: Record<string, string | string[] | undefined>,
  kinds: ArchiveKind[],
  pageSize = 50,
) {
  const f = archiveParameters(input);
  const allDocs = await collectAllArchiveDocs(kinds);
  const todayStr = new Date().toISOString().slice(0, 10);
  const soonStr = new Date(Date.now() + ARCHIVE_EXPIRING_DAYS * 86_400_000).toISOString().slice(0, 10);

  const byKind: Record<string, number> = {};
  const byGroup = Object.fromEntries(ARCHIVE_GROUPS.map((g) => [g, 0])) as Record<ArchiveGroup, number>;
  let expired = 0;
  let expiring = 0;

  for (const d of allDocs) {
    byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
    byGroup[d.group] = (byGroup[d.group] ?? 0) + 1;
    if (d.expires_on) {
      if (d.expires_on < todayStr) expired++;
      else if (d.expires_on <= soonStr) expiring++;
    }
  }

  const filtered = applyArchiveFilters(allDocs, f, kinds);
  filtered.sort((a, b) => {
    if (f.sort === "oldest") return a.created_at.localeCompare(b.created_at);
    if (f.sort === "name") return a.file_name.toLowerCase().localeCompare(b.file_name.toLowerCase());
    if (f.sort === "expiry") return (a.expires_on ?? "9999").localeCompare(b.expires_on ?? "9999");
    if (f.sort === "largest") return (b.file_size ?? 0) - (a.file_size ?? 0);
    return b.created_at.localeCompare(a.created_at);
  });

  const total = filtered.length;
  const page = Math.min(f.page, Math.max(1, Math.ceil(total / pageSize)));
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    filters: f,
    counts: {
      byKind,
      byGroup,
      expired,
      expiring,
    },
  };
}

export async function getDocumentArchiveExportBatch(
  input: Record<string, string | string[] | undefined>,
  kinds: ArchiveKind[],
  after: string,
  batchSize: number,
) {
  const f = archiveParameters(input);
  const allDocs = await collectAllArchiveDocs(kinds);
  return applyArchiveFilters(allDocs, f, kinds)
    .filter((d) => !after || d.id > after)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, Math.min(500, batchSize));
}
