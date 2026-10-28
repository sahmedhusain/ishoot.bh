process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:54322/test";
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    jsx: "react-jsx",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});
const assert = require("node:assert/strict");
const { formatMessage } = require("../packages/locales/src/format-message.ts");
assert.equal(
  formatMessage("{companyName} / {companyName}", {
    companyName: "Alpha $& {number}",
  }),
  "Alpha $& {number} / Alpha $& {number}",
);
assert.equal(
  formatMessage("{count} — {enabled} — {empty}", {
    count: 0,
    enabled: false,
    empty: null,
  }),
  "0 — false — ",
);
assert.throws(() => formatMessage("{missing}", {}), /Missing message value/);
assert.throws(
  () => formatMessage("{toString}", {}),
  /Missing message value/,
  "prototype properties are never message values",
);

const {
  generateFinancialSummaryCsv,
  generateFinancialDetailCsv,
} = require("../packages/database/src/queries/finance-reports.ts");
const report = {
  basis: "cash",
  reportingCurrency: "BHD",
  netMarginPercentage: 25,
};
for (const key of [
  "invoicedGross",
  "invoicedNet",
  "invoicedOutputVat",
  "cashGrossReceipts",
  "cashNetReceipts",
  "cashOutputVat",
  "totalExpensesGross",
  "expensesNet",
  "inputVatTotal",
  "inputVatRecoverable",
  "inputVatNonRecoverable",
  "payrollCostsTotal",
  "bankFeesTotal",
  "realizedFxGainLoss",
  "operatingProfit",
])
  report[key] = 12.345;
const detail = {
  reportingCurrency: "BHD",
  monthly: [],
  invoices: [],
  expensesByCategory: [],
  vat: { output: 0, inputRecoverable: 0, netPayable: 0 },
};
// Names from every company profile: a generated file may only carry the company it was generated for.
const profileNames = require("node:fs")
  .readdirSync(require("node:path").join(__dirname, "../company/profiles"))
  .flatMap((p) => {
    const { display = {}, company = {} } = require(`../company/profiles/${p}/company.json`);
    return [display.nameEn, display.nameAr, company.companyNameEn, company.companyNameAr].filter(Boolean);
  });
for (const [locale, companyName] of [
  ["en", "Alpha Company"],
  ["ar", "شركة بيتا"],
]) {
  const result = generateFinancialSummaryCsv(report, { locale, companyName });
  assert.ok(result.includes(companyName));
  for (const name of profileNames) assert.ok(!result.includes(name), `CSV must not carry another company's name: ${name}`);
  assert.ok(!/\{[A-Za-z0-9_]+\}/.test(result));
  const csv = generateFinancialDetailCsv(detail, true, {
    locale,
    currency: "BHD",
  });
  assert.ok(
    csv.includes(locale === "ar" ? "سجل الفواتير" : "Invoice register"),
  );
}
const injection = generateFinancialSummaryCsv(report, {
  companyName: '=HYPERLINK("https://example.com")',
});
assert.ok(
  injection.startsWith("\"'="),
  "company names in CSV cannot become spreadsheet formulas",
);
const { buildIcs } = require("../apps/admin/lib/ics.ts");
const calendar = buildIcs(
  [
    {
      id: "event",
      title: "Test",
      event_type: "event",
      start_date: "2026-10-08",
      end_date: "2026-10-08",
      all_day: true,
    },
  ],
  {
    name: "Beta calendar",
    language: "en",
    origin: "https://portal.example.com",
  },
);
assert.ok(calendar.includes("portal.example.com"));
for (const name of profileNames) assert.ok(!calendar.includes(name), `calendar must not carry another company's name: ${name}`);
console.log(
  "Message checks passed: repeated and literal values, zero/null handling, missing-value detection, localized company-neutral CSVs, CSV formula protection and calendar identity.",
);
