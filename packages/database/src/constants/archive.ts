import type { PermissionResource } from "./permissions";

/**
 * Every file the company keeps, wherever it was attached: uploads on clients, deals, invoices, quotations,
 * payments, expenses and claims, employee files and permits, leave evidence, company and legal documents,
 * tax certificates, and the records the system issues and has signed (salary documents, asset handovers).
 */
export const ARCHIVE_GROUPS = [
  "legal",
  "hr",
  "finance",
  "clients",
  "assets",
  "company",
] as const;
export type ArchiveGroup = (typeof ARCHIVE_GROUPS)[number];

/** Each kind of document, the group it is filed under and the permission needed to see it. */
export const ARCHIVE_KINDS = {
  company_document: { group: "legal", resource: "settings" },
  company_setting: { group: "legal", resource: "settings" },
  vat_certificate: { group: "legal", resource: "settings" },
  tax_certificate: { group: "legal", resource: "settings" },
  employee: { group: "hr", resource: "employees" },
  employee_credential: { group: "hr", resource: "employees" },
  leave_evidence: { group: "hr", resource: "employees" },
  salary_document: { group: "hr", resource: "employees" },
  user_signature: { group: "hr", resource: "users" },
  invoice: { group: "finance", resource: "invoices" },
  quotation: { group: "finance", resource: "quotations" },
  payment: { group: "finance", resource: "payments" },
  expense: { group: "finance", resource: "expenses" },
  expense_claim: { group: "finance", resource: "expenses" },
  contact: { group: "clients", resource: "contacts" },
  customer_vault: { group: "clients", resource: "contacts" },
  deal: { group: "clients", resource: "deals" },
  asset_handover: { group: "assets", resource: "assets" },
  official_letter: { group: "company", resource: "letters" },
  final_settlement: { group: "hr", resource: "payroll" },
  general: { group: "company", resource: "settings" },
  company_asset: { group: "company", resource: "settings" },
} as const satisfies Record<
  string,
  { group: ArchiveGroup; resource: PermissionResource }
>;
export type ArchiveKind = keyof typeof ARCHIVE_KINDS;
export const ARCHIVE_SORTS = [
  "newest",
  "oldest",
  "name",
  "expiry",
  "largest",
] as const;
export const ARCHIVE_EXPIRY_FILTERS = [
  "all",
  "expired",
  "expiring",
  "valid",
  "none",
] as const;
/** Documents expiring within this many days count as expiring soon. */
export const ARCHIVE_EXPIRING_DAYS = 60;
