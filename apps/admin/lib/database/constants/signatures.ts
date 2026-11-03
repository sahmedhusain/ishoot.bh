// Documents that carry a signature, and how each is signed. Runtime-free so the settings screen can import it.

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

/** "stored": the signer's approved saved signature is applied. "live": it is drawn at the moment of signing. */
export const SIGNATURE_MODES = ["stored", "live"] as const;
export type SignatureMode = (typeof SIGNATURE_MODES)[number];

/** Used when a policy row is missing: documents handed to people in person are signed on the spot. */
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

/** Days a signing link stays open. */
export const SIGNING_REQUEST_DAYS = { min: 1, max: 30, default: 7 } as const;
