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
  vm.runInNewContext(code, {
    module, exports: module.exports, require(id) {
      if (jsx && id === 'react/jsx-runtime') return appRequire(id);
      id = ((i, m) => i in m ? i : (i.startsWith('@platform/database/') && '@platform/database' in m ? '@platform/database' : i))(id, mocks);
      if (!(id in mocks)) { const real = realConstants(file, id); if (real) return real; throw Error('Unmocked dependency: ' + id); }
      return mocks[id];
    }, console, Date, Intl, Set, Map, URLSearchParams
  });
  return module.exports;
}
async function main() {
  for (const locale of ['en', 'ar']) {
    const t = require('../packages/locales/src/admin/' + locale + '.json');
    const node = (tag) => ({ children }) => React.createElement(tag, null, children);
    const link = ({ href, children }) => React.createElement('a', { href }, children);
    const { DashboardWidget } = load('apps/admin/components/dashboard/DashboardWidgets.tsx', {
      'next/link': link,
      '../shared/DeferredCharts': { DeferredCashflowChart: () => React.createElement('div', { 'data-testid': 'cashflow-chart' }) },
      './WorkloadPanels': { WorkloadPanels: () => React.createElement('div', { 'data-testid': 'workload' }) },
      '@platform/ui': { CountUp: ({ value, render }) => (render ? render(value) : String(value)), CurrencyDisplay: ({ amount }) => React.createElement('span', null, 'money:' + amount), DateDisplay: node('span'), StatusBadge: node('span') },
      'lucide-react': new Proxy({}, { get: () => () => React.createElement('svg') }),
      '../../hooks/useAdminLocale': { useAdminLocale: () => ({ t, locale }) },
      '../../lib/deal-stages': { dealStageLabel: (stage) => stage.name_en || t.stages[stage.id] || stage.id },
    }, true);
    const empty = { generatedAt: '2026-10-06T00:00:00.000Z', currency: 'BHD', showMoney: false, finance: null, cashflow: null, deals: null, stages: null, leads: null, orders: null, recentOrders: null, lowStock: null, shipments: null, tasks: null, campaigns: null, legal: null, events: null, activity: null, company: null, workload: null, actions: [] };
    const render = (id, data) => renderToStaticMarkup(React.createElement(DashboardWidget, { id, data: { ...empty, ...data } }));
    assert.equal(render('kpi_revenue', {}), '', 'A widget without its data renders nothing');
    const finance = { revenue: 9876, outstanding: 22, overdue: 0, expenses: 44, netProfit: 9832, profitMargin: 99 };
    assert.ok(render('kpi_revenue', { finance }).includes(t.dashboardBoard.widgets.kpi_revenue) && render('kpi_revenue', { finance }).includes('money:9876'));
    const deals = { recent: [{ id: 'd1', title: 'Deal one', stage: 'lead', value: 500, currency: 'BHD', contact: null }], stageStats: { lead: { count: 1, value: 500 } }, activeCount: 1, activePipelineValue: 500 };
    assert.ok(!render('pipeline_stages', { deals }).includes('money:'), 'Deal values stay hidden without finance access');
    assert.ok(!render('recent_deals', { deals }).includes('money:'));
    assert.ok(render('pipeline_stages', { deals, showMoney: true }).includes('money:500'));
    assert.ok(render('kpi_pipeline', { deals }).includes('>1<'), 'Without finance the pipeline shows the number of deals');
    const actions = render('quick_actions', { actions: [{ key: 'reports', href: '/dashboard/reports' }] });
    assert.ok(actions.includes('/dashboard/reports') && !actions.includes('/dashboard/invoices/new'), 'Quick actions show only what the server allowed');
    const feed = render('activity', { activity: [{ id: 'a1', user: 'Staff One', action: 'create', entity_type: 'invoice', entity_id: 'i1', at: '2026-10-05T10:00:00.000Z' }] });
    assert.ok(feed.includes('Staff One') && feed.includes('/dashboard/invoices/i1'), 'Activity entries link to their record');
    assert.ok(render('workload', { workload: {} }).includes('data-testid="workload"'));
    const { WorkloadPanels } = load('apps/admin/components/dashboard/WorkloadPanels.tsx', {
      'next/link': ({ href, children }) => React.createElement('a', { href }, children),
      '@platform/ui': { CountUp: ({ value }) => String(value) },
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
  }
  // The widget catalogue: grants and modules decide what can be placed; stored layouts are cleaned on read.
  const dash = realConstants('apps/admin/x.ts', '@platform/database/constants/dashboard');
  const on = () => true;
  const viewerWidgets = dash.availableDashboardWidgets({ 'tasks:read': true }, on).map((w) => w.id);
  assert.ok(viewerWidgets.includes('kpi_tasks') && viewerWidgets.includes('activity') && !viewerWidgets.includes('kpi_revenue') && !viewerWidgets.includes('cashflow'), 'Finance widgets need finance access');
  const storeOff = dash.availableDashboardWidgets({ 'orders:read': true }, (m) => m !== 'store').map((w) => w.id);
  assert.ok(!storeOff.includes('kpi_orders'), 'A widget of a module that is off is never offered');
  const available = new Set(['kpi_tasks', 'my_tasks', 'activity']);
  assert.deepEqual(dash.normalizeDashboardLayout([{ id: 'kpi_tasks', size: 'm' }, { id: 'kpi_tasks', size: 's' }, { id: 'kpi_revenue', size: 's' }, { id: 'nope' }, { id: 'my_tasks', size: 'huge' }, 'x'], available), [{ id: 'kpi_tasks', size: 'm' }, { id: 'my_tasks', size: 'l' }], 'Unknown, repeated, forbidden widgets and bad sizes are dropped or fixed');
  assert.deepEqual(dash.normalizeDashboardLayout('not a list', available), []);
  assert.equal(dash.defaultDashboardLayout('driver', 'staff')[0].id, 'kpi_shipments', 'Roles with narrower work start from their own layout');
  assert.ok(dash.defaultDashboardLayout('employee', 'staff').some((w) => w.id === 'my_tasks'));
  assert.equal(dash.nextDashboardSize('kpi_tasks', 'm'), 's', 'Resizing wraps round the sizes the widget allows');
  for (const w of dash.DASHBOARD_WIDGETS) assert.ok(w.sizes.includes(w.defaultSize), `${w.id} default size is allowed`);

  let aggregations = 0, listReads = 0;
  const { getCRMDealOverview } = load('packages/database/src/queries/crm.ts', {
    './company-settings': {}, '../services/lead-resolver': {},
    '../db': {
      db: {
        crmDeal: {
          groupBy: async () => { aggregations++; return [{ dealStage: 'qualified', currency: 'BHD', _count: { _all: 2 }, _sum: { dealValue: 300 } }]; },
          findMany: async (args) => { listReads++; assert.equal(args.take, 5); return []; },
        }
      }
    },
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
  const pipeline = ['lead', 'proposal_sent', 'contract_signed', 'production', 'delivered', 'invoiced', 'closed_won', 'closed_lost']
    .map((id, sortOrder) => ({ id, sortOrder, kind: id === 'closed_won' ? 'won' : id === 'closed_lost' ? 'lost' : 'open', probability: 50 }));
  const tx = { crmDeal: { updateMany: async (args) => { advances.push(args); return { count: 1 }; } }, dealPipelineStage: { findMany: async () => pipeline } };
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
  console.log('Dashboard checks passed: widget catalogue gates and layout clean-up, widgets without data or money access, permitted actions, linked activity, bounded recent deals, omitted unauthorized analytics query, forward-only deal progression and typed route builders.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
