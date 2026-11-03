require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', target: 'ES2022', moduleResolution: 'Node', jsx: 'react-jsx', esModuleInterop: true, resolveJsonModule: true } });
const path = require('node:path');
const assert = require('node:assert/strict');
process.chdir(path.resolve(__dirname, '../apps/admin'));
const { generateSalaryDocumentPdf } = require(path.resolve('lib/pdf/salary-document-pdf.tsx'));
const { db } = require(path.resolve('../apps/admin/lib/database/db.ts'));
const employee = { employeeNumber: 'EMP-TEST', firstNameEn: 'Ahmed', lastNameEn: 'Test', firstNameAr: 'أحمد', lastNameAr: 'اختبار', jobTitleEn: 'Photographer', jobTitleAr: 'مصور', hireDate: '2026-01-01' };
const compensation = { basicSalary: 500, housingAllowance: 100, transportAllowance: 50, otherAllowances: 0 };
const { DEFAULT_THEME } = require(path.resolve('../apps/admin/lib/database/constants/theme.ts'));
const company = { theme: { ...DEFAULT_THEME, fonts: { body: { kind: 'system' }, heading: { kind: 'system' } } }, company_name_en: 'Test Company', company_name_ar: 'شركة اختبار', logo_url: null, signature_url: null, stamp_url: null };
async function main() {
  for (const locale of ['en', 'ar']) {
    for (const kind of ['salary_certificate', 'payslip']) {
      const snapshot = kind === 'salary_certificate' ? { employee, compensation } : { employee, items: [1, 2].map(month => ({ ...compensation, grossSalary: 650, gosiEmployee: 52, otherDeductions: 0, netSalary: 598, payrollRun: { year: 2026, month, status: 'paid' } })) };
      const buffer = await generateSalaryDocumentPdf({ id: 'test-salary-document', kind, issuedAt: new Date(), snapshot }, company, locale);
      assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
      assert.ok(buffer.length > 1000);
      console.log(`${locale} ${kind} PDF generated (${buffer.length} bytes)`);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
