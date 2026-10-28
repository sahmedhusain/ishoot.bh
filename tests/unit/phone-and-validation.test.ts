import { describe, it, expect } from "vitest";
import {
  splitPhoneNumber,
  formatPhoneE164,
  formatDocumentPhone,
  phoneSearchVariants,
  isValidPhone,
  COUNTRY_DIAL_CODES,
} from "../../packages/database/src/constants/phone";
import {
  isValidEmail,
  normalizeEmail,
} from "../../packages/database/src/constants/validation";

describe("Phone number parsing, formatting and search", () => {
  it("splits phone numbers correctly with dial code and national digits", () => {
    // Standard format with +
    const res1 = splitPhoneNumber("+97333115351");
    expect(res1.countryCode).toBe("+973");
    expect(res1.nationalNumber).toBe("33115351");

    // Number with spaces, dashes, parentheses
    const res2 = splitPhoneNumber("+973 33-11 (5351)");
    expect(res2.countryCode).toBe("+973");
    expect(res2.nationalNumber).toBe("33115351");

    // Saudi number
    const res3 = splitPhoneNumber("+966501234567");
    expect(res3.countryCode).toBe("+966");
    expect(res3.nationalNumber).toBe("501234567");

    // Local number without country code
    const res4 = splitPhoneNumber("33115351", "+973");
    expect(res4.countryCode).toBe("+973");
    expect(res4.nationalNumber).toBe("33115351");

    // Leading 00 prefix
    const res5 = splitPhoneNumber("0097333115351");
    expect(res5.countryCode).toBe("+973");
    expect(res5.nationalNumber).toBe("33115351");
  });

  it("formats to E.164 without spaces", () => {
    expect(formatPhoneE164("+973", "33115351")).toBe("+97333115351");
    expect(formatPhoneE164("973", " 33 11 53 51 ")).toBe("+97333115351");
    expect(formatPhoneE164("+973", "")).toBe("");
  });

  it("formats document phone numbers strictly with + and no spaces", () => {
    expect(formatDocumentPhone("+97333115351")).toBe("+97333115351");
    expect(formatDocumentPhone("33115351", "+973")).toBe("+97333115351");
    expect(formatDocumentPhone("+973 3311 5351")).toBe("+97333115351");
    expect(formatDocumentPhone("+966 50 123 4567")).toBe("+966501234567");
  });

  it("generates search variants matching queries with or without +", () => {
    const variants = phoneSearchVariants("97333115351");
    expect(variants).toContain("+97333115351");
    expect(variants).toContain("97333115351");
    expect(variants).toContain("33115351");

    const variantsLocal = phoneSearchVariants("33115351");
    expect(variantsLocal).not.toContain("+97333115351");
    expect(variantsLocal).toContain("33115351");

    const variantsPlus = phoneSearchVariants("+97333115351");
    expect(variantsPlus).toContain("+97333115351");
    expect(variantsPlus).toContain("97333115351");
    expect(variantsPlus).toContain("33115351");
  });

  it("validates phone number digits accurately", () => {
    expect(isValidPhone("+973", "33115351")).toBe(true);
    expect(isValidPhone("+966", "501234567")).toBe(true);
    expect(isValidPhone("+973", "123")).toBe(false); // too short
    expect(isValidPhone("+973", "12345678901234567")).toBe(false); // too long
    expect(isValidPhone("+973", "")).toBe(false);
  });
});

describe("Country-aware validation", () => {
  it("covers the international country metadata and never guesses a default country", () => {
    expect(COUNTRY_DIAL_CODES.length).toBeGreaterThan(240);
    expect(COUNTRY_DIAL_CODES.some((country) => country.iso === "NZ" && country.dialCode === "+64")).toBe(true);
    expect(isValidPhone("33115351")).toBe(false);
    expect(formatPhoneE164("33115351", undefined, "BH")).toBe("+97333115351");
    expect(formatPhoneE164("+12025550123")).toBe("+12025550123");
    expect(phoneSearchVariants("12025550123")).toContain("2025550123");
    expect(isValidPhone("+973", "99999999")).toBe(false);
  });
});

describe("Strict email validation", () => {
  it("validates legitimate email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("first.last@company.bh")).toBe(true);
    expect(isValidEmail("support+ticket@domain.co.uk")).toBe(true);
  });

  it("rejects invalid email formats", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@domain")).toBe(false); // missing TLD dot
    expect(isValidEmail("user@domain.c")).toBe(false); // TLD too short
    expect(isValidEmail(".user@domain.com")).toBe(false);
    expect(isValidEmail("user.@domain.com")).toBe(false);
    expect(isValidEmail("user@%65xample.com")).toBe(false);
    expect(isValidEmail("user..name@domain.com")).toBe(false); // double dot
    expect(isValidEmail("user@domain..com")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false); // spaces
  });

  it("normalizes email addresses", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});
