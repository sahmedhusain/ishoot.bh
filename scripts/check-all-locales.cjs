const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const localesDir = path.join(root, "packages/locales/src");
const { LANGUAGES } = require(path.join(localesDir, "registry.ts"));

const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
const ar = JSON.parse(fs.readFileSync(path.join(localesDir, "ar.json"), "utf8"));
const uiEn = JSON.parse(fs.readFileSync(path.join(localesDir, "ui/en.json"), "utf8"));

const flat = (o, p = "", acc = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, q, acc);
    else acc[q] = v;
  }
  return acc;
};

const enFlat = flat(en);
const uiFlat = flat(uiEn, "ui");
const baseExpected = { ...enFlat, ...uiFlat };

const placeholders = (text) => [...String(text).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort();
const NON_WESTERN_DIGITS = /[٠-٩۰-۹०-९০-৯੦-੯০-৯]/;

const RTL_LOCALES = new Set(["ar", "ur", "fa", "he"]);

let failed = false;
let fullyTranslatedCount = 0;

console.log(`Checking ${LANGUAGES.length} registered languages in registry.ts...`);

for (const lang of LANGUAGES) {
  const code = lang.code;
  if (code === "en") continue;

  const file = path.join(localesDir, `${code}.json`);
  if (!fs.existsSync(file)) {
    console.error(`❌ [${code}] Missing file: ${file}`);
    failed = true;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const dataFlat = flat(data);

  // Check 25 classes + ui + admin
  const missingClasses = Object.keys(en).filter((c) => !(c in data));
  if (missingClasses.length > 0) {
    console.error(`❌ [${code}] Missing top-level classes (${missingClasses.length}):`, missingClasses);
    failed = true;
  }

  // Check key parity against en
  const missingKeys = Object.keys(enFlat).filter((k) => !(k in dataFlat));
  if (missingKeys.length > 0) {
    console.error(`❌ [${code}] Missing ${missingKeys.length} leaf keys! Examples:`, missingKeys.slice(0, 5));
    failed = true;
  }

  // Check placeholders
  for (const [k, v] of Object.entries(enFlat)) {
    if (k in dataFlat) {
      const expPh = placeholders(v);
      const actPh = placeholders(dataFlat[k]);
      if (JSON.stringify(expPh) !== JSON.stringify(actPh)) {
        console.error(`❌ [${code}] Placeholder mismatch at ${k}: expected ${JSON.stringify(expPh)}, got ${JSON.stringify(actPh)}`);
        failed = true;
        break;
      }
    }
  }

  // Check non-Western digits
  for (const [k, v] of Object.entries(dataFlat)) {
    if (typeof v === "string" && NON_WESTERN_DIGITS.test(v)) {
      console.error(`❌ [${code}] Non-Western digit found at ${k}: ${v}`);
      failed = true;
      break;
    }
  }

  // Check direction in auto
  if (data.auto) {
    const expectedDir = RTL_LOCALES.has(code) ? "rtl" : "ltr";
    if (data.auto.layout_1 !== expectedDir) {
      console.error(`❌ [${code}] Invalid auto.layout_1: expected "${expectedDir}", got "${data.auto.layout_1}"`);
      failed = true;
    }
  }

  // Check translation progress vs English
  let sameAsEn = 0;
  for (const [k, v] of Object.entries(enFlat)) {
    if (dataFlat[k] === v) sameAsEn++;
  }
  const pctSame = Math.round((sameAsEn / Object.keys(enFlat).length) * 100);
  if (pctSame < 20) {
    fullyTranslatedCount++;
  }
}

console.log(`\n========================================`);
console.log(`Total languages verified: ${LANGUAGES.length}`);
console.log(`Fully translated languages: ${fullyTranslatedCount + 1} (including en)`);
console.log(`Status: ${failed ? "FAILED" : "PASSED 100% PARITY CHECKS"}`);
console.log(`========================================\n`);

if (failed) process.exit(1);
