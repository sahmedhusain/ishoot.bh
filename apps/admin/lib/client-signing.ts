import { formatMessage, getTranslations } from "@platform/locales";

import type { ConsentText } from "@platform/database";

export const signingConsent: ConsentText = (language, number, type) => {
  const s = getTranslations(language).admin.clientSigning;
  return formatMessage(s.consent, {
    number: `${type === "quotation" ? s.quotation : s.invoice} ${number}`,
  });
};
