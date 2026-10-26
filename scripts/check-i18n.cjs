// Run: node scripts/check-i18n.cjs
// Language rules for the admin app and website:
//  - English and Arabic locale files have the same keys (admin and website)
//  - Arabic text uses Western digits (0-9), never Eastern Arabic digits, in locales and in formatting
//  - interface text lives in the locale files, not inline `isAr ? "عربي" : "English"` pairs
//  - every message the server can throw has an Arabic translation (shown through errorMessage)
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true, jsx: "react-jsx" } });
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const problems = [];
const fail = (rule, detail) => problems.push(`${rule}: ${detail}`);

// ---- locale files
const flat = (o, p = "", acc = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flat(v, q, acc);
    else acc[q] = v;
  }
  return acc;
};
const EASTERN = /[٠-٩۰-۹]/;
// These existing error messages deliberately redact technical/provider details in Arabic.
const redactedTemplates = new Set([
  "actionProhibited0EmployeesOnApprovedLeave", "assignmentConflict0", "failedToGenerateDownloadUrl0",
  "failedToGenerateUploadUrl0", "invalidInputFor0", "invalidationHttp0", "noApprovalHandlerRegisteredFor0",
  "objectMetadataUnavailable0", "publicSiteRevalidationFailed0", "storageUploadFailed0", "unknownStatisticPreset0",
]);
const placeholders = (text) => [...String(text).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
for (const base of ["packages/locales/src", "packages/locales/src/admin", "packages/locales/src/ui"]) {
  const en = flat(JSON.parse(fs.readFileSync(path.join(root, base, "en.json"), "utf8")));
  const ar = flat(JSON.parse(fs.readFileSync(path.join(root, base, "ar.json"), "utf8")));
  for (const k of Object.keys(en)) if (!(k in ar)) fail("missing Arabic", `${base} ${k}`);
  for (const k of Object.keys(ar)) if (!(k in en)) fail("missing English", `${base} ${k}`);
  for (const [k, value] of Object.entries(en)) {
    const a = placeholders(value), b = placeholders(ar[k]);
    if (base.endsWith("/admin") && k.startsWith("serverErrors.templates.") && redactedTemplates.has(k.split(".").pop())) {
      if (b.some((key) => !a.includes(key))) fail("unknown redacted placeholder", `${base} ${k}`);
    } else if (JSON.stringify(a) !== JSON.stringify(b)) fail("placeholder mismatch", `${base} ${k}`);
  }
  for (const [k, v] of Object.entries(ar)) if (EASTERN.test(String(v))) fail("Eastern digits", `${base} ${k}`);
  for (const [k, v] of Object.entries(en)) if (EASTERN.test(String(v))) fail("Eastern digits", `${base} ${k}`);
  // Arabic labels must not carry English glosses such as "مسودة (Draft)".
  for (const [k, v] of Object.entries(ar))
    if (typeof v === "string" && /[؀-ۿ][^()]*\((?:[A-Z][a-z]+)(?: [A-Za-z-]+)*\)/.test(v)) fail("English gloss in Arabic", `${base} ${k}: ${v}`);
}

// ---- source files
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|^\.next/.test(e.name)) walk(f); }
    else if (/\.tsx?$/.test(e.name)) files.push(f);
  }
};
["apps/admin/components", "apps/admin/app", "apps/admin/hooks", "apps/admin/lib", "apps/web/app", "apps/web/components", "apps/web/lib", "packages/ui/src"].forEach((d) => fs.existsSync(path.join(root, d)) && walk(path.join(root, d)));
const pair = /\b(isAr|isRTL|isRtl|locale\s*===\s*["']ar["'])\s*\?\s*(["'`])[^"'`]*[\u0621-\u064A][^"'`]*\2\s*:/;
for (const f of files) {
  const rel = path.relative(root, f);
  const text = fs.readFileSync(f, "utf8");
  text.split("\n").forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/^\s*(\/\/|\*)/.test(line)) return;
    if (EASTERN.test(line)) fail("Eastern digits in code", at);
    if (/["']ar(-[A-Z]{2})?["']\s*[,)]/.test(line) && /(toLocale\w*|Intl\.\w+)\(/.test(line)) fail("Arabic formatting without -u-nu-latn", at);
    if (/["']ar-[A-Z]{2}["']/.test(line)) fail("Arabic locale tag without -u-nu-latn", at);
    if (/\.toLocale(Date|Time)?String\(\s*\)/.test(line)) fail("formatting in the browser's language", at);
  });
  // Multi-line ternaries too.
  const compact = text.replace(/\s+/g, " ");
  if (pair.test(compact)) fail("inline Arabic/English pair (use the locale files)", rel);
}

// ---- server error messages
const adminEn = JSON.parse(fs.readFileSync(path.join(root, "packages/locales/src/admin/en.json"), "utf8"));
const known = new Set(Object.values(adminEn.serverErrors.messages));
const templates = Object.values(adminEn.serverErrors.templates).map((t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{\d+\\\}/g, ".+")}$`));
const serverFiles = [];
const walkServer = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walkServer(f); else if (/\.tsx?$/.test(e.name)) serverFiles.push(f); } };
["packages/database/src", "apps/admin/app/actions", "apps/admin/lib"].forEach((d) => walkServer(path.join(root, d)));
for (const f of serverFiles) {
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(/throw new Error\(("((?:[^"\\]|\\.)+)"|'((?:[^'\\]|\\.)+)'|`([^`]+)`)\)/g)) {
    const raw = m[2] ?? m[3] ?? m[4];
    const sample = raw.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, "X");
    if (m[4] && m[4].includes("${")) {
      if (!templates.some((re) => re.test(sample)) && !/ not found$/.test(sample)) fail("untranslated server message", `${path.relative(root, f)}: ${raw}`);
    } else if (!known.has(raw.replace(/\\'/g, "'").replace(/\\"/g, '"'))) fail("untranslated server message", `${path.relative(root, f)}: ${raw}`);
  }
}

// ---- errorMessage behaviour
const { errorMessage } = require(path.join(root, "apps/admin/lib/error-text.ts"));
const { adminTranslations } = require(path.join(root, "apps/admin/lib/translations-bilingual.ts"));
const ar = adminTranslations.ar, en = adminTranslations.en;
assert.equal(errorMessage(new Error("Nothing changed"), ar, "x"), "لم يتغيّر شيء");
assert.equal(errorMessage(new Error("Nothing changed"), en, "x"), "Nothing changed");
assert.equal(errorMessage(new Error("Quotation cannot be accepted: current status is draft"), ar), "لا يمكن قبول عرض السعر: الحالة الحالية مسودة", "status words are translated too");
assert.equal(errorMessage(new Error("Some unexpected English text"), ar, "تعذّر الحفظ"), "تعذّر الحفظ", "unknown English never reaches an Arabic screen");
assert.equal(errorMessage(new Error("رسالة عربية"), ar, "x"), "رسالة عربية");
assert.equal(errorMessage("Some provider detail", en, ""), "Some provider detail");

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} language problem(s).`);
  process.exit(1);
}
console.log("Language checks passed: locale parity, Western digits, no inline Arabic/English pairs, every server message translated, errors shown in the interface language.");
