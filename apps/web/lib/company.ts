import { getCompanySettings } from "@ishoot/database";

export async function getPublicCompanySettings() {
  const company = await getCompanySettings();
  return {
    ...company,
    bank_name: "", bank_iban: "", bank_account_number: "", bank_swift: "",
    vat_certificate_url: undefined, stamp_url: undefined, signature_url: undefined,
  };
}
