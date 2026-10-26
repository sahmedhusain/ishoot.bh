import { formatMessage, getTranslations } from "@platform/locales";

import type { ConsentText } from "@platform/database";

/** The e-signature consent in the document's language, e.g. "… accept quotation QTE-2026-000008 …". */
export const signingConsent: ConsentText = (language, number, type) => {
  const s = getTranslations(language).admin.clientSigning;
  return formatMessage(s.consent, {
    number: `${type === "quotation" ? s.quotation : s.invoice} ${number}`,
  });
};
