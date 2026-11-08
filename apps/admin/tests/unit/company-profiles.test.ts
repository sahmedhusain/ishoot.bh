import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  normalizeTheme,
  themeWarnings,
} from "@platform/database/constants/theme";
import { detectFileType } from "../../lib/contracts/src";

const root = path.resolve(__dirname, "../../../../");
const profilesDir = path.join(root, "seeds/assets");
const profiles = fs
  .readdirSync(profilesDir)
  .filter((name) =>
    fs.existsSync(path.join(profilesDir, name, "company.json")),
  );
const SLOTS = [
  "logo",
  "darkLogo",
  "icon",
  "darkIcon",
  "fullLogo",
  "darkFullLogo",
  "header",
  "footer",
  "stamp",
  "signature",
];
const schemaFields = new Set([
  "id", "singleton", "companyNameEn", "companyNameAr", "crNumber", "vatId", "vatEnabled",
  "vatPercentage", "vatCertificateUrl", "defaultCurrency", "currencyDecimals", "addressEn",
  "addressAr", "phone", "whatsappPhone", "email", "website", "instagramUrl", "linkedinUrl",
  "youtubeUrl", "bankName", "bankIban", "bankAccountNumber", "bankSwift", "timeZone",
  "logoUrl", "darkLogoUrl", "fullLogoUrl", "darkFullLogoUrl", "iconUrl", "darkIconUrl",
  "documentHeaderUrl", "documentFooterUrl", "stampUrl", "signatureUrl", "paymentTermsDays",
  "invoicePrefix", "invoiceNextNumber", "receiptPrefix", "receiptNextNumber", "ceoNameEn",
  "ceoNameAr", "ceoTitleEn", "ceoTitleAr", "ceoQuoteEn", "ceoQuoteAr", "missionEn",
  "missionAr", "visionEn", "visionAr", "aboutTextEn", "aboutTextAr", "termsEn", "termsAr",
  "rulesEn", "rulesAr", "updatedAt", "defaultDiscountLimitPercent", "quotationsAlwaysNeedApproval",
  "theme", "setupCompletedAt", "contentLanguages", "primaryLanguage", "businessActivity",
  "taglineEn", "taglineAr", "foundedYear", "city", "country", "mapUrl"
]);

test("the neutral demo profile exists", () => {
  expect(profiles).toContain("demo");
});

describe.each(profiles)("company profile %s", (name) => {
  const dir = path.join(profilesDir, name);
  const {
    company,
    assets = {},
    display,
  } = JSON.parse(fs.readFileSync(path.join(dir, "company.json"), "utf8"));

  test("identity has both names and only real CompanySetting fields", () => {
    expect(company.companyNameEn?.trim()).toBeTruthy();
    expect(company.companyNameAr?.trim()).toBeTruthy();
    expect(display?.nameEn?.trim()).toBeTruthy();
    for (const key of Object.keys(company))
      expect(
        schemaFields.has(key),
        `unknown CompanySetting field "${key}"`,
      ).toBe(true);
    for (const key of [
      "logoUrl",
      "darkLogoUrl",
      "iconUrl",
      "darkIconUrl",
      "fullLogoUrl",
      "darkFullLogoUrl",
      "documentHeaderUrl",
      "documentFooterUrl",
      "stampUrl",
      "signatureUrl",
    ])
      expect(company[key]).toBeUndefined();
  });

  test("brand slots point at PNG, JPEG or WebP files inside assets/", () => {
    for (const [slot, file] of Object.entries<string>(assets)) {
      expect(SLOTS).toContain(slot);
      const target = path.join(dir, "assets", file);
      expect(fs.existsSync(target), `${slot}: ${file} is missing`).toBe(true);
      expect(["image/png", "image/jpeg", "image/webp"]).toContain(
        detectFileType(fs.readFileSync(target)),
      );
    }
  });

  test("logo slots hold wide wordmarks and icon slots compact marks", () => {
    // PNG width and height live in the IHDR chunk; JPEG/WebP profiles are checked by eye.
    const size = (file: string) => {
      const bytes = fs.readFileSync(path.join(dir, "assets", file));
      return detectFileType(bytes) === "image/png"
        ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
        : null;
    };
    for (const slot of ["logo", "darkLogo"]) {
      const s = assets[slot] && size(assets[slot]);
      if (s)
        expect(
          s.width / s.height,
          `${slot} should be a wide wordmark`,
        ).toBeGreaterThanOrEqual(2.5);
    }
    for (const slot of ["icon", "darkIcon"]) {
      const s = assets[slot] && size(assets[slot]);
      if (s)
        expect(
          s.width / s.height,
          `${slot} should be a compact mark`,
        ).toBeLessThanOrEqual(1.5);
    }
  });

  test("theme is valid, readable and its uploaded fonts are woff2 files in the profile", () => {
    const raw = fs.existsSync(path.join(dir, "theme.json"))
      ? JSON.parse(fs.readFileSync(path.join(dir, "theme.json"), "utf8"))
      : {};
    if (raw.primary)
      expect(normalizeTheme(raw).primary).toBe(raw.primary.toUpperCase());
    for (const font of Object.values<any>(raw.fonts ?? {})) {
      if (font.kind !== "upload") continue;
      for (const file of font.files)
        expect(
          detectFileType(fs.readFileSync(path.join(dir, "assets", file.file))),
        ).toBe("font/woff2");
    }
    if (name === "demo") expect(themeWarnings(normalizeTheme(raw))).toEqual([]);
  });
});
