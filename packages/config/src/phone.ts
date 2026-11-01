import metadata from "libphonenumber-js/metadata.max.json";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, parseDigits, type CountryCode } from "libphonenumber-js/max";

const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
const arabicNames = new Intl.DisplayNames(["ar"], { type: "region" });
const geographicCountries = getCountries();

export function countryFlag(iso?: string | null): string {
  if (!iso || iso.startsWith("001")) return "🌐";
  const clean = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return "🌐";
  return String.fromCodePoint(
    clean.charCodeAt(0) - 65 + 0x1f1e6,
    clean.charCodeAt(1) - 65 + 0x1f1e6,
  );
}

export interface CountryDialCode { iso: string; dialCode: string; nameEn: string; nameAr: string; flag: string }
export const COUNTRY_DIAL_CODES: readonly CountryDialCode[] = [...geographicCountries.map((iso) => ({
  iso,
  dialCode: `+${getCountryCallingCode(iso)}`,
  nameEn: englishNames.of(iso) ?? iso,
  nameAr: arabicNames.of(iso) ?? iso,
  flag: countryFlag(iso),
})), ...Object.keys(metadata.nonGeographic).map((code) => ({ iso: `001-${code}`, dialCode: `+${code}`, nameEn: englishNames.of("001") ?? "001", nameAr: arabicNames.of("001") ?? "001", flag: "🌐" }))];

const countryLookup = new Map<string, CountryCode>();
for (const country of COUNTRY_DIAL_CODES) {
  const iso = geographicCountries.find((code) => code === country.iso);
  if (iso) for (const name of [country.iso, country.nameEn, country.nameAr]) countryLookup.set(name.toLocaleLowerCase(), iso);
}

/** Accepts stored country names as well as ISO codes without assigning a country to an unknown number. */
export function countryIso(value?: string | null): CountryCode | undefined {
  return value ? countryLookup.get(value.trim().toLocaleLowerCase()) : undefined;
}

export function countryDialCode(value?: string | null): string {
  const iso = countryIso(value);
  return iso ? `+${getCountryCallingCode(iso)}` : "";
}

function parse(phone: string, fallback?: string) {
  const clean = phone.trim().replace(/^00/, "+");
  const iso = countryIso(fallback);
  const international = parsePhoneNumberFromString(clean.startsWith("+") ? clean : `+${clean}`, { extract: false });
  if (international?.isValid()) return international;
  return parsePhoneNumberFromString(clean, { defaultCountry: iso, defaultCallingCode: fallback?.startsWith("+") ? fallback.slice(1) : undefined, extract: false });
}

export function splitPhoneNumber(phone?: string | null, fallback = "") {
  const parsed = phone ? parse(phone, fallback) : undefined;
  if (parsed) return { countryCode: `+${parsed.countryCallingCode}`, nationalNumber: String(parsed.nationalNumber), country: parsed.country };
  return { countryCode: countryDialCode(fallback) || fallback, nationalNumber: parseDigits(phone ?? ""), country: countryIso(fallback) };
}

export function formatPhoneE164(phone: string, nationalNumber?: string, fallback = ""): string {
  const value = nationalNumber === undefined ? phone : `${phone.startsWith("+") ? phone : `+${phone}`}${nationalNumber}`;
  if (!value.trim() || nationalNumber === "") return "";
  const parsed = parse(value, fallback);
  return parsed?.isValid() && !parsed.ext ? parsed.number : "";
}

export function isValidPhone(phone: string, nationalNumber?: string, fallback = ""): boolean {
  return !!formatPhoneE164(phone, nationalNumber, fallback);
}

/** Historical local numbers remain visible when their country is unknown. New writes require E.164. */
export function formatDocumentPhone(phone?: string | null, country = ""): string {
  return phone ? formatPhoneE164(phone, undefined, country) || phone.trim().replace(/\s/g, "") : "";
}

export function phoneSearchVariants(query: string): string[] {
  const raw = query.trim();
  if (!raw) return [];
  const digits = parseDigits(raw.replace(/^00/, "+"));
  if (!digits || !/^[+\d\s().\-٠-٩۰-۹]+$/.test(raw)) return [raw];
  const parsed = parse(`+${digits}`);
  return Array.from(new Set([raw, digits, `+${digits}`, ...(parsed?.isValid() ? [String(parsed.nationalNumber), parsed.number] : [])]));
}

export function countryDisplayName(value?: string | null, locale = "en"): string {
  if (!value) return "";
  const code = value.startsWith("001-") ? "001" : (/^[a-z]{2}$/i.test(value) ? value.toUpperCase() : countryIso(value));
  try { return code ? new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? value : value; } catch { return value; }
}
