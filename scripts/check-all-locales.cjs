const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apps = ["admin", "web", "it", "store"];
const locales = ["en", "ar"];
const flat = (value, prefix = "", result = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const current = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child))
      flat(child, current, result);
    else result[current] = child;
  }
  return result;
};
const placeholders = (text) =>
  [...String(text).matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
const nonWesternDigits = /[٠-٩۰-۹०-९০-৯੦-੯]/;
const redactedAdminTemplates = new Set([
  "admin.serverErrors.templates.actionProhibited0EmployeesOnApprovedLeave",
  "admin.serverErrors.templates.assignmentConflict0",
  "admin.serverErrors.templates.invalidInputFor0",
  "admin.serverErrors.templates.invalidationHttp0",
  "admin.serverErrors.templates.noApprovalHandlerRegisteredFor0",
  "admin.serverErrors.templates.publicSiteRevalidationFailed0",
  "admin.serverErrors.templates.unknownStatisticPreset0",
]);

let failed = false;
for (const app of apps) {
  const localeDir = path.join(root, "apps", app, "locales");
  const dictionaries = Object.fromEntries(
    locales.map((locale) => [
      locale,
      JSON.parse(
        fs.readFileSync(path.join(localeDir, `${locale}.json`), "utf8"),
      ),
    ]),
  );
  const english = flat(dictionaries.en);
  const arabic = flat(dictionaries.ar);
  const missingArabic = Object.keys(english).filter((key) => !(key in arabic));
  const missingEnglish = Object.keys(arabic).filter((key) => !(key in english));

  if (missingArabic.length || missingEnglish.length) {
    console.error(
      `[${app}] Locale key mismatch: ${missingArabic.length} missing Arabic, ${missingEnglish.length} missing English`,
    );
    failed = true;
  }

  for (const [key, value] of Object.entries(english)) {
    if (!(key in arabic)) continue;
    if (app === "admin" && redactedAdminTemplates.has(key)) continue;
    if (
      JSON.stringify(placeholders(value)) !==
      JSON.stringify(placeholders(arabic[key]))
    ) {
      console.error(`[${app}] Placeholder mismatch at ${key}`);
      failed = true;
    }
  }

  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    for (const [key, value] of Object.entries(flat(dictionary))) {
      if (typeof value === "string" && nonWesternDigits.test(value)) {
        console.error(`[${app}/${locale}] Non-Western digit at ${key}`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log("Admin, Web, IT, and Store locale key and placeholder checks passed.");
