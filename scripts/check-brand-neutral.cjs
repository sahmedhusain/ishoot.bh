// Run: node scripts/check-brand-neutral.cjs
// The apps and shared packages must work for any company. Everything company-specific lives in company/.
// Fails when tracked files outside company/ contain:
//   - brand files (images, fonts, documents) in an app or package
//   - a company profile's names, web/email domain, theme colours or font families
// The forbidden terms come from company/profiles/*, so adding a profile automatically protects it too.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const profilesDir = path.join(root, "company/profiles");

const SCANNED = /^(apps|packages|scripts|tests|\.github)\/|^(\.env\.example|docker-compose\.yml|README\.md|turbo\.json|package\.json)$/;
const SKIP = [/^scripts\/check-brand-neutral\.cjs$/, /\/prisma\/migrations\//, /(^|\/)pnpm-lock\.yaml$/];
const BRAND_FILE = /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|pdf|mp4|webm|ai|psd)$/i;
const ALLOWED_FILES = [/^tests\/.*\/fixtures\//];

function terms() {
  const found = new Map();
  const add = (term, why) => {
    const t = String(term ?? "").trim();
    if (t.length >= 4) found.set(t.toLowerCase(), why);
  };
  for (const name of fs.readdirSync(profilesDir)) {
    const dir = path.join(profilesDir, name);
    if (!fs.existsSync(path.join(dir, "company.json"))) continue;
    const { company = {}, display = {} } = JSON.parse(fs.readFileSync(path.join(dir, "company.json"), "utf8"));
    const why = `company profile "${name}"`;
    for (const value of [display.nameEn, display.nameAr, company.companyNameEn, company.companyNameAr]) add(value, why);
    try { add(new URL(company.website).hostname.replace(/^www\./, ""), why); } catch { }
    // Social links are matched by the account handle, not the shared host.
    for (const url of [company.instagramUrl, company.linkedinUrl, company.youtubeUrl]) {
      try { add(new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/^@/, ""), why); } catch { }
    }
    if (company.email?.includes("@")) add("@" + company.email.split("@")[1], why);
    for (const key of ["crNumber", "vatId", "bankIban", "bankAccountNumber"]) if (!/^[0A-Z-]*0{4,}[0-]*$|EXMP|^CR-0+/.test(company[key] ?? "")) add(company[key], why);
    const themeFile = path.join(dir, "theme.json");
    if (fs.existsSync(themeFile)) {
      const theme = JSON.parse(fs.readFileSync(themeFile, "utf8"));
      add(theme.primary, `${why} theme colour`);
      add(theme.accent, `${why} theme colour`);
      // A typeface the platform offers to every company (theme.ts LICENSED_FONTS) is not company identity.
      const offered = fs.readFileSync(path.join(root, "../apps/admin/lib/database/constants/theme.ts"), "utf8").split("export const LICENSED_FONTS")[1]?.split("] as const")[0] ?? "";
      for (const font of Object.values(theme.fonts ?? {})) if (font?.kind === "upload" && !offered.includes(`"${font.family}"`)) add(font.family.split(" ")[0], `${why} font`);
    }
  }
  return found;
}

const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root })
  .toString()
  .split("\0")
  .filter((f) => f && SCANNED.test(f) && !SKIP.some((re) => re.test(f)) && fs.existsSync(path.join(root, f)));

const problems = [];
for (const file of files) {
  if (BRAND_FILE.test(file) && !ALLOWED_FILES.some((re) => re.test(file))) problems.push(`${file}: brand or media file inside the code (move it to company/profiles/<name>/assets)`);
}

const forbidden = terms();
for (const file of files) {
  if (BRAND_FILE.test(file)) continue;
  const text = fs.readFileSync(path.join(root, file), "utf8").toLowerCase();
  for (const [term, why] of forbidden) {
    let index = text.indexOf(term);
    if (index === -1) continue;
    const line = text.slice(0, index).split("\n").length;
    problems.push(`${file}:${line}: "${term}" (${why})`);
  }
}

if (problems.length) {
  console.error(`Brand-neutrality check failed: ${problems.length} problem(s).\n`);
  for (const p of problems.slice(0, 200)) console.error("  " + p);
  if (problems.length > 200) console.error(`  … and ${problems.length - 200} more`);
  process.exitCode = 1;
} else {
  console.log(`Brand-neutral: ${files.length} files checked against ${forbidden.size} company terms; no brand files in apps or packages.`);
}
