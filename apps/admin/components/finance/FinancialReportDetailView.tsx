"use client";

import * as React from "react";
import Link from "next/link";
import type { FinancialReportDetail } from "@ishoot/database/queries/finance-reports";
import { Card } from "@ishoot/ui";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="p-0 bg-surface border border-ink/10 rounded-3xl overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {hint && <p className="text-xs text-ink-muted mt-0.5">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </Card>
  );
}

/** Line-level financial detail. VAT columns appear only when VAT applies (registered, or present in the period). */
export function FinancialReportDetailView({ detail, showVat }: { detail: FinancialReportDetail; showVat: boolean }) {
  const { t, locale } = useAdminLocale();
  const d = t.financialDetail;
  const [vatFilter, setVatFilter] = React.useState<"all" | "with" | "without">("all");
  const [showAll, setShowAll] = React.useState(false);

  const register = detail.invoices.filter((i) => vatFilter === "all" || (vatFilter === "with" ? i.vatApplied : !i.vatApplied));
  const visible = showAll ? register : register.slice(0, 25);
  const maxCategory = Math.max(1, ...detail.expensesByCategory.map((c) => c.net));
  const th = "p-3 text-start font-semibold text-ink-muted whitespace-nowrap";
  const td = "p-3 whitespace-nowrap";

  return (
    <div className="space-y-6">
      <Section title={d.monthlyTitle} hint={d.monthlyHint}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="bg-surface-sunken">
              <tr>
                <th className={th}>{d.month}</th>
                <th className={`${th} text-end`}>{d.revenueNet}</th>
                <th className={`${th} text-end`}>{t.expenseMeta.kinds.cost_of_sales}</th>
                <th className={`${th} text-end`}>{t.expenseMeta.kinds.operating}</th>
                <th className={`${th} text-end`}>{t.expenseMeta.kinds.payroll}</th>
                <th className={`${th} text-end`}>{d.profit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {detail.monthly.map((m) => (
                <tr key={m.month}>
                  <td className={`${td} font-semibold text-ink`}>{m.month}</td>
                  <td className={`${td} text-end text-ink`}>{fmt(m.revenueNet)}</td>
                  <td className={`${td} text-end text-ink-muted`}>{fmt(m.costOfSales)}</td>
                  <td className={`${td} text-end text-ink-muted`}>{fmt(m.operating)}</td>
                  <td className={`${td} text-end text-ink-muted`}>{fmt(m.payroll)}</td>
                  <td className={`${td} text-end font-bold ${m.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(m.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={d.registerTitle}
        hint={showVat ? d.registerHintVat : d.registerHint}
        action={
          showVat ? (
            <div role="tablist" className="inline-flex p-1 rounded-full bg-surface-sunken border border-ink/10">
              {(["all", "with", "without"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={vatFilter === f}
                  onClick={() => setVatFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${vatFilter === f ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
                >
                  {f === "all" ? d.allInvoices : f === "with" ? d.withVat : d.withoutVat}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        <div className="px-5 pb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detail.invoiceTotals.map((tot) => (
            <div key={tot.currency} className="rounded-2xl border border-ink/10 p-3 text-xs space-y-1">
              <div className="font-bold text-ink">{tot.currency}</div>
              {showVat && (
                <div className="flex justify-between text-ink-muted">
                  <span>{d.withVat} ({tot.withVat.count})</span>
                  <span>{fmt(tot.withVat.net)} + {fmt(tot.withVat.vat)} = <strong className="text-ink">{fmt(tot.withVat.gross)}</strong></span>
                </div>
              )}
              <div className="flex justify-between text-ink-muted">
                <span>{showVat ? d.withoutVat : d.invoicesLabel} ({tot.withoutVat.count + (showVat ? 0 : tot.withVat.count)})</span>
                <strong className="text-ink">{fmt(showVat ? tot.withoutVat.gross : tot.withoutVat.gross + tot.withVat.gross)}</strong>
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[860px]">
            <thead className="bg-surface-sunken">
              <tr>
                <th className={th}>{d.invoice}</th>
                <th className={th}>{d.date}</th>
                <th className={th}>{d.client}</th>
                <th className={th}>{d.status}</th>
                <th className={`${th} text-end`}>{showVat ? d.net : d.amount}</th>
                {showVat && <th className={`${th} text-end`}>{d.vat}</th>}
                {showVat && <th className={`${th} text-end`}>{d.gross}</th>}
                <th className={`${th} text-end`}>{d.paid}</th>
                <th className={`${th} text-end`}>{d.due}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {visible.map((inv) => (
                <tr key={inv.id}>
                  <td className={td}>
                    <Link href={ROUTES.invoices.detail(inv.id)} className="font-mono text-accent hover:underline">{inv.number}</Link>
                  </td>
                  <td className={`${td} text-ink-muted`}>{inv.issueDate}</td>
                  <td className={`${td} text-ink max-w-[220px] truncate`}>{inv.client || "—"}</td>
                  <td className={`${td} text-ink-muted`}>{inv.status.replace("_", " ")}</td>
                  <td className={`${td} text-end text-ink`}>{inv.currency} {fmt(inv.net)}</td>
                  {showVat && <td className={`${td} text-end text-ink-muted`}>{inv.vatApplied ? fmt(inv.vat) : "—"}</td>}
                  {showVat && <td className={`${td} text-end text-ink`}>{fmt(inv.gross)}</td>}
                  <td className={`${td} text-end text-emerald-600`}>{fmt(inv.paid)}</td>
                  <td className={`${td} text-end ${inv.due > 0 ? "text-rose-600 font-semibold" : "text-ink-muted"}`}>{fmt(inv.due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {register.length > 25 && (
          <div className="p-3 text-center border-t border-ink/5">
            <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs font-semibold text-accent hover:underline">
              {showAll ? d.showLess : d.showAll.replace("{count}", String(register.length))}
            </button>
          </div>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={d.costsByCategory} hint={d.costsHint}>
          <ul className="px-5 pb-5 space-y-2.5">
            {detail.expensesByCategory.map((c) => (
              <li key={c.id ?? "none"} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-ink">
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    {locale === "ar" ? c.nameAr : c.nameEn}
                    <span className="text-ink-muted">({c.count})</span>
                  </span>
                  <span className="font-semibold text-ink">BHD {fmt(c.net)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(c.net / maxCategory) * 100}%`, background: c.color }} />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <div className="space-y-6">
          <Section title={d.costStructure}>
            <dl className="px-5 pb-5 grid grid-cols-2 gap-3 text-xs">
              {(["cost_of_sales", "operating", "payroll"] as const).map((k) => (
                <div key={k} className="rounded-2xl bg-surface-sunken p-3">
                  <dt className="text-ink-muted">{t.expenseMeta.kinds[k]}</dt>
                  <dd className="text-base font-bold text-ink mt-1">BHD {fmt(detail.expensesByKind[k])}</dd>
                </div>
              ))}
              {(["deal", "client", "internal"] as const).map((s) => (
                <div key={s} className="rounded-2xl border border-ink/10 p-3">
                  <dt className="text-ink-muted">{d.recordedAgainst} · {t.expenseMeta.scopes[s]}</dt>
                  <dd className="text-sm font-bold text-ink mt-1">BHD {fmt(detail.expensesByScope[s])}</dd>
                </div>
              ))}
              <div className="rounded-2xl border border-ink/10 p-3 col-span-2">
                <dt className="text-ink-muted">{d.claims}</dt>
                <dd className="text-sm text-ink mt-1">
                  {d.claimsPaid.replace("{count}", String(detail.claims.paidCount))}: <strong>BHD {fmt(detail.claims.paidAmount)}</strong>
                  {" · "}
                  {d.claimsOutstanding}: <strong>BHD {fmt(detail.claims.outstandingAmount)}</strong>
                </dd>
              </div>
            </dl>
          </Section>

          {showVat && (
            <Section title={d.vatTitle} hint={d.vatHint}>
              <dl className="px-5 pb-5 space-y-2 text-xs">
                <div className="flex justify-between"><dt className="text-ink-muted">{d.outputVat}</dt><dd className="font-semibold text-ink">BHD {fmt(detail.vat.output)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">{d.inputRecoverable}</dt><dd className="font-semibold text-ink">− BHD {fmt(detail.vat.inputRecoverable)}</dd></div>
                <div className="flex justify-between border-t border-ink/10 pt-2"><dt className="font-bold text-ink">{d.netVatPayable}</dt><dd className={`font-bold ${detail.vat.netPayable >= 0 ? "text-rose-600" : "text-emerald-600"}`}>BHD {fmt(detail.vat.netPayable)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">{d.inputNonRecoverable}</dt><dd className="text-ink">BHD {fmt(detail.vat.inputNonRecoverable)}</dd></div>
              </dl>
            </Section>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={d.topClients} hint={d.netHint}>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-ink/5">
              {detail.revenueByClient.map((c, i) => (
                <tr key={c.clientId}>
                  <td className="p-3 ps-5 text-ink-muted w-8">{i + 1}</td>
                  <td className="p-3"><Link href={ROUTES.crm.customer(c.clientId)} className="text-ink hover:text-accent">{c.name}</Link></td>
                  <td className="p-3 text-ink-muted">{d.invoiceCount.replace("{count}", String(c.invoices))}</td>
                  <td className="p-3 pe-5 text-end font-semibold text-ink">BHD {fmt(c.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title={d.dealProfitability} hint={d.dealHint}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead className="bg-surface-sunken">
                <tr>
                  <th className={th}>{d.deal}</th>
                  <th className={`${th} text-end`}>{d.revenueNet}</th>
                  <th className={`${th} text-end`}>{d.costs}</th>
                  <th className={`${th} text-end`}>{d.margin}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {detail.dealProfitability.map((deal) => (
                  <tr key={deal.dealId}>
                    <td className={`${td} max-w-[200px] truncate`}><Link href={ROUTES.crm.deal(deal.dealId)} className="text-ink hover:text-accent">{deal.title}</Link></td>
                    <td className={`${td} text-end text-ink`}>{fmt(deal.revenueNet)}</td>
                    <td className={`${td} text-end text-ink-muted`}>{fmt(deal.costsNet)}</td>
                    <td className={`${td} text-end font-semibold ${deal.margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(deal.margin)} <span className="text-ink-muted font-normal">({deal.marginPercent}%)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
