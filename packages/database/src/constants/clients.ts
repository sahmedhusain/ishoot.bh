// Client profile vocabulary, shared by the server and the forms. Runtime-free.

export const CLIENT_KINDS = ["individual", "company", "government"] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export const COMPANY_ORIGINS = ["local", "foreign"] as const;
export type CompanyOrigin = (typeof COMPANY_ORIGINS)[number];

/** Bahrain legal forms (MOIC), plus a branch of a foreign company. */
export const LEGAL_FORMS = ["wll", "spc", "bsc_closed", "bsc_public", "sole_proprietorship", "partnership", "foreign_branch", "other"] as const;
export type LegalForm = (typeof LEGAL_FORMS)[number];

export const GOVERNMENT_TYPES = ["ministry", "authority", "municipality", "semi_government", "royal_court", "embassy", "other"] as const;
export type GovernmentType = (typeof GOVERNMENT_TYPES)[number];

export const INDUSTRIES = [
  "government", "hospitality", "real_estate", "retail", "food_beverage", "automotive", "banking_finance", "healthcare",
  "education", "telecom", "technology", "oil_gas", "media_entertainment", "events", "fashion_beauty", "sports", "non_profit", "other",
] as const;

/** ABC ranking: clients making up the first 80% of billed revenue are A, the next 15% B, the rest C. */
export const CLIENT_TIERS = ["A", "B", "C", "none"] as const;
export type ClientTier = (typeof CLIENT_TIERS)[number];

export const CLIENT_SORTS = [
  "newest", "oldest", "name_asc", "name_desc", "rank", "revenue_desc", "revenue_asc", "outstanding_desc", "activity_desc", "activity_asc",
] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

export const CLIENT_BALANCE_FILTERS = ["outstanding", "overdue", "settled", "never_billed"] as const;
export const CLIENT_ACTIVITY_FILTERS = ["active", "dormant"] as const;
/** A client with no invoice, payment or request in this many days is dormant. */
export const CLIENT_DORMANT_DAYS = 180;

/** A Bahrain CR: registration number and branch, e.g. 142859-1. */
export const BAHRAIN_CR_PATTERN = /^\d{1,7}-\d{1,3}$/;
/** A Bahrain VAT account number has 15 digits. */
export const BAHRAIN_VAT_PATTERN = /^\d{15}$/;

/** GCC first, then every other ISO 3166-1 country. Names live in the locale files. */
export const COUNTRY_CODES = [
  "BH", "SA", "AE", "KW", "QA", "OM",
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR",
  "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY", "CZ", "DK",
  "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI", "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN",
  "GW", "GY", "HT", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR",
  "XK", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM",
  "MD", "MC", "MN", "ME", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "PK", "PW", "PS", "PA", "PG",
  "PY", "PE", "PH", "PL", "PT", "PR", "RO", "RU", "RW", "KN", "LC", "VC", "WS", "SM", "ST", "SN", "RS", "SC", "SL", "SG", "SK",
  "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR",
  "TM", "TV", "UG", "UA", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW",
] as const;
const COUNTRY_SET = new Set<string>(COUNTRY_CODES);
export const isCountryCode = (value: unknown): value is string => typeof value === "string" && COUNTRY_SET.has(value);

/**
 * Country names come from the locale files (`countries`), already sorted for each language with the GCC
 * first, so the server and the browser always render the same list.
 */
export function countryName(code: string | null | undefined, names: Record<string, string>): string {
  if (!code) return "";
  return names[code] ?? code;
}

/** Countries for a picker, in the order of the locale file. */
export function countryOptions(names: Record<string, string>): Array<{ code: string; name: string }> {
  return Object.entries(names).map(([code, name]) => ({ code, name }));
}
