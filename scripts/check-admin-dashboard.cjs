// Render the real dashboard with boundary components, and exercise query selection.
const { realConstants } = require("./lib/real-constants.cjs");
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
    id = ((i,m)=>i in m?i:(i.startsWith('@platform/database/')&&'@platform/database' in m?'@platform/database':i))(id, mocks);
    if (!(id in mocks)) { const real = realConstants(file, id); if (real) return real; throw Error('Unmocked dependency: ' + id); }
    return mocks[id];
  }, console, Date, Intl, Set, Map, URLSearchParams });
  return module.exports;
}
async function main() {
  for (const locale of ['en', 'ar']) {
    const t = require('../packages/locales/src/admin/' + locale + '.json');
    const node = (tag) => ({ children }) => React.createElement(tag, null, children);
    const { ExecutiveDashboardView } = load('apps/admin/components/dashboard/ExecutiveDashboardView.tsx', {
      'next/link': ({ href, children }) => React.createElement('a', { href }, children),
      '../shared/DeferredCharts': { DeferredCashflowChart: () => React.createElement('div', { 'data-testid': 'cashflow-chart' }) },
      './WorkloadPanels': { WorkloadPanels: () => React.createElement('div', { 'data-testid': 'workload' }) },
      '@platform/ui': { Button: node('button'), CurrencyDisplay: ({ amount }) => React.createElement('span', null, amount), DateDisplay: node('span'), StatusBadge: node('span') },
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
    const { WorkloadPanels } = load('apps/admin/components/dashboard/WorkloadPanels.tsx', {
      'next/link': ({ href, children }) => React.createElement('a', { href }, children),
      'lucide-react': new Proxy({}, { get: () => () => React.createElement('svg') }),
      '../../hooks/useAdminLocale': { useAdminLocale: () => ({ t, locale }) },
    }, true);
    const approvals = { awaitingMe: 1, awaitingMeByType: { quotation: 1 }, oldestAwaitingAt: '2026-10-01T00:00:00.000Z', queue: [{ id: 'a1', targetType: 'quotation', targetId: 'q1', requester: 'Staff', currentStep: 1, createdAt: '2026-10-01T00:00:00.000Z' }], mySubmittedPending: 0, myDecidedLast30: 0, org: null };
    const requests = { open: 2, overdue: 1, unassigned: 0, awaitingApproval: 0, newLast7: 1, resolvedLast30: 0, avgResolutionHours: null, slaMetPct: null, byKind: { service: 2 }, byTeam: {}, byPriority: { urgent: 1, high: 0, normal: 1 }, byStatus: {}, mine: { open: 0, overdue: 0, items: [] } };
    const panels = (extra) => renderToStaticMarkup(React.createElement(WorkloadPanels, { approvals, requests: null, complaints: null, generatedAt: '2026-10-06T00:00:00.000Z', ...extra }));
    const staffOnly = panels({});
    assert.ok(staffOnly.includes(t.workload.approvalsTitle) && staffOnly.includes('/dashboard/quotations/q1'), 'Everyone sees their approval queue with links to the record');
    assert.ok(!staffOnly.includes('wl-org'), 'No company approvals view without readable types');
    assert.ok(!staffOnly.includes('wl-requests') && !staffOnly.includes('wl-complaints'), 'Request and complaint panels need their permissions');
    const withRequests = panels({ requests });
    assert.ok(withRequests.includes('id="wl-requests"') && withRequests.includes('overdue=true'));
    assert.ok(!withRequests.includes('wl-complaints'));
    const focused = renderToStaticMarkup(React.createElement(ExecutiveDashboardView, { ...props, focus: 'production', capabilities: { finance: false, deals: false, leads: false, calendar: false, createInvoice: false, settings: false } }));
    assert.ok(focused.includes(t.workload.focus.production) && focused.includes(t.workload.focusSubtitle.production), 'The role desk sets the dashboard title');
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

  // Linked deals only ever move forward, and never out of a closed stage.
  const advances = [];
  const { advanceDealForEvent } = load('packages/database/src/queries/crm.ts', {
    './company-settings': {}, '../services/lead-resolver': {}, '../db': { db: {} },
  });
  const tx = { crmDeal: { updateMany: async (args) => { advances.push(args); return { count: 1 }; } } };
  assert.equal(await advanceDealForEvent(tx, null, 'invoice_paid'), false, 'Unlinked documents never touch deals');
  await advanceDealForEvent(tx, 'd1', 'quotation_issued');
  await advanceDealForEvent(tx, 'd1', 'invoice_paid');
  assert.equal(JSON.stringify(advances[0].where), JSON.stringify({ id: 'd1', dealStage: { in: ['lead'] } }));
  assert.equal(advances[0].data.dealStage, 'proposal_sent');
  assert.equal(advances[1].data.dealStage, 'closed_won');
  assert.ok(!advances[1].where.dealStage.in.includes('closed_lost'), 'A lost deal is never reopened');
  assert.ok(advances[1].where.dealStage.in.includes('invoiced'));

  // Links can only carry the parameters their target page reads.
  const { ROUTES, entityRoute } = realConstants('apps/admin/x.ts', '@platform/database/constants/routes');
  assert.equal(ROUTES.quotations.create({ clientId: 'c 1', dealId: 'd', inquiryId: null }), '/dashboard/quotations/new?clientId=c+1&dealId=d');
  assert.equal(ROUTES.crm.newDeal(), '/dashboard/crm/deals/new');
  assert.equal(ROUTES.crm.customer('a/b'), '/dashboard/crm/customers/a%2Fb');
  assert.equal(entityRoute('customer_vault', 'c'), '/dashboard/crm/customers/c');
  assert.equal(entityRoute('unknown', 'x'), undefined);
  console.log('Dashboard checks passed: localized capability gates, permitted actions, bounded recent deals, omitted unauthorized analytics query, forward-only deal progression and typed route builders.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
