import { getTranslations } from "@ishoot/locales";
import type { ConsentText } from "@ishoot/database";

/** The e-signature consent in the document's language, e.g. "… accept quotation QTE-2026-000008 …". */
export const signingConsent: ConsentText = (language, number, type) => {
  const s = getTranslations(language).admin.clientSigning;
  return s.consent.replace("{number}", `${type === "quotation" ? s.quotation : s.invoice} ${number}`);
};
