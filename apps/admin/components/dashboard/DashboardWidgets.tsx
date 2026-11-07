"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatMessage } from "@platform/locales";
import { CountUp, CurrencyDisplay, DateDisplay, StatusBadge } from "@platform/ui";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  DollarSign,
  Gavel,
  Inbox,
  Megaphone,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { dealStageLabel } from "../../lib/deal-stages";
import type { DashboardData } from "../../lib/dashboard-widgets";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { DeferredCashflowChart } from "../shared/DeferredCharts";
import { ArchiveFoldersWidget, CustomFoldersWidget } from "./FolderWidgets";
import {
  BookmarksLaunchpadWidget,
  CalendarMiniWidget,
  ClockWorldWidget,
  CountdownMilestoneWidget,
  CurrencyRatesWidget,
  FocusPomodoroWidget,
  LocalClockWidget,
  QuickCalculatorWidget,
  ScratchpadNotesWidget,
  StickyQuoteWidget,
  WeatherLocalWidget,
  WelcomeProfileWidget,
} from "./LifestyleWidgets";
import { WorkloadPanels } from "./WorkloadPanels";

export const widgetCard = "admin-widget h-full";

/** Where an activity entry's record opens, for the types that have a page. */
const ENTITY_LINKS: Record<string, (id: string) => string> = {
  invoice: (id) => ROUTES.invoices.detail(id),
  deal: (id) => ROUTES.crm.deal(id),
  contact: (id) => ROUTES.crm.customer(id),
  task: (id) => ROUTES.tasks.detail(id),
  sales_order: (id) => ROUTES.orders.detail(id),
  order: (id) => ROUTES.orders.detail(id),
  shipment: (id) => ROUTES.delivery.shipment(id),
  product: (id) => ROUTES.products.detail(id),
  legal_matter: (id) => ROUTES.legal.matter(id),
};

function Kpi({ title, icon, tone, value, sub, href, settings, testId }: { title: string; icon: ReactNode; tone: string; value: ReactNode; sub?: ReactNode; href?: string; settings?: Record<string, unknown>; testId?: string }) {
  const wTheme = typeof settings?.theme === "string" ? settings.theme : "default";
  const wSurface = typeof settings?.surface === "string" ? settings.surface : "tonal";
  const body = (
    <div data-testid={testId} data-test={testId} data-widget-theme={wTheme} data-widget-surface={wSurface} className={`${widgetCard} admin-kpi ${href ? "transition-[border-color,box-shadow,transform] duration-base ease-standard hover:border-accent/50 hover:shadow-sm hover:-translate-y-0.5" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="admin-kpi-label truncate font-semibold">{title}</span>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone}`} aria-hidden="true">{icon}</span>
      </div>
      <div className="admin-kpi-value text-ink" data-test={testId ? `${testId.replace(/-card$/, "")}-value` : undefined} data-testid={testId ? `${testId.replace(/-card$/, "")}-value` : undefined}>{value}</div>
      {sub ? <div className="admin-kpi-note">{sub}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block h-full rounded-xl press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{body}</Link> : body;
}

function Panel({ title, icon, href, settings, children }: { title: string; icon: ReactNode; href?: string; settings?: Record<string, unknown>; children: ReactNode }) {
  const { t } = useAdminLocale();
  const wTheme = typeof settings?.theme === "string" ? settings.theme : "default";
  const wSurface = typeof settings?.surface === "string" ? settings.surface : "tonal";
  return (
    <section data-widget-theme={wTheme} data-widget-surface={wSurface} className={`${widgetCard} p-5 space-y-3 flex flex-col`} data-page-section>
      <div className="admin-widget-header">
        <h2 className="text-ink">
          <span className="w-7 h-7 rounded-full bg-primary/12 text-primary inline-flex items-center justify-center shrink-0" aria-hidden="true">{icon}</span>
          {title}
        </h2>
        {href ? (
          <Link href={href} className="rounded-full bg-secondary-container/75 text-on-secondary-container px-3 py-1 text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 transition-opacity">
            {t.dashboardBoard.view}
            <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function Empty({ children }: { children?: ReactNode }) {
  const { t } = useAdminLocale();
  return <p className="text-xs text-ink-muted py-4 text-center">{children ?? t.dashboardBoard.none}</p>;
}

/** One widget's content from the loaded data; null when its data was not loaded (added while editing). */
export function DashboardWidget({
  id,
  data,
  settings,
  onUpdateSettings,
}: {
  id: string;
  data: DashboardData;
  settings?: Record<string, unknown>;
  onUpdateSettings?: (patch: Record<string, string | number | boolean>) => void;
}) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;
  const title = (b.widgets as Record<string, string>)[id] ?? id;
  const money = (amount: number) => <CurrencyDisplay amount={amount} currency={data.currency} />;
  // Headline figures count up when they appear.
  const countMoney = (amount: number) => <CountUp value={amount} decimals={3} render={money} />;
  const count = (n: number, message?: string) => <CountUp value={n} render={(v) => (message ? formatMessage(message, { n: String(v) }) : v)} />;
  const name = (en: string, ar: string) => (locale === "ar" ? ar || en : en || ar);

  switch (id) {
    case "kpi_revenue":
      return data.finance && <Kpi testId="revenue-card" settings={settings} title={title} icon={<DollarSign className="w-3.5 h-3.5" />} tone="bg-emerald-500/15 text-emerald-600" value={countMoney(data.finance.revenue)} sub={b.widgetHints.kpi_revenue} href={ROUTES.finance.overview} />;
    case "kpi_receivables":
      return data.finance && <Kpi testId="receivables-card" settings={settings} title={title} icon={<TrendingUp className="w-3.5 h-3.5" />} tone="bg-amber-500/15 text-amber-500" value={countMoney(data.finance.outstanding)} sub={data.finance.overdue > 0 ? <>{money(data.finance.overdue)} {t.kpi.overdueAlert}</> : t.kpi.allOnTrack} href={ROUTES.invoices.list} />;
    case "kpi_expenses":
      return data.finance && <Kpi testId="expenses-card" settings={settings} title={title} icon={<TrendingDown className="w-3.5 h-3.5" />} tone="bg-rose-500/15 text-rose-500" value={countMoney(data.finance.expenses)} sub={t.kpi.expensesDesc} href={ROUTES.expenses.list()} />;
    case "kpi_profit":
      return data.finance && <Kpi settings={settings} title={title} icon={<span className="text-[10px] font-bold">%</span>} tone="bg-accent/15 text-accent" value={<span className={data.finance.netProfit >= 0 ? "text-primary dark:text-mint" : "text-rose-500"}><CountUp value={data.finance.profitMargin} decimals={1} render={(v) => `${v.toFixed(1)}%`} /></span>} sub={<>{money(data.finance.netProfit)} {t.kpi.netProfit}</>} />;
    case "kpi_pipeline":
      return data.deals && <Kpi settings={settings} title={title} icon={<Briefcase className="w-3.5 h-3.5" />} tone="bg-accent/15 text-accent" value={data.showMoney ? countMoney(data.deals.activePipelineValue) : count(data.deals.activeCount)} sub={formatMessage(b.dealsCount, { n: String(data.deals.activeCount) })} href={ROUTES.crm.deals} />;
    case "kpi_leads":
      return data.leads != null && <Kpi settings={settings} title={title} icon={<Inbox className="w-3.5 h-3.5" />} tone="bg-blue-500/15 text-blue-500" value={count(data.leads)} sub={t.kpi.lastSevenDays} href={ROUTES.requests.list} />;
    case "kpi_orders":
      return data.orders && <Kpi settings={settings} title={title} icon={<ShoppingBag className="w-3.5 h-3.5" />} tone="bg-violet-500/15 text-violet-500" value={count(data.orders.open, b.openOrders)} sub={<>{money(data.orders.today_total)} · {formatMessage(b.todaySales, { n: String(data.orders.today_count) })}</>} href={ROUTES.orders.list} />;
    case "kpi_shipments": {
      if (!data.shipments) return null;
      const { late, ...byStatus } = data.shipments;
      const open = Object.values(byStatus).reduce((sum: number, n: any) => sum + (Number(n) || 0), 0);
      return <Kpi settings={settings} title={title} icon={<Truck className="w-3.5 h-3.5" />} tone="bg-sky-500/15 text-sky-500" value={count(open, b.openShipments)} sub={late ? <span className="text-rose-500">{formatMessage(b.lateShipments, { n: String(late) })}</span> : b.noLate} href={ROUTES.delivery.shipments} />;
    }
    case "kpi_tasks":
      return data.tasks && <Kpi settings={settings} title={title} icon={<CheckSquare className="w-3.5 h-3.5" />} tone="bg-teal-500/15 text-teal-600" value={count(data.tasks.open, b.openTasks)} sub={data.tasks.overdue ? <span className="text-rose-500">{formatMessage(b.overdueTasks, { n: String(data.tasks.overdue) })}</span> : b.noOverdue} href={ROUTES.tasks.list} />;

    case "cashflow": {
      if (!data.cashflow) return null;
      const points = data.cashflow.map((pt) => {
        const parts = (pt.monthKey || new Date().toISOString().slice(0, 7)).split("-").map(Number);
        const year = parts[0] || new Date().getFullYear();
        const month = parts[1] || 1;
        return { month: new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-US", { month: "short" }).format(new Date(year, month - 1, 1)), revenue: pt.revenue, expenses: pt.expenses };
      });
      return (
        <Panel settings={settings} title={title} icon={<TrendingUp className="w-3.5 h-3.5" />} href={ROUTES.finance.overview}>
          <div className="h-72 w-full pt-2" data-test="cashflow-bar" data-testid="cashflow-bar">
            <DeferredCashflowChart kind="dashboard" data={points} />
          </div>
        </Panel>
      );
    }
    case "pipeline_stages": {
      if (!data.deals) return null;
      const stages = data.stages ?? [];
      const rank = (key: string) => {
        const at = stages.findIndex((s) => s.id === key);
        return at < 0 ? Number.MAX_SAFE_INTEGER : at;
      };
      const entries = Object.entries(data.deals.stageStats).sort(([a], [z]) => rank(a) - rank(z));
      const total = entries.reduce((sum, [, s]) => sum + (data.showMoney ? s.value : s.count), 0);
      return (
        <Panel title={title} icon={<Briefcase className="w-3.5 h-3.5" />} href={ROUTES.crm.deals}>
          {entries.length ? (
            <div className="max-h-64 overflow-y-auto py-1">
              <ul className="space-y-3">
                {entries.map(([key, stat]) => {
                  const stage = stages.find((s) => s.id === key);
                  const share =
                    total > 0
                      ? ((data.showMoney ? stat.value : stat.count) / total) * 100
                      : 0;
                  return (
                    <li key={key} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-ink-muted font-medium truncate">
                          {stage
                            ? dealStageLabel(stage, t, locale)
                            : ((t.stages as Record<string, string>)[key] ?? key)}{" "}
                          ({stat.count})
                        </span>
                        {data.showMoney ? (
                          <span className="font-bold text-ink">{money(stat.value)}</span>
                        ) : null}
                      </div>
                      <div className="w-full h-1.5 bg-surface-sunken dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full motion-safe:transition-[width] motion-safe:duration-700"
                          style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
      );
    }

    case "workload":
      return data.workload && <WorkloadPanels {...data.workload} />;

    case "my_tasks":
      return data.tasks && (
        <Panel title={title} icon={<CheckSquare className="w-3.5 h-3.5" />} href={ROUTES.tasks.list}>
          {data.tasks.tasks.length ? (
            <ul className="divide-y divide-outline-variant stagger-children">
              {data.tasks.tasks.map((task, idx) => (
                <li key={task.id ? `task-${task.id}-${idx}` : `task-idx-${idx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <Link href={ROUTES.tasks.detail(task.id)} className="min-w-0 hover:text-accent">
                    <span className="block font-semibold text-ink truncate"><bdi dir="auto">{task.title}</bdi></span>
                    <span className="block text-[11px] text-ink-muted truncate">
                      {task.number}
                      {task.project ? ` · ${task.project}` : ""}
                    </span>
                  </Link>
                  <span className={`shrink-0 text-[11px] ${task.due_date && task.due_date < data.generatedAt.slice(0, 10) ? "text-rose-500 font-semibold" : "text-ink-muted"}`}>
                    {task.due_date ? formatMessage(b.due, { date: task.due_date }) : b.noDue}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "recent_deals":
      return data.deals && (
        <Panel title={title} icon={<Briefcase className="w-3.5 h-3.5" />} href={ROUTES.crm.deals}>
          {data.deals.recent.length ? (
            <ul className="divide-y divide-outline-variant stagger-children">
              {data.deals.recent.slice(0, 5).map((deal, idx) => (
                <li key={deal.id ? `deal-${deal.id}-${idx}` : `deal-idx-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={ROUTES.crm.deal(deal.id)} className="text-xs font-bold text-ink hover:text-accent truncate block">{deal.title}</Link>
                    <span className="text-[11px] text-ink-muted truncate block">{deal.contact ? deal.contact.company || deal.contact.full_name : t.dashboardView.directLead}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={deal.stage} />
                    {data.showMoney ? <span className="text-xs font-bold text-ink min-w-[72px] text-end"><CurrencyDisplay amount={deal.value} currency={deal.currency} /></span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "upcoming_events":
      return data.events && (
        <Panel title={title} icon={<CalendarDays className="w-3.5 h-3.5" />} href={ROUTES.calendar}>
          {data.events.length ? (
            <ul className="space-y-2 stagger-children">
              {data.events.map((event, idx) => (
                <li key={event.id ? `event-${event.id}-${idx}` : `event-idx-${idx}`} className="p-2.5 rounded-lg bg-surface-raised dark:bg-surface-raised/40 border border-outline-variant space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: `${event.color || "rgb(var(--brand-accent))"}20`, color: event.color || "rgb(var(--brand-accent))" }}>
                      {(t.calendarView as Record<string, unknown>)[event.event_type] as string ?? event.event_type}
                    </span>
                    <DateDisplay date={event.start_date} locale={locale} className="text-[10px] text-ink-muted" />
                  </div>
                  <div className="text-xs font-semibold text-ink line-clamp-1">{locale === "ar" && event.title_ar ? event.title_ar : event.title}</div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t.dashboardView.zeroUpcomingShoots}</Empty>
          )}
        </Panel>
      );

    case "recent_orders":
      return data.recentOrders && (
        <Panel title={title} icon={<ShoppingBag className="w-3.5 h-3.5" />} href={ROUTES.orders.list}>
          {data.recentOrders.length ? (
            <ul className="divide-y divide-outline-variant stagger-children">
              {data.recentOrders.map((order, idx) => (
                <li key={order.id ? `order-${order.id}-${idx}` : `order-idx-${idx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <Link href={ROUTES.orders.detail(order.id)} className="min-w-0 hover:text-accent">
                    <span className="block font-semibold text-ink truncate">{order.number}</span>
                    <span className="block text-[11px] text-ink-muted truncate"><bdi dir="auto">{order.name}</bdi></span>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold">{(t.orders.statuses as Record<string, string>)[order.status] ?? order.status}</span>
                    <span className="font-bold text-ink">{money(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "low_stock":
      return data.lowStock && (
        <Panel title={title} icon={<Package className="w-3.5 h-3.5" />} href={`${ROUTES.inventory.stock}?filter=low`}>
          {data.lowStock.rows && data.lowStock.rows.length > 0 ? (
            <>
              <ul className="divide-y divide-outline-variant stagger-children">
                {data.lowStock.rows.map((row) => (
                  <li key={`${row.product_id}-${row.variant_id ?? ""}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <Link href={ROUTES.products.detail(row.product_id)} className="min-w-0 hover:text-accent">
                      <span className="block font-semibold text-ink truncate">{name(row.name_en, row.name_ar)}{row.variant_en ? ` · ${name(row.variant_en, row.variant_ar)}` : ""}</span>
                      <span className="block text-[11px] text-ink-muted truncate">{row.sku}</span>
                    </Link>
                    <span className="shrink-0 text-end">
                      <span className={`block font-bold ${row.available <= 0 ? "text-rose-500" : "text-amber-600 dark:text-amber-400"}`}>{formatMessage(b.available, { n: String(row.available) })}</span>
                      {row.reorder_point != null ? <span className="block text-[10px] text-ink-muted">{formatMessage(b.reorderAt, { n: String(row.reorder_point) })}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {data.lowStock.total > data.lowStock.rows.length ? <p className="pt-2 text-[11px] text-ink-muted">{formatMessage(b.moreLow, { n: String(data.lowStock.total) })}</p> : null}
            </>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "campaigns":
      return data.campaigns && (
        <Panel title={title} icon={<Megaphone className="w-3.5 h-3.5" />} href={ROUTES.marketing.campaigns}>
          {data.campaigns.length ? (
            <ul className="divide-y divide-outline-variant stagger-children">
              {data.campaigns.map((c, idx) => (
                <li key={c.id ? `camp-${c.id}-${idx}` : `camp-idx-${idx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink truncate">{c.name}</span>
                    <span className="block text-[11px] text-ink-muted">{(t.marketing.campaigns.statuses as Record<string, string>)[c.status] ?? c.status}</span>
                  </span>
                  <span className="shrink-0 text-ink-muted">{formatMessage(b.campaignResult, { orders: String(c.orders), revenue: String(c.revenue) })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "legal_dates":
      return data.legal && (
        <Panel title={title} icon={<Gavel className="w-3.5 h-3.5" />} href={ROUTES.legal.matters}>
          {data.legal.length ? (
            <ul className="divide-y divide-outline-variant stagger-children">
              {data.legal.map((m, idx) => (
                <li key={m.id ? `legal-${m.id}-${idx}` : `legal-idx-${idx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <Link href={ROUTES.legal.matter(m.id)} className="min-w-0 hover:text-accent">
                    <span className="block font-semibold text-ink truncate"><bdi dir="auto">{m.title}</bdi></span>
                    <span className="block text-[11px] text-ink-muted">{(t.legal.kinds as Record<string, string>)[m.kind] ?? m.kind}</span>
                  </Link>
                  {m.next_date ? <DateDisplay date={m.next_date} locale={locale} className="shrink-0 text-[11px] text-ink-muted" /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "company":
      return data.company && (
        <Panel title={title} icon={<Building2 className="w-3.5 h-3.5" />} href={ROUTES.settings.company}>
          <div className="font-bold text-xs text-ink">{locale === "ar" ? data.company.company_name_ar : data.company.company_name_en}</div>
          {data.company.cr_number ? <p className="mt-1 text-[11px] text-ink-muted">{t.copy.registrationLabel}{data.company.cr_number}</p> : null}
          <dl className="mt-2 space-y-1.5 text-xs">
            {data.company.vat_enabled ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">{t.settings.vatTitle}</dt>
                <dd className="font-semibold">{formatMessage(t.dashboardView.vatRegistered, { rate: data.company.vat_percentage })}</dd>
              </div>
            ) : null}
            {data.company.bank_name ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">{t.settings.bankName}</dt>
                <dd className="truncate max-w-[60%] text-end">{data.company.bank_name}</dd>
              </div>
            ) : null}
            {data.company.bank_iban ? (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">{t.settings.bankIban}</dt>
                <dd className="truncate max-w-[60%] text-end text-[10px]">{data.company.bank_iban}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
      );

    case "quick_actions":
      return (
        <Panel title={title} icon={<Zap className="w-3.5 h-3.5" />}>
          {data.actions.length ? (
            <div className="grid grid-cols-2 gap-2 stagger-children">
              {data.actions.map((action) => (
                <Link key={action.key} href={action.href} className="rounded-lg border border-outline-variant px-3 py-2.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent motion-safe:transition-[color,border-color,transform] motion-safe:active:scale-[0.98]">
                  {(b.actions as Record<string, string>)[action.key] ?? action.key}
                </Link>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
      );

    case "activity":
      return data.activity && (
        <Panel title={title} icon={<Activity className="w-3.5 h-3.5" />}>
          {data.activity.length ? (
            <ol className="space-y-2.5 stagger-children">
              {data.activity.map((entry, idx) => {
                const entity = (t.auditDetails.entities as Record<string, string>)[entry.entity_type] ?? entry.entity_type.replaceAll("_", " ");
                const action = (t.auditDetails.actions as Record<string, string>)[entry.action] ?? entry.action.replaceAll("_", " ");
                const link = entry.entity_id ? ENTITY_LINKS[entry.entity_type]?.(entry.entity_id) : undefined;
                const line = formatMessage(b.activityLine, { user: entry.user, action, entity });
                return (
                  <li key={entry.id ? `act-${entry.id}-${idx}` : `act-idx-${idx}`} className="flex items-start justify-between gap-3 text-xs">
                    {link ? <Link href={link} className="min-w-0 text-ink hover:text-accent">{line}</Link> : <span className="min-w-0 text-ink">{line}</span>}
                    <DateDisplay date={entry.at} locale={locale} className="shrink-0 text-[10px] text-ink-muted" />
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>{b.noActivity}</Empty>
          )}
        </Panel>
      );

    case "hr_pulse":
      return (
        data.hrPulse && (
          <Panel title={title} icon={<Users className="w-3.5 h-3.5" />} href={ROUTES.hr.employees}>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl bg-surface-sunken/70 border border-outline-variant/60 p-3 text-center">
                <div className="text-lg font-bold text-ink tabular-nums">
                  {count(data.hrPulse.active)}
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">{b.hrActiveStaff}</div>
              </div>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {count(data.hrPulse.pending_leave)}
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">{b.hrPendingLeave}</div>
              </div>
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3 text-center">
                <div className="text-lg font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                  {count(data.hrPulse.on_leave)}
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">{b.department.awayToday}</div>
              </div>
            </div>
          </Panel>
        )
      );

    case "procurement_pulse":
      return (
        data.procurementPulse && (
          <Panel
            title={title}
            icon={<ClipboardList className="w-3.5 h-3.5" />}
            href={ROUTES.procurement.orders}
          >
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-xl bg-surface-sunken/70 border border-outline-variant/60 p-3 text-center">
                <div className="text-lg font-bold text-ink tabular-nums">
                  {count(data.procurementPulse.open_orders)}
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">{b.procurementOpenPos}</div>
              </div>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {count(data.procurementPulse.open_requisitions)}
                </div>
                <div className="text-[10px] text-ink-muted mt-0.5">{b.actions.newRequisition}</div>
              </div>
            </div>
          </Panel>
        )
      );

    case "archive_folders":
      return <ArchiveFoldersWidget data={data} settings={settings} />;

    case "custom_folders":
      return <CustomFoldersWidget data={data} settings={settings} />;

    case "welcome_profile":
      return (
        <WelcomeProfileWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "clock_local":
      return (
        <LocalClockWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "clock_world":
      return (
        <ClockWorldWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "weather_local":
      return (
        <WeatherLocalWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "calendar_mini":
      return (
        <CalendarMiniWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "scratchpad_notes":
      return (
        <ScratchpadNotesWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "focus_pomodoro":
      return (
        <FocusPomodoroWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "quick_calculator":
      return (
        <QuickCalculatorWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "currency_rates":
      return (
        <CurrencyRatesWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "countdown_milestone":
      return (
        <CountdownMilestoneWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "sticky_quote":
      return (
        <StickyQuoteWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );

    case "bookmarks_launchpad":
      return (
        <BookmarksLaunchpadWidget
          data={data}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      );
  }
  return null;
}

