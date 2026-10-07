// Employee identity and residency documents, shared by the server and the forms. Runtime-free.

export const CREDENTIAL_KINDS = ["visa", "work_permit", "residence_permit", "driving_license", "health_insurance", "medical_fitness", "professional_license", "other"] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export const VISA_TYPES = ["employment", "family", "investor", "flexi", "visit", "other"] as const;
export const COST_FREQUENCIES = ["one_time", "monthly", "yearly", "term"] as const;
export type CostFrequency = (typeof COST_FREQUENCIES)[number];

/** GCC nationals work in Bahrain without a visa or work permit. */
export const GCC_COUNTRIES = ["BH", "SA", "AE", "KW", "QA", "OM"] as const;
export const needsWorkVisa = (nationality?: string | null) => !!nationality && !(GCC_COUNTRIES as readonly string[]).includes(nationality);

/** Documents expiring within this many days are flagged and HR is notified. */
export const EXPIRY_WARNING_DAYS = 60;

export type ExpiryStatus = "expired" | "expiring" | "valid" | "none";

/** Expiry status of a date (YYYY-MM-DD or ISO) as of today in Bahrain. */
export function expiryStatus(date: string | Date | null | undefined, warningDays = EXPIRY_WARNING_DAYS): { status: ExpiryStatus; days: number | null } {
  if (!date) return { status: "none", days: null };
  const day = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return { status: days < 0 ? "expired" : days <= warningDays ? "expiring" : "valid", days };
}

/** What a recurring document costs per month (one-off costs are not recurring). */
export function monthlyCost(amount: number | null | undefined, frequency: string | null | undefined, termMonths?: number | null): number {
  if (!amount || !frequency) return 0;
  if (frequency === "monthly") return amount;
  if (frequency === "yearly") return amount / 12;
  if (frequency === "term" && termMonths) return amount / termMonths;
  return 0;
}
