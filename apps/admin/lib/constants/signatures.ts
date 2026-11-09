
export const SIGNATURE_DOCUMENTS = [
  "quotation",
  "invoice",
  "receipt",
  "salary_document",
  "mom",
  "asset_handover",
  "employee_handover",
  "final_settlement",
  "official_letter",
  "announcement",
] as const;
export type SignatureDocument = (typeof SIGNATURE_DOCUMENTS)[number];

export const SIGNATURE_MODES = ["stored", "live"] as const;
export type SignatureMode = (typeof SIGNATURE_MODES)[number];

export const DEFAULT_SIGNATURE_MODES: Record<SignatureDocument, SignatureMode> =
  {
    quotation: "stored",
    invoice: "stored",
    receipt: "stored",
    salary_document: "stored",
    mom: "stored",
    asset_handover: "live",
    employee_handover: "live",
    final_settlement: "live",
    official_letter: "live",
    announcement: "stored",
  };

export const SIGNING_REQUEST_DAYS = { min: 1, max: 30, default: 7 } as const;
