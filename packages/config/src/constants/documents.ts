export interface DocumentTypeConfig {
  value: string;
  translationKey: string;
}

export const COMPANY_DOCUMENT_TYPES: DocumentTypeConfig[] = [
  {
    value: "commercial_registration",
    translationKey: "documents.types.commercialRegistration",
  },
  {
    value: "tax_certificate",
    translationKey: "documents.types.taxCertificate",
  },
  {
    value: "bank_certificate",
    translationKey: "documents.types.bankCertificate",
  },
  { value: "insurance", translationKey: "documents.types.insurance" },
  {
    value: "contract_template",
    translationKey: "documents.types.contractTemplate",
  },
  { value: "other", translationKey: "documents.types.other" },
];

export interface ContractStatusConfig {
  value: "draft" | "sent" | "signed" | "active" | "expired" | "terminated";
  translationKey: string;
  colorClass: string;
}

export const CONTRACT_STATUSES: ContractStatusConfig[] = [
  {
    value: "draft",
    translationKey: "documents.contractStatuses.draft",
    colorClass: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
  {
    value: "sent",
    translationKey: "documents.contractStatuses.sent",
    colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    value: "signed",
    translationKey: "documents.contractStatuses.signed",
    colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    value: "active",
    translationKey: "documents.contractStatuses.active",
    colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    value: "expired",
    translationKey: "documents.contractStatuses.expired",
    colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    value: "terminated",
    translationKey: "documents.contractStatuses.terminated",
    colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
];
