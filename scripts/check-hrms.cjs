const assert = require('node:assert/strict');
const { realConstants } = require("./lib/real-constants.cjs");
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  if (mocks["@platform/locales"]) mocks["@platform/locales"] = { ...realConstants(file, "@platform/locales"), ...mocks["@platform/locales"] };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(id) { id = ((i, m) => i in m ? i : (i.startsWith('@platform/database/') && '@platform/database' in m ? '@platform/database' : i))(id, mocks); if (!(id in mocks)) { const real = realConstants(file, id); if (real) return real; throw new Error('Unmocked dependency ' + id); } return mocks[id]; }, Date, Intl, Set, Array, JSON, Number, Math, Blob, FormData, AbortSignal });
  return module.exports;
}
async function main() {
  const { parsePayrollSettings, calculateContributions } = load('../apps/admin/lib/database/payroll-calculation.ts');
  const settings = { employee: { mode: 'percentage', value: 8 }, employer: { mode: 'fixed', value: 120 }, supports: [{ provider: 'Wage support fund', mode: 'percentage', value: 50, startMonth: '2026-03', endMonth: '2026-05' }] };
  assert.equal(parsePayrollSettings(null), null);
  const result = calculateContributions(1000, settings, '2026-03');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { employee: 80, employer: 120, support: 500, net: 920, employerCost: 620 });
  assert.equal(calculateContributions(1000, settings, '2026-05').support, 500);
  assert.equal(calculateContributions(1000, settings, '2026-06').support, 0);
  assert.equal(calculateContributions(1000, settings, '2026-02').support, 0);
  assert.equal(calculateContributions(1000, { ...settings, employee: { mode: 'fixed', value: 75 } }, '2026-04').net, 925);
  assert.equal(calculateContributions(1000, { ...settings, supports: [{ ...settings.supports[0], mode: 'fixed', value: 9999 }] }, '2026-04').employerCost, 0);
  assert.throws(() => calculateContributions(1000, null, '2026-04'), /Configure/);
  assert.throws(() => parsePayrollSettings({ ...settings, employee: { mode: 'percentage', value: 101 } }), /Invalid contribution/);
  assert.throws(() => parsePayrollSettings({ ...settings, supports: [{ ...settings.supports[0], endMonth: '2026-01' }] }), /valid inclusive month/);
  assert.throws(() => calculateContributions(1000, { ...settings, employee: { mode: 'fixed', value: 1001 } }, '2026-04'), /exceed/);
  const currencies = require("../apps/admin/lib/config/constants/currency.cjs");
  assert.equal(currencies.getCurrencySymbol("OMR", false), "RO");
  assert.equal(currencies.getCurrencySymbol("MVR"), "\u20c2");
  const { formatCurrencyValue } = load('packages/ui/src/currency-display.tsx', { 'react/jsx-runtime': {}, react: {}, '@platform/config/currency': currencies });
  // Arabic screens use Arabic abbreviations instead of Latin ones; official currency signs are the same in both languages.
  assert.equal(formatCurrencyValue(12, 'BHD', false), '12.000 BHD');
  assert.equal(formatCurrencyValue(12, 'BHD', true), '12.000 د.ب');
  assert.equal(formatCurrencyValue(12, 'KWD', false), '12.000 KD');
  assert.equal(formatCurrencyValue(12, 'KWD', true), '12.000 د.ك');
  assert.equal(formatCurrencyValue(12, 'SAR', true, false), '12.00 ر.س');
  assert.equal(formatCurrencyValue(12, 'USD', true), '12.00 $');
  for (const ar of [false, true]) {
    assert.equal(formatCurrencyValue(12, 'OMR', ar), '12.000 \u20c4');
    assert.equal(formatCurrencyValue(12, 'SAR', ar), '12.00 \u20c1');
    assert.equal(formatCurrencyValue(12, 'AED', ar), '12.00 \u20c3');
    assert.equal(formatCurrencyValue(12, 'JPY', ar), '12 ¥');
    assert.equal(formatCurrencyValue(12, 'INR', ar), '12.00 ₹');
    assert.equal(formatCurrencyValue(12, 'jod', ar), ar ? '12.000 د.أ' : '12.000 JOD');
  }
  const en = require('../apps/admin/locales/en.json').admin;
  const ar = require('../apps/admin/locales/ar.json').admin;
  // Every admin string exists in both languages, at every depth.
  const paths = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => value && typeof value === 'object' ? paths(value, prefix + key + '.') : [prefix + key]);
  assert.deepEqual(paths(en).sort(), paths(ar).sort());
  assert.deepEqual(Object.keys(en.hrExtensions).sort(), Object.keys(ar.hrExtensions).sort());
  let actor = { id: 'employee-user', role: 'project_lead' }, manager = false, creates = [], audit = [], submissions = [];
  const actions = load('apps/admin/app/actions/salary-documents.ts', {
    '@platform/locales': { getTranslations: () => ({ admin: en }) },
    '@platform/database': {
      db: { employee: { findUniqueOrThrow: async () => ({ id: 'employee', userId: 'employee-user' }) }, salaryDocument: { create: async ({ data }) => { creates.push(data); return { id: 'doc-' + creates.length, ...data }; } } },
      runAtomicMutation: async fn => fn(), createActivityLog: async log => audit.push(log), measureOperation: async (_n, fn) => fn(),
      submitForApproval: async (input) => { submissions.push(input); return { approvalRequestId: 'apr', status: 'pending', finalized: false, approverIds: ['hr'] }; },
    },
    '../../lib/auth': { requireAuth: async () => actor, requirePermission: async () => actor }, '../../lib/action-input': { validateActionArguments: () => { } },
    '../../lib/salary-documents': { canManageSalaryDocuments: async () => manager, availablePayslipMonths: async () => ['2026-02', '2026-01'] },
    'next/cache': { revalidatePath: () => { } }, '../../lib/pdf/salary-document-pdf': {},
  });
  await actions.requestSalaryDocumentAction({ employeeId: 'employee', kind: 'payslip', months: ['2026-02', '2026-01', '2026-02'], languages: ['en', 'ar', 'en'] });
  assert.equal(creates[0].status, 'pending');
  assert.equal(JSON.stringify(creates[0].languages), '["ar","en"]', 'both languages, each once, in a fixed order');
  await assert.rejects(actions.requestSalaryDocumentAction({ employeeId: 'employee', kind: 'payslip', months: ['2026-01'], languages: [] }), /document language/);
  assert.equal(JSON.stringify(creates[0].months), '["2026-01","2026-02"]');
  assert.equal(creates[0].snapshot, undefined);
  assert.equal(submissions[0].targetType, 'salary_document');
  assert.equal(submissions[0].requesterId, 'employee-user', 'the employee is the requester so they cannot approve it');
  await assert.rejects(actions.requestSalaryDocumentAction({ employeeId: 'employee', kind: 'payslip', months: ['2025-12'], languages: ['ar'] }), /not approved yet/);
  actor = { id: 'other-user', role: 'project_lead' };
  await assert.rejects(actions.requestSalaryDocumentAction({ employeeId: 'employee', kind: 'salary_certificate', months: [], languages: ['ar'] }), /only request your own/);
  actor = { id: 'employee-user', role: 'project_lead' };
  await assert.rejects(actions.requestSalaryDocumentAction({ employeeId: 'employee', kind: 'payslip', months: ['2026-13'], languages: ['en'] }), /valid months/);
  // HR filing on an employee's behalf still routes the approval to someone other than that employee.
  actor = { id: 'super-user', role: 'super_admin' }; manager = true;
  await actions.requestSalaryDocumentAction({ employeeId: 'employee', kind: 'salary_certificate', months: [], languages: ['en'] });
  assert.equal(JSON.stringify(creates[1].languages), '["en"]');
  assert.equal(creates[1].status, 'pending', 'no role bypasses the salary document approval policy');
  assert.equal(submissions[1].requesterId, 'employee-user');
  const { sendWhatsAppDocument } = load('apps/admin/lib/whatsapp-document.ts');
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => calls.length === 1 ? { id: 'private-media-id' } : { messages: [{ id: 'accepted-message-id' }] } };
  };
  const sent = await sendWhatsAppDocument({ phoneId: '123', token: 'test-token', recipient: '97339000000', filename: 'Salary.pdf', pdf: Buffer.from('pdf') }, transport);
  assert.equal(sent.messageId, 'accepted-message-id');
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.endsWith('/media'));
  assert.equal(calls[0].options.body.get('type'), 'application/pdf');
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.document.id, 'private-media-id');
  assert.equal(payload.document.link, undefined, 'Do not expose private salary URLs to Meta');
  await assert.rejects(sendWhatsAppDocument({ phoneId: '123', token: 'test', recipient: 'invalid', filename: 'Salary.pdf', pdf: Buffer.from('pdf') }, transport), /Invalid/);
  console.log('HRMS checks passed: contribution arithmetic, support periods, payroll guards, Unicode currencies, localization parity, multi-month requests, ownership and policy-routed issuance.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
