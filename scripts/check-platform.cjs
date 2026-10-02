// Run: node scripts/check-platform.cjs
// Exercise source modules with boundary mocks; no production database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => {
    if (!(id in mocks)) throw new Error(`Unmocked dependency: ${id}`);
    return mocks[id];
  }, console: { error() {}, warn() {} }, Date, Set, Buffer, process, crypto: require('node:crypto').webcrypto });
  return module.exports;
}
async function main() {
  let session = null;
  const user = { id: 'u', role: 'viewer', is_active: true };
  const auth = load('apps/admin/lib/auth.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'token' }) }) },
    'next/navigation': { redirect: () => { throw new Error('redirect'); } },
    './jwt': { verifySessionToken: async () => ({ userId: 'u' }), SESSION_COOKIE_NAME: 'cookie' },
    '@ishoot/database': { getSessionByToken: async () => session, hasPermission: async () => false },
  });
  assert.equal(await auth.getCurrentUser(), null, 'revoked JWT must fail');
  session = { user_id: 'u', user };
  assert.equal((await auth.getCurrentUser()).id, 'u');
  await assert.rejects(auth.requirePermission('invoices', 'read'), /Unauthorized/);

  let mutation = false;
  const settings = load('apps/admin/app/actions/settings.ts', {
    '@ishoot/database': { createSocialLink: () => { mutation = true; } },
    'next/cache': { revalidatePath() {} },
    '../../lib/auth': { requirePermission: async () => { throw new Error('denied'); } },
  });
  await assert.rejects(settings.createSocialLinkAction({}), /denied/);
  await assert.rejects(settings.toggleFeatureAction('crm', false), /denied/);
  assert.equal(mutation, false);

  const types = load('packages/database/src/types.ts', {});
  let deleted = false, usedTransaction = false;
  const invoice = { id: 'i', status: 'draft', currency: 'BHD', vatEnabled: true, vatPercentage: 5, vatAmount: 5, discountType: 'none', discountValue: 0, lineItems: [], payments: [] };
  const db = {
    invoice: { findUnique: async () => invoice },
    $transaction: async fn => {
      usedTransaction = true;
      try { return await fn({ $queryRaw: async () => [], invoiceLineItem: { deleteMany: async () => { deleted = true; } }, invoice: { findUnique: async () => invoice, update: async args => {
        assert.equal(args.data.vatAmount, 5, 'stored VAT rate must survive edit');
        throw new Error('simulated update failure');
      } } }); } catch (e) { deleted = false; throw e; }
    },
  };
  const invoices = load('packages/database/src/queries/invoices.ts', { '../db': { db }, '../initial-company-config.json': { company: {} }, '../types': types });
  assert.equal(await invoices.updateInvoice('i', { line_items: [{ quantity: 1, unit_price: 100, description_en: 'Shoot' }] }), null);
  assert.equal(usedTransaction, true);
  assert.equal(deleted, false, 'rollback must preserve items');

  let current = { id: 'i', status: 'void', currency: 'USD', totalAmount: 100, payments: [] };
  const payments = load('packages/database/src/queries/payments.ts', {
    '../db': { db: { $transaction: async fn => fn({ $queryRaw: async () => [], invoice: { findUnique: async () => current } }) } },
    '../types': types, '../initial-company-config.json': { company: {} },
  });
  await assert.rejects(payments.createPayment({ invoice_id: 'i', amount: -1 }), /positive/);
  await assert.rejects(payments.createPayment({ invoice_id: 'i', amount: 1 }), /not payable/);
  current.status = 'sent';
  await assert.rejects(payments.createPayment({ invoice_id: 'i', amount: 1, currency: 'BHD' }), /currency/);
  await assert.rejects(payments.createPayment({ invoice_id: 'i', amount: 101 }), /balance/);

  let dealCount = 0, conversion = null, locked = false;
  const inquiry = { id: 'q', customerId: 'c', mergeFlag: false, name: 'Client', email: 'c@example.com', budgetRange: '5,000 - 10,000', message: 'Shoot' };
  const tx = {
    $queryRaw: async () => { locked = true; },
    inquiry: { findUnique: async () => inquiry, update: async () => {} },
    crmContact: { findUnique: async () => ({ id: 'c' }) },
    crmDeal: { create: async args => { assert.equal(args.data.dealValue, 5000); dealCount++; return { id: 'd' }; } },
    activityLog: { findFirst: async () => conversion, create: async args => { conversion = args.data; } },
  };
  const crm = load('apps/admin/app/actions/crm.ts', {
    '@ishoot/database': { db: { $transaction: async fn => fn(tx) } },
    'next/cache': { revalidatePath() {} },
    '../../lib/auth': { requirePermission: async () => user },
  });
  assert.equal((await crm.convertInquiryToClientAction('q')).dealId, 'd');
  assert.equal((await crm.convertInquiryToClientAction('q')).dealId, 'd');
  assert.equal(dealCount, 1);
  assert.equal(locked, true);
  inquiry.mergeFlag = true;
  await assert.rejects(crm.convertInquiryToClientAction('q'), /conflict/);
  const response = { json: (body, options) => ({ body, status: options?.status || 200 }) };
  const upload = load('apps/admin/app/api/upload/route.ts', {
    'next/server': { NextResponse: response }, 'fs/promises': {}, path: require('node:path'), crypto: require('node:crypto'),
    '../../../lib/auth': { getCurrentUser: async () => null }, '../../../lib/attachment-access': {},
    '@ishoot/database': {}, '@ishoot/locales': { getTranslations: () => ({ api: { upload: {} } }) }, 'next/cache': {},
  });
  assert.equal((await upload.POST({ formData: () => { throw new Error('must reject before parsing'); } })).status, 401);
  const inquiryRoute = load('apps/web/app/api/inquiry/route.ts', {
    'next/server': { NextResponse: response }, '@ishoot/database': {}, '@ishoot/email': {},
    '@ishoot/locales': { getTranslations: () => ({ api: { inquiry: { requiredFields: 'Invalid input', serverError: 'Failed' } } }) },
  });
  assert.equal((await inquiryRoute.POST({ json: async () => ({ fullName: {}, email: 'bad', message: [], services: 'oops' }) })).status, 400);
  assert.throws(() => types.calculateInvoiceTotals([{ quantity: -1, unit_price: 10 }], 'none', 0, false, 10), /line items/);
  const financial = load('packages/database/src/queries/finance.ts', {
    './invoices': { getAllInvoices: async () => [
      { currency: 'BHD', status: 'sent', amount_due: 55, due_date: '2000-01-01', discount_amount: 0, vat_enabled: true, total_amount: 110, amount_paid: 55, vat_amount: 10 },
      { currency: 'USD', status: 'sent', amount_due: 900, discount_amount: 0 },
      { currency: 'BHD', status: 'void', amount_due: 100, discount_amount: 0, vat_enabled: true, vat_amount: 10 },
    ] },
    './payments': { getAllPayments: async () => [{ currency: 'BHD', amount: 55 }, { currency: 'USD', amount: 900 }] },
    './expenses': { getAllExpenses: async () => [{ currency: 'BHD', amount: 20 }, { currency: 'USD', amount: 800 }] },
  });
  const totals = await financial.getFinancialSummary();
  assert.equal(totals.revenue, 55);
  assert.equal(totals.expenses, 20);
  assert.equal(totals.overdue, 55);
  assert.equal(totals.vatCollected, 5);
  const page = load('apps/admin/app/dashboard/invoices/page.tsx', {
    '../../../lib/auth': { requirePermission: async () => user },
    '@ishoot/database': { getAllInvoices: async () => [
      { currency: 'BHD', status: 'sent', amount_due: 55, due_date: '2000-01-01', discount_amount: 5 },
      { currency: 'USD', status: 'sent', amount_due: 900, due_date: '2000-01-01', discount_amount: 100 },
      { currency: 'BHD', status: 'void', amount_due: 100, due_date: '2000-01-01', discount_amount: 50 },
    ] },
    react: { createElement: (component, props) => props },
    '../../../components/invoices/InvoicesListView': { InvoicesListView() {} },
  });
  const rendered = await page.default();
  assert.equal(rendered.finance.outstanding, 55);
  assert.equal(rendered.finance.overdue, 55);
  assert.equal(rendered.finance.discountsGiven, 5);
  console.log('Platform checks passed: revocation, permissions, invoice rollback/VAT, payment validation, lead conversion/idempotency.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
