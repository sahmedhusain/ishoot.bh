"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, ChevronLeft, ChevronRight, Clock, Receipt, Wallet } from "lucide-react";
import { Button, Card, DateDisplay } from "@platform/ui";
import type { getPayrollItemDetail } from "@platform/database/queries/payroll";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { payPayrollItemAction, setPayrollLinesAction } from "../../app/actions/payroll";
import { PayLinesEditor, toPayLineDraft, type PayLineDraft } from "./PayLinesEditor";

type Detail = NonNullable<Awaited<ReturnType<typeof getPayrollItemDetail>>>;

interface Summary {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  unmarkedDays: number;
  notEmployedDays: number;
  lateMinutes: number;
  deductibleLateMinutes: number;
  overtime: { normal: number; night: number; restDay: number; holiday: number };
  shifts: Record<string, number>;
  leave: Record<string, { days: number; unpaidDays: number }>;
  warnings: string[];
  dailyRate?: number;
  hourlyOvertimeRate?: number;
}

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/20 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);

function useMoney() {
  const { locale, t } = useAdminLocale();
  const format = React.useMemo(() => new Intl.NumberFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { minimumFractionDigits: 3, maximumFractionDigits: 3 }), [locale]);
  return function money(value: number) {
    return (
      <bdi dir="ltr" className="whitespace-nowrap tabular-nums">
        {format.format(value)} <span className="text-[0.8em] font-normal opacity-70">{t.shared.bhd}</span>
      </bdi>
    );
  };
}

function Line({ label, detail, value, tone = "default", strong = false }: { label: string; detail?: string | null; value: React.ReactNode; tone?: "default" | "minus" | "plus"; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2 ${strong ? "border-t border-ink/15 pt-3 mt-1" : ""}`}>
      <div className="min-w-0">
        <p className={`text-sm ${strong ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>{label}</p>
        {detail && <p className="text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      <span className={`shrink-0 text-sm ${strong ? "font-bold text-slate-900 dark:text-white" : tone === "minus" ? "text-rose-700 dark:text-rose-400" : tone === "plus" ? "text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}`}>
        {tone === "minus" ? <bdi dir="ltr">−{value}</bdi> : value}
      </span>
    </div>
  );
}

export function PayrollItemView({ detail, canEdit, canPay }: { detail: Detail; canEdit: boolean; canPay: boolean }) {
  const { t, locale, isRTL } = useAdminLocale();
  const p = t.payrollItem;
  const router = useRouter();
  const money = useMoney();
  const { item, run, employee } = detail;
  const summary = (item.attendanceSummary ?? null) as Summary | null;
  const editable = canEdit && (run.status === "draft" || run.status === "calculated");
  const payable = canPay && run.status === "approved" && item.paymentStatus !== "paid";
  const name = locale === "ar" ? `${employee.firstNameAr} ${employee.lastNameAr}` : `${employee.firstNameEn} ${employee.lastNameEn}`;
  const monthLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(run.year, run.month - 1, 1)));
  const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

  const manual = detail.lines.filter((l) => l.source === "manual");
  const recurringLines = detail.lines.filter((l) => l.source === "recurring");
  const [additions, setAdditions] = React.useState<PayLineDraft[]>(() => manual.filter((l) => l.kind === "addition").map(toPayLineDraft));
  const [deductions, setDeductions] = React.useState<PayLineDraft[]>(() => manual.filter((l) => l.kind === "deduction").map(toPayLineDraft));
  const [note, setNote] = React.useState(item.adjustmentNote ?? "");
  const [saving, setSaving] = React.useState(false);
  const [method, setMethod] = React.useState("bank_transfer");
  const [reference, setReference] = React.useState("");
  const [paidOn, setPaidOn] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [paying, setPaying] = React.useState(false);

  const fixed = item.basicSalary + item.housingAllowance + item.transportAllowance + item.otherAllowances;
  const totalDeductions = item.gosiEmployee + item.absenceDeduction + item.leaveDeduction + item.latenessDeduction + item.otherDeductions;
  const absenceDays = summary ? summary.absentDays : null;

  const saveAdjustments = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const pack = (lines: PayLineDraft[]) => lines.map((l) => ({ category: l.category, label: l.label, amount: Number(l.amount), ...(l.note.trim() ? { note: l.note.trim() } : {}) }));
      await setPayrollLinesAction(item.id, { additions: pack(additions), deductions: pack(deductions), note: note.trim() || null });
      toast.success(p.saved);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, p.saved));
    } finally {
      setSaving(false);
    }
  };

  const pay = async (event: React.FormEvent) => {
    event.preventDefault();
    setPaying(true);
    try {
      const result = await payPayrollItemAction(item.id, { method, reference: reference.trim() || null, paidOn });
      toast.success(result.runStatus === "paid" ? `${p.paymentSaved} · ${p.runPaid}` : p.paymentSaved);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, p.payNow));
    } finally {
      setPaying(false);
    }
  };

  const Prev = isRTL ? ChevronRight : ChevronLeft;
  const Next = isRTL ? ChevronLeft : ChevronRight;
  const Back = isRTL ? ArrowRight : ArrowLeft;
  const leaveName = (code: string) => detail.leaves.find((l) => l.type.code === code)?.type[locale === "ar" ? "nameAr" : "nameEn"] ?? code;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <nav className="flex flex-wrap items-center gap-2">
        <Link href={ROUTES.hr.payroll({ highlight: run.id })} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-ink/[0.06] dark:text-slate-200">
          <Back className="w-3.5 h-3.5" />
          {p.back}
        </Link>
        <span className="ms-auto flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
          {detail.previousId ? (
            <Link href={ROUTES.hr.payrollItem(detail.previousId)} aria-label={p.previous} className="rounded-full p-1.5 hover:bg-ink/[0.06]"><Prev className="w-4 h-4" /></Link>
          ) : <span className="p-1.5 opacity-30"><Prev className="w-4 h-4" /></span>}
          {fill(p.of, { index: detail.position.index, total: detail.position.total })}
          {detail.nextId ? (
            <Link href={ROUTES.hr.payrollItem(detail.nextId)} aria-label={p.next} className="rounded-full p-1.5 hover:bg-ink/[0.06]"><Next className="w-4 h-4" /></Link>
          ) : <span className="p-1.5 opacity-30"><Next className="w-4 h-4" /></span>}
        </span>
      </nav>

      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-xs font-medium text-primary dark:text-accent">{monthLabel}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{name}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            <bdi dir="ltr">{employee.employeeNumber}</bdi> · {locale === "ar" ? employee.jobTitleAr : employee.jobTitleEn}
            {employee.department && ` · ${locale === "ar" ? employee.department.nameAr : employee.department.nameEn}`}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex gap-1"><dt>{p.window}:</dt><dd><bdi dir="ltr">{run.attendanceStart} → {run.attendanceEnd}</bdi></dd></div>
            {run.payDate && <div className="flex gap-1"><dt>{p.payDate}:</dt><dd><DateDisplay date={run.payDate} locale={locale} /></dd></div>}
            <div className="flex gap-1"><dt>{p.joined}:</dt><dd><DateDisplay date={employee.hireDate} locale={locale} /></dd></div>
          </dl>
        </div>
        <Card className="w-full space-y-1 p-5 sm:w-auto sm:min-w-56 dark:bg-surface-raised">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{p.net}</p>
          <p className="text-3xl font-bold text-primary dark:text-accent">{money(item.netSalary)}</p>
          <p className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${item.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            {item.paymentStatus === "paid" ? <BadgeCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {item.paymentStatus === "paid" ? t.payroll.statusPaid : t.payroll.statusPending}
          </p>
        </Card>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 dark:bg-surface-raised">
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{p.earnings}</h2>
          <div className="divide-y divide-ink/5">
            <Line label={p.basic} value={money(item.basicSalary)} />
            {item.housingAllowance > 0 && <Line label={p.housing} value={money(item.housingAllowance)} />}
            {item.transportAllowance > 0 && <Line label={p.transport} value={money(item.transportAllowance)} />}
            {item.otherAllowances > 0 && <Line label={p.other} value={money(item.otherAllowances)} />}
            {item.overtimePay > 0 && (
              <Line
                label={p.overtimePay}
                tone="plus"
                detail={summary ? fill(p.overtimeDetail, { normal: hours(summary.overtime.normal), night: hours(summary.overtime.night), rest: hours(summary.overtime.restDay), holiday: hours(summary.overtime.holiday) }) : null}
                value={money(item.overtimePay)}
              />
            )}
            {item.shiftAllowance > 0 && (
              <Line label={p.shiftAllowance} tone="plus" detail={summary ? Object.entries(summary.shifts).map(([code, count]) => `${code} × ${count}`).join(" · ") : null} value={money(item.shiftAllowance)} />
            )}
            {item.commission > 0 && (
              <Line label={p.commission} tone="plus" detail={detail.commission ? fill(p.commissionDetail, { rate: detail.commission.ratePercent, basis: detail.commission.basis.toFixed(3) }) : null} value={money(item.commission)} />
            )}
            {detail.lines.filter((l) => l.kind === "addition").map((l) => (
              <Line key={l.id} label={l.label} tone="plus" detail={[(t.payLines.categories as Record<string, string>)[l.category], l.source === "recurring" ? t.payLines.recurringTag : null, l.note].filter(Boolean).join(" · ")} value={money(l.amount)} />
            ))}
            {item.bonus > 0 && !detail.lines.some((l) => l.kind === "addition") && <Line label={p.bonus} tone="plus" detail={item.adjustmentNote} value={money(item.bonus)} />}
            <Line label={p.gross} strong value={money(item.grossSalary)} />
          </div>
        </Card>

        <Card className="p-5 dark:bg-surface-raised">
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">{p.deductionsTitle}</h2>
          <div className="divide-y divide-ink/5">
            <Line label={p.contribution} tone="minus" value={money(item.gosiEmployee)} />
            {item.absenceDeduction > 0 && (
              <Line
                label={p.absence}
                tone="minus"
                detail={[
                  absenceDays ? fill(p.absenceDetail, { days: absenceDays, rate: (summary?.dailyRate ?? 0).toFixed(3) }) : null,
                  summary?.notEmployedDays ? fill(p.notEmployed, { days: summary.notEmployedDays }) : null,
                ].filter(Boolean).join(" · ") || null}
                value={money(item.absenceDeduction)}
              />
            )}
            {item.leaveDeduction > 0 && (
              <Line
                label={p.leaveDeduction}
                tone="minus"
                detail={summary ? fill(p.leaveDetail, { days: Object.values(summary.leave).reduce((s, l) => s + l.unpaidDays, 0) }) : null}
                value={money(item.leaveDeduction)}
              />
            )}
            {item.latenessDeduction > 0 && (
              <Line label={p.lateness} tone="minus" detail={summary ? fill(p.latenessDetail, { minutes: summary.deductibleLateMinutes }) : null} value={money(item.latenessDeduction)} />
            )}
            {detail.lines.filter((l) => l.kind === "deduction").map((l) => (
              <Line key={l.id} label={l.label} tone="minus" detail={[(t.payLines.categories as Record<string, string>)[l.category], l.source === "recurring" ? t.payLines.recurringTag : null, l.note].filter(Boolean).join(" · ")} value={money(l.amount)} />
            ))}
            {item.otherDeductions > 0 && !detail.lines.some((l) => l.kind === "deduction") && <Line label={p.otherDeductions} tone="minus" detail={item.adjustmentNote} value={money(item.otherDeductions)} />}
            <Line label={p.totalDeductions} strong value={money(totalDeductions)} />
          </div>
          <div className="mt-4 rounded-xl bg-surface-sunken p-3">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">{p.employerTitle}</h3>
            <div className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between gap-2"><span>{p.employerContribution}</span>{money(item.gosiEmployer)}</div>
              {item.externalSupport > 0 && <div className="flex justify-between gap-2"><span>{p.support}</span><bdi dir="ltr">−{money(item.externalSupport)}</bdi></div>}
              <div className="flex justify-between gap-2 font-semibold text-slate-800 dark:text-slate-100"><span>{p.employerCost}</span>{money(item.grossSalary + item.gosiEmployer - item.externalSupport)}</div>
            </div>
          </div>
        </Card>
      </div>

      {summary && (
        <Card className="space-y-4 p-5 dark:bg-surface-raised">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><CalendarDays className="w-4 h-4" />{p.attendanceTitle}</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              [p.workingDays, summary.workingDays],
              [p.present, summary.presentDays],
              [p.absentDays, summary.absentDays],
              [p.halfDays, summary.halfDays],
              [p.unmarked, summary.unmarkedDays],
              [p.lateMinutes, summary.lateMinutes],
              [p.dailyRate, (summary.dailyRate ?? fixed / 30).toFixed(3)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-surface-sunken p-3">
                <dt className="text-[11px] text-slate-600 dark:text-slate-400">{label}</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-white"><bdi dir="ltr">{value}</bdi></dd>
              </div>
            ))}
          </dl>
          {Object.keys(summary.leave).length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{p.leaveTaken}</h3>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(summary.leave).map(([code, leave]) => (
                  <li key={code} className="rounded-full border border-ink/15 px-3 py-1 text-xs text-slate-700 dark:text-slate-200">
                    {leaveName(code)}: <bdi dir="ltr">{leave.days}</bdi>
                    {leave.unpaidDays > 0 && <span className="text-rose-700 dark:text-rose-400"> · {fill(p.unpaidOf, { unpaid: leave.unpaidDays, days: leave.days })}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.warnings.length > 0 && (
            <ul className="space-y-1">
              {Array.from(new Set(summary.warnings.map((w) => w.split(":")[0]))).map((w) => {
                const text = w === "unmarked_days" ? p.warnings.unmarked : w === "deductions_capped" ? p.warnings.capped : w === "no_paid_days" ? p.warnings.noPaid : w === "on_leave_without_request" ? p.warnings.onLeave : null;
                return text ? (
                  <li key={w} className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" />{text}
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {editable && (
          <Card className="p-5 dark:bg-surface-raised">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{p.adjustments}</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{p.adjustmentsHint}</p>
            <form onSubmit={saveAdjustments} className="mt-3 space-y-3">
              <PayLinesEditor kind="addition" lines={additions} onChange={setAdditions} />
              <PayLinesEditor kind="deduction" lines={deductions} onChange={setDeductions} />
              {recurringLines.length > 0 && <p className="text-[11px] text-slate-500">{formatMessage(t.payLines.recurringNote, { count: String(recurringLines.length) })}</p>}
              <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                {t.payLines.generalNote}
                <input maxLength={500} className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" disabled={saving}>{p.saveAdjustments}</Button>
                {detail.editedBy && <span className="text-[11px] text-slate-500">{fill(p.lastEdited, { name: detail.editedBy })}</span>}
              </div>
            </form>
          </Card>
        )}

        <Card className="p-5 dark:bg-surface-raised">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Wallet className="w-4 h-4" />{p.payment}</h2>
          {item.paymentStatus === "paid" ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-slate-400">{p.paidOn}</dt><dd>{item.paidAt ? <DateDisplay date={item.paidAt} locale={locale} /> : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-slate-400">{p.method}</dt><dd>{item.paymentMethod ? t.payroll.methods[item.paymentMethod as keyof typeof t.payroll.methods] ?? item.paymentMethod : "—"}</dd></div>
              {item.paymentReference && <div className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-slate-400">{p.reference}</dt><dd><bdi dir="ltr">{item.paymentReference}</bdi></dd></div>}
              {detail.paidBy && <p className="text-[11px] text-slate-500">{fill(p.paidBy, { name: detail.paidBy })}</p>}
              {detail.payslipId && <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><Receipt className="w-3.5 h-3.5" />{p.payslipIssued}</p>}
            </dl>
          ) : payable ? (
            <form onSubmit={pay} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {p.method}
                  <select className={fieldClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                    {Object.entries(t.payroll.methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {p.paidOn}
                  <input type="date" required className={fieldClass} max={new Date().toISOString().slice(0, 10)} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                </label>
              </div>
              <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                {p.reference}
                <input maxLength={120} dir="ltr" className={fieldClass} value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
              <Button type="submit" size="sm" disabled={paying}>{p.payNow} · {money(item.netSalary)}</Button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{p.notApproved}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 dark:bg-surface-raised">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{p.log}</h2>
          {detail.attendance.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">{p.logEmpty}</p>
          ) : (
            <div className="mt-2 max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-ink/5">
                  {detail.attendance.map((day) => (
                    <tr key={day.date}>
                      <td className="py-1.5 pe-2"><DateDisplay date={day.date} locale={locale} /></td>
                      <td className="py-1.5 pe-2">{p.statuses[day.status as keyof typeof p.statuses] ?? day.status}</td>
                      <td className="py-1.5 pe-2 text-slate-600 dark:text-slate-400">
                        {[day.lateMinutes ? `${t.attendance.late}: ${day.lateMinutes}` : null,
                        day.overtimeMinutes + day.overtimeNightMinutes + day.overtimeRestDayMinutes + day.overtimeHolidayMinutes
                          ? `${t.payroll.overtime}: ${fill(t.payroll.hoursShort, { n: hours(day.overtimeMinutes + day.overtimeNightMinutes + day.overtimeRestDayMinutes + day.overtimeHolidayMinutes) })}`
                          : null,
                        day.shift ? (locale === "ar" ? day.shift.nameAr : day.shift.nameEn) : null].filter(Boolean).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card className="p-5 dark:bg-surface-raised">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{p.leavesTitle}</h2>
          {detail.leaves.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">{p.noLeave}</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink/5">
              {detail.leaves.map((leave) => (
                <li key={leave.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{locale === "ar" ? leave.type.nameAr : leave.type.nameEn}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    <bdi dir="ltr">{leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} → ${leave.endDate}`}</bdi>
                    {" · "}{p.portion[leave.dayPortion as keyof typeof p.portion] ?? leave.dayPortion}{" · "}<bdi dir="ltr">{leave.days}</bdi> {t.shared.days}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
