// Render both language variants using fictional letter content. Reads only local brand configuration.
require("dotenv").config({ quiet: true });
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    jsx: "react-jsx",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});
const path = require("node:path");
const assert = require("node:assert/strict");
const fs = require("node:fs");
process.chdir(path.resolve(__dirname, "../apps/admin"));
const { generateLetterheadPdf, generateCommunicationPdf } = require(
  path.resolve("lib/pdf/communications-pdf.tsx"),
);
const { db } = require(path.resolve("../apps/admin/lib/database/db.ts"));
const { DEFAULT_THEME } = require(path.resolve("../apps/admin/lib/database/constants/theme.ts"));
const company = {
  // System font: no network or uploaded font needed; colours still come from the theme.
  theme: { ...DEFAULT_THEME, fonts: { body: { kind: "system" }, heading: { kind: "system" } } },
  company_name_en: "Test Company",
  company_name_ar: "شركة اختبار",
  logo_url: null,
  signature_url: null,
  stamp_url: null,
};
const letter = {
  reference: "LTR-TEST",
  status: "draft",
  subjectEn: "Official test letter",
  subjectAr: "خطاب اختبار رسمي",
  bodyEn: "This letter is a rendering test.\nThank you.",
  bodyAr: "هذا الخطاب لاختبار إنشاء المستند.\nمع الشكر والتقدير.",
  letterDate: "2026-10-08",
  recipientName: "Test recipient",
  recipientOrganization: "Test organization",
  showSignature: true,
  showStamp: true,
};
(async () => {
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(
      new URL(process.env.DATABASE_URL).hostname,
    ),
  );
  for (const locale of ["en", "ar"]) {
    for (const [kind, buffer] of [
      ["letterhead", await generateLetterheadPdf(company, locale)],
      ["letter", await generateCommunicationPdf(letter, company, locale)],
      [
        "announcement",
        await generateCommunicationPdf(
          {
            reference: "ANN-TEST",
            bodyEn: letter.bodyEn,
            bodyAr: letter.bodyAr,
            titleEn: "Official announcement",
            titleAr: "إعلان رسمي",
            publishedAt: "2026-10-08",
            status: "published",
            official: true,
          },
          company,
          locale,
        ),
      ],
    ]) {
      assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
      assert.ok(buffer.length > 1000);
      fs.writeFileSync("/tmp/admin-" + kind + "-" + locale + ".pdf", buffer);
      console.log(
        locale + " " + kind + " PDF generated (" + buffer.length + " bytes)",
      );
    }
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
