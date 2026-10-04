// Render the real dashboard with boundary components, and exercise query selection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const appRequire = createRequire(require.resolve('../apps/admin/package.json'));
const React = appRequire('react');
const { renderToStaticMarkup } = appRequire('react-dom/server');
function load(file, mocks, jsx = false) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(id) {
    if (jsx && id === 'react/jsx-runtime') return appRequire(id);
    if (!(id in mocks)) throw Error('Unmocked dependency: ' + id);
    return mocks[id];
  }, console, Date, Intl, Set, Map });
  return module.exports;
}
async function main() {
  for (const locale of ['en', 'ar']) {
    const t = require('../packages/locales/src/' + locale + '.json').admin;
    const node = (tag) => ({ children }) => React.createElement(tag, null, children);
    const { ExecutiveDashboardView } = load('apps/admin/components/dashboard/ExecutiveDashboardView.tsx', {
      'next/link': ({ href, children }) => React.createElement('a', { href }, children),
      '../shared/DeferredCharts': { DeferredCashflowChart: () => React.createElement('div', { 'data-testid': 'cashflow-chart' }) },
      '@ishoot/ui': { Button: node('button'), CurrencyDisplay: ({ amount }) => React.createElement('span', null, amount), DateDisplay: node('span'), StatusBadge: node('span') },
      'lucide-react': new Proxy({}, { get: () => () => React.createElement('svg') }),
      '../../hooks/useAdminLocale': { useAdminLocale: () => ({ t, locale }) },
    }, true);
    const props = { finance: { revenue: 9876, outstanding: 22, overdue: 0, expenses: 44, netProfit: 9832, profitMargin: 99 }, monthlyCashflow: [], dealOverview: { recent: [], stageStats: {}, activeCount: 0, activePipelineValue: 0 }, inquiryCount: 0, company: { company_name_en: 'Test company', company_name_ar: 'شركة اختبار', cr_number: 'TEST', vat_enabled: false }, upcomingEvents: [] };
    const viewer = renderToStaticMarkup(React.createElement(ExecutiveDashboardView, { ...props, capabilities: { finance: false, deals: true, leads: false, calendar: true, createInvoice: false, settings: false } }));
    assert.ok(!viewer.includes(t.kpi.totalRevenue), 'Unauthorized users must not see financial KPIs');
    assert.ok(!viewer.includes('cashflow-chart'), 'Unauthorized users must not see financial charts');
    assert.ok(!viewer.includes('/dashboard/invoices/new'), 'Unauthorized users must not see invoice creation');
    assert.ok(!viewer.includes('/dashboard/settings/company'), 'Unauthorized users must not see settings action');
    assert.ok(viewer.includes(t.dashboardView.workspaceTitle));
    assert.ok(viewer.includes(t.dashboardView.recentDeals));
    const finance = renderToStaticMarkup(React.createElement(ExecutiveDashboardView, { ...props, capabilities: { finance: true, deals: true, leads: true, calendar: true, createInvoice: true, settings: true } }));
    assert.ok(finance.includes(t.kpi.totalRevenue));
    assert.ok(finance.includes('cashflow-chart'));
    assert.ok(finance.includes('/dashboard/invoices/new'));
  }
  let aggregations = 0, listReads = 0;
  const { getCRMDealOverview } = load('packages/database/src/queries/crm.ts', {
    './company-settings': {}, '../services/lead-resolver': {},
    '../db': { db: { crmDeal: {
      groupBy: async () => { aggregations++; return [{ dealStage: 'qualified', currency: 'BHD', _count: { _all: 2 }, _sum: { dealValue: 300 } }]; },
      findMany: async (args) => { listReads++; assert.equal(args.take, 5); return []; },
    } } },
  });
  const scoped = await getCRMDealOverview(false);
  assert.equal(aggregations, 0, 'The viewer dashboard must omit pipeline analytics queries');
  assert.equal(scoped.activePipelineValue, 0);
  const full = await getCRMDealOverview(true);
  assert.equal(aggregations, 1);
  assert.equal(full.activePipelineValue, 300);
  assert.equal(listReads, 2);
  console.log('Dashboard checks passed: localized capability gates, permitted actions, bounded recent deals and omitted unauthorized analytics query.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
