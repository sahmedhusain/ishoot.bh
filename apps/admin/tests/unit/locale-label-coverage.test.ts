import { describe, expect, test } from "vitest";
import {
  ORDER_CHANNELS,
  ORDER_PAYMENT_METHODS,
  ORDER_STATUSES,
} from "@platform/database/constants/store";
import { BLOCK_TYPES } from "@platform/database/cms/blocks";
import { getAdminTranslations } from "../../locales";

describe("admin locale coverage", () => {
  test("names every website block type in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const names = getAdminTranslations(locale).cmsPages.types as Record<
        string,
        string
      >;
      for (const type of BLOCK_TYPES) expect(names[type], `${locale} ${type}`).toBeTruthy();
    }
  });

  test("names every order status, channel, and payment method in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const translations = getAdminTranslations(locale).orders;
      for (const status of ORDER_STATUSES)
        expect(translations.statuses[status], `${locale} ${status}`).toBeTruthy();
      for (const channel of ORDER_CHANNELS)
        expect(translations.channels[channel], `${locale} ${channel}`).toBeTruthy();
      for (const method of ORDER_PAYMENT_METHODS)
        expect(translations.paymentMethods[method], `${locale} ${method}`).toBeTruthy();
    }
  });
});
