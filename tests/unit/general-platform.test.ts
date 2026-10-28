import { leavingIndemnity, partMonthPay } from "../../packages/database/src/hr/final-settlement";
import { describe, expect, it } from "vitest";
const { CURRENCY_CODES, getCurrencyDecimals } = require("../../packages/config/src/constants/currency.cjs");
import { LANGUAGES, isLocale, isRtlLocale } from "../../packages/locales/src/registry";
import { getTranslations, getWebsiteTranslations } from "../../packages/locales/src";
import { validMoneyAmount } from "../../packages/database/src/finance/money";
import { normalizeContactWrites, type ContactModels } from "../../packages/database/src/services/contact-writes";
import { priceOrder } from "../../packages/database/src/constants/store";
import { defaultWebsiteDesign, validateWebsiteDesign } from "../../packages/database/src/constants/website-design";

describe("General company configuration", () => {
  it("covers active ISO currencies and their minor units without accepting reserved codes", () => {
    expect(CURRENCY_CODES.length).toBeGreaterThan(160);
    expect(CURRENCY_CODES).toContain("JPY");
    expect(CURRENCY_CODES).not.toContain("XXX");
    expect(CURRENCY_CODES).not.toContain("XTS");
    expect(getCurrencyDecimals("JPY")).toBe(0);
    expect(getCurrencyDecimals("USD")).toBe(2);
    expect(getCurrencyDecimals("BHD")).toBe(3);
    expect(getCurrencyDecimals("CLF")).toBe(4);
    expect(validMoneyAmount(0.0001, "BHD")).toBe(false);
    expect(validMoneyAmount(0.0001, "CLF")).toBe(true);
    expect(validMoneyAmount(1.5, "JPY")).toBe(false);
    expect(validMoneyAmount(0.1 + 0.2, "USD")).toBe(true);
  });
  it("prices an order in the configured currency's minor units", () => {
    const base = { lines: [{ quantity: 3, unitPrice: 0.1234, vatExempt: false }], vatPercentage: 0, delivery: false, deliveryFee: 0, freeDeliveryOver: null };
    expect(priceOrder({ ...base, currency: "CLF" }).total).toBe(0.3702);
    expect(priceOrder({ ...base, currency: "USD" }).total).toBe(0.37);
    expect(priceOrder({ ...base, currency: "JPY" }).total).toBe(0);
  });
  it("rounds settlement amounts in the specified currency", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    expect(partMonthPay(0.0001, from, new Date("2025-01-31T00:00:00Z"), "CLF")).toBe(0.0001);
    expect(partMonthPay(0.0001, from, new Date("2025-01-31T00:00:00Z"), "BHD")).toBe(0);
    const input = { rules: { enabled: true, appliesTo: ["primary"], wageBasis: "basic" as const, firstYears: 3, firstYearsMonths: 0.5, laterYearsMonths: 1, minServiceMonths: 0, serviceUntil: null }, category: "primary", hireDate: from, lastWorkingDay: new Date("2025-12-31T00:00:00Z"), monthlyWage: 1.2346 };
    expect(leavingIndemnity({ ...input, currency: "CLF" }).amount).toBe(0.6173);
    expect(leavingIndemnity({ ...input, currency: "JPY" }).amount).toBe(1);
  });
  it("loads additional dictionaries with English fallback and the correct direction", () => {
    expect(LANGUAGES.length).toBe(66);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("zh-tw")).toBe(true);
    expect(isLocale("bg")).toBe(true);
    expect(isLocale("sr")).toBe(true);
    expect(isLocale("kk")).toBe(true);
    expect(isLocale("../ar")).toBe(false);
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("ur")).toBe(true);
    expect(isRtlLocale("fa")).toBe(true);
    expect(isRtlLocale("he")).toBe(true);
    expect(isRtlLocale("fr")).toBe(false);
    expect(isRtlLocale("ru")).toBe(false);
    expect(isRtlLocale("zh-tw")).toBe(false);
    expect(getTranslations("fr").nav.home).toBe("Accueil");
    expect(getTranslations("fr").store.paymentMethods.online).toBe("Paiement en ligne");
    expect(getTranslations("ru").nav.home).toBe("Главная");
    expect(getTranslations("zh").store.paymentMethods.online).toBe("在线安全支付");
    expect(getTranslations("zh-tw").store.paymentMethods.online).toBe("線上安全支付");
    expect(getTranslations("bg").nav.home).toBe("Начало");
    expect((getTranslations("unknown" as any)).store.paymentMethods.online).toBe(getTranslations("en").store.paymentMethods.online);
    expect(getWebsiteTranslations("en", "other").hero.headline).not.toMatch(/cinema/i);
  });
  it("validates published motion and banner options", () => {
    expect(validateWebsiteDesign({ ...defaultWebsiteDesign(), motionScheme: "expressive", bannerIntervalSeconds: 12 }).bannerIntervalSeconds).toBe(12);
    expect(() => validateWebsiteDesign({ ...defaultWebsiteDesign(), bannerIntervalSeconds: 0 })).toThrow();
    expect(() => validateWebsiteDesign({ ...defaultWebsiteDesign(), heroOverlayOpacity: 101 })).toThrow();
  });
});

describe("Contact writes at the database boundary", () => {
  const models: ContactModels = new Map([
    ["Contact", [{ name: "email", kind: "scalar", type: "String" }, { name: "phone", kind: "scalar", type: "String" }, { name: "snapshot", kind: "scalar", type: "Json" }, { name: "people", kind: "object", type: "Person" }]],
    ["Person", [{ name: "phone", kind: "scalar", type: "String" }]],
  ]);
  it("normalizes direct and nested contact writes without rewriting snapshots", async () => {
    const data = { email: " PERSON@Example.com ", phone: "+973 3311 5351", snapshot: { phone: "historical text" }, people: { create: { phone: "+1 202 555 0123" } } };
    await normalizeContactWrites(models, "Contact", data, async () => "BH");
    expect(data.email).toBe("person@example.com");
    expect(data.phone).toBe("+97333115351");
    expect(data.people.create.phone).toBe("+12025550123");
    expect(data.snapshot.phone).toBe("historical text");
  });
  it("rejects invalid contact data in bulk writes", async () => {
    await expect(normalizeContactWrites(models, "Contact", [{ email: ".bad@example.com" }], async () => "")).rejects.toThrow();
    await expect(normalizeContactWrites(models, "Contact", { phone: { set: "+999123" } }, async () => "BH")).rejects.toThrow();
  });
});
