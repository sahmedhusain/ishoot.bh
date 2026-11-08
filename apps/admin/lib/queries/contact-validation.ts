import { serverMessages } from "@platform/locales";
import { formatPhoneE164 } from "../constants/phone";
import { isValidEmail, normalizeEmail } from "../constants/validation";
import { getCompanyConfiguration } from "../api/company";

/** Every contact writer shares the same rules, including imports and administrative actions. */
export async function normalizeContactInput<T extends { email?: string | null; phone?: string | null }>(input: T, countryOverride?: string): Promise<T> {
  const data = { ...input };
  if (typeof data.email === "string") {
    if (data.email.trim() && !isValidEmail(data.email)) throw new Error(serverMessages.customerEmailInvalid);
    data.email = normalizeEmail(data.email);
  }
  if (typeof data.phone === "string") {
    const raw = data.phone.trim();
    let defaultCountry = countryOverride;
    if (raw && defaultCountry === undefined) {
      const company = await getCompanyConfiguration().catch(() => null);
      defaultCountry = company?.country ?? "";
    }
    const phone = raw ? formatPhoneE164(raw, undefined, defaultCountry ?? "") : "";
    if (raw && !phone) throw new Error(serverMessages.invalidPhoneNumber);
    data.phone = phone;
  }
  return data;
}
