import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  parseDigits,
  type CountryCode,
} from "libphonenumber-js/max";

const REGION_CANONICAL_OVERRIDES: Record<string, Record<string, string>> = {
  ar: {
    PS: "فلسطين",
    HK: "هونغ كونغ",
    MO: "مكاو",
    FK: "جزر فوكلاند - جزر مالفيناس",
  },
  en: {
    PS: "Palestine",
    HK: "Hong Kong",
    MO: "Macao",
    FK: "Falkland Islands (Islas Malvinas)",
  },
};

const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
const arabicNames = new Intl.DisplayNames(["ar"], { type: "region" });
const geographicCountries = getCountries();

export function getCanonicalRegionName(iso: string, locale: string = "en"): string {
  const lang = locale.startsWith("ar") ? "ar" : "en";
  if (REGION_CANONICAL_OVERRIDES[lang]?.[iso]) {
    return REGION_CANONICAL_OVERRIDES[lang][iso];
  }
  const displayNames = lang === "ar" ? arabicNames : englishNames;
  try {
    return displayNames.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

export function countryFlag(iso?: string | null): string {
  if (!iso) return "🌐";
  const clean = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return "🌐";
  return String.fromCodePoint(
    clean.charCodeAt(0) - 65 + 0x1f1e6,
    clean.charCodeAt(1) - 65 + 0x1f1e6,
  );
}

export interface CountryDialCode {
  iso: string;
  dialCode: string;
  nameEn: string;
  nameAr: string;
  flag: string;
}
export const COUNTRY_DIAL_CODES: readonly CountryDialCode[] =
  geographicCountries.map((iso) => ({
    iso,
    dialCode: `+${getCountryCallingCode(iso)}`,
    nameEn: getCanonicalRegionName(iso, "en"),
    nameAr: getCanonicalRegionName(iso, "ar"),
    flag: countryFlag(iso),
  }));

const countryLookup = new Map<string, CountryCode>();
for (const country of COUNTRY_DIAL_CODES) {
  const iso = geographicCountries.find((code) => code === country.iso);
  if (iso)
    for (const name of [country.iso, country.nameEn, country.nameAr])
      countryLookup.set(name.toLocaleLowerCase(), iso);
}

/** Accepts stored country names as well as ISO codes without assigning a country to an unknown number. */
export function countryIso(value?: string | null): CountryCode | undefined {
  return value
    ? countryLookup.get(value.trim().toLocaleLowerCase())
    : undefined;
}

export function countryDialCode(value?: string | null): string {
  const iso = countryIso(value);
  return iso ? `+${getCountryCallingCode(iso)}` : "";
}

function parse(phone: string, fallback?: string) {
  const clean = phone.trim().replace(/^00/, "+");
  const iso = countryIso(fallback);
  const international = parsePhoneNumberFromString(
    clean.startsWith("+") ? clean : `+${clean}`,
    { extract: false },
  );
  if (international?.isValid()) return international;
  return parsePhoneNumberFromString(clean, {
    defaultCountry: iso,
    defaultCallingCode: fallback?.startsWith("+")
      ? fallback.slice(1)
      : undefined,
    extract: false,
  });
}

export function splitPhoneNumber(phone?: string | null, fallback = "") {
  const parsed = phone ? parse(phone, fallback) : undefined;
  if (parsed)
    return {
      countryCode: `+${parsed.countryCallingCode}`,
      nationalNumber: String(parsed.nationalNumber),
      country: parsed.country,
    };
  return {
    countryCode: countryDialCode(fallback) || fallback,
    nationalNumber: parseDigits(phone ?? ""),
    country: countryIso(fallback),
  };
}

export function formatPhoneE164(
  phone: string,
  nationalNumber?: string,
  fallback = "",
): string {
  const value =
    nationalNumber === undefined
      ? phone
      : `${phone.startsWith("+") ? phone : `+${phone}`}${nationalNumber}`;
  if (!value.trim() || nationalNumber === "") return "";
  const parsed = parse(value, fallback);
  return parsed?.isValid() && !parsed.ext ? parsed.number : "";
}

export function isValidPhone(
  phone: string,
  nationalNumber?: string,
  fallback = "",
): boolean {
  return !!formatPhoneE164(phone, nationalNumber, fallback);
}

/** Historical local numbers remain visible when their country is unknown. New writes require E.164. */
export function formatDocumentPhone(
  phone?: string | null,
  country = "",
): string {
  return phone
    ? formatPhoneE164(phone, undefined, country) ||
        phone.trim().replace(/\s/g, "")
    : "";
}

export function phoneSearchVariants(query: string): string[] {
  const raw = query.trim();
  if (!raw) return [];
  const digits = parseDigits(raw.replace(/^00/, "+"));
  if (!digits || !/^[+\d\s().\-٠-٩۰-۹]+$/.test(raw)) return [raw];
  const parsed = parse(`+${digits}`);
  return Array.from(
    new Set([
      raw,
      digits,
      `+${digits}`,
      ...(parsed?.isValid()
        ? [String(parsed.nationalNumber), parsed.number]
        : []),
    ]),
  );
}

export function countryDisplayName(
  value?: string | null,
  locale = "en",
): string {
  if (!value) return "";
  const code = /^[a-z]{2}$/i.test(value)
    ? value.toUpperCase()
    : countryIso(value);
  try {
    return code
      ? (new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? value)
      : value;
  } catch {
    return value;
  }
}
