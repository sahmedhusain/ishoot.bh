"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Clock, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button, Card, ConfirmDestructiveModal, DateDisplay, Modal } from "@ishoot/ui";
import type { HrPolicyRules } from "@ishoot/database/hr/payroll-engine";
import { payrollWindow } from "@ishoot/database/hr/payroll-engine";
import type { LeaveTypeView, ShiftTypeView } from "@ishoot/database/queries/hr-settings";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  deletePublicHolidayAction,
  saveLeaveTypeAction,
  savePublicHolidayAction,
  saveShiftTypeAction,
  updateHrPolicyAction,
} from "../../app/actions/hr-settings";

type Tab = "policy" | "leave" | "holidays" | "shifts";
type Holiday = { id: string; date: string; nameEn: string; nameAr: string };

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/20 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";
const labelClass = "block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200";
const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 p-5 dark:bg-surface-raised">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">{icon}{title}</h2>
      {children}
    </Card>
  );
}

function Choice({ name, value, current, onChange, children }: { name: string; value: string; current: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const on = value === current;
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent/40 ${on ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-700 dark:text-slate-300"}`}>
      <input type="radio" name={name} value={value} checked={on} onChange={() => onChange(value)} className="mt-0.5 accent-accent" />
      <span>{children}</span>
    </label>
  );
}

function PolicyForm({ policy, editable }: { policy: HrPolicyRules; editable: boolean }) {
  const { t, locale } = useAdminLocale();
  const h = t.hrSettings;
  const router = useRouter();
  const [form, setForm] = React.useState(policy);
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof HrPolicyRules>(key: K, value: HrPolicyRules[K]) => setForm((f) => ({ ...f, [key]: value }));

  const example = React.useMemo(() => {
    const now = new Date();
    const w = payrollWindow({ ...form, attendanceCutoffDay: form.attendanceCutoffDay }, now.getUTCFullYear(), now.getUTCMonth() + 1);
    const d = (date: Date) => new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
    const month = new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { month: "long", timeZone: "UTC" }).format(w.salaryStart);
    return form.salaryTiming === "arrears"
      ? fill(h.exampleArrears, { payDate: d(w.payDate), month })
      : fill(h.exampleCurrent, { payDate: d(w.payDate), month, start: d(w.attendanceStart), end: d(w.attendanceEnd) });
  }, [form, locale, h]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateHrPolicyAction(form);
      toast.success(h.saved);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, h.save));
    } finally {
      setSaving(false);
    }
  };

  const number = (key: keyof HrPolicyRules, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      type="number"
      dir="ltr"
      inputMode="decimal"
      className={fieldClass}
      disabled={!editable}
      value={form[key] == null ? "" : String(form[key])}
      onChange={(e) => set(key, (e.target.value === "" ? null : Number(e.target.value)) as never)}
      {...props}
    />
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={!editable} className="space-y-4">
        <Section title={h.timing} icon={<Wallet className="w-4 h-4" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice name="timing" value="arrears" current={form.salaryTiming} onChange={(v) => set("salaryTiming", v as HrPolicyRules["salaryTiming"])}>{h.arrears}</Choice>
            <Choice name="timing" value="current" current={form.salaryTiming} onChange={(v) => set("salaryTiming", v as HrPolicyRules["salaryTiming"])}>{h.current}</Choice>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>{h.payDay}{number("payDay", { min: 1, max: 31, step: 1 })}</label>
            {form.salaryTiming === "current" && (
              <label className={labelClass}>
                {h.cutoff}
                {number("attendanceCutoffDay", { min: 1, max: 28, step: 1, placeholder: String(Math.max(1, Math.min(28, form.payDay - 1))) })}
                <span className="block text-[11px] font-normal text-slate-500">{h.cutoffHint}</span>
              </label>
            )}
          </div>
          <p className="rounded-xl bg-surface-sunken px-3 py-2 text-xs text-slate-700 dark:text-slate-300">{fill(h.example, { example })}</p>
        </Section>

        <Section title={h.week} icon={<CalendarDays className="w-4 h-4" />}>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">{h.weekendDays}</legend>
            <div className="flex flex-wrap gap-1.5">
              {h.weekdays.map((dayName: string, index: number) => {
                const on = form.weekendDays.includes(index);
                return (
                  <label key={index} className={`cursor-pointer rounded-full border px-3 py-1 text-xs focus-within:ring-2 focus-within:ring-accent/40 ${on ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 dark:text-slate-300"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set("weekendDays", on ? form.weekendDays.filter((d) => d !== index) : [...form.weekendDays, index])} />
                    {dayName}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>{h.workdayHours}{number("workdayHours", { min: 1, max: 16, step: 0.5 })}</label>
            <label className={labelClass}>
              {t.attendance.checkIn}
              <input type="time" dir="ltr" className={fieldClass} value={form.workdayStart} onChange={(e) => set("workdayStart", e.target.value)} />
            </label>
          </div>
        </Section>

        <Section title={h.rates}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              {h.dailyRateBasis}
              <select className={fieldClass} value={form.dailyRateBasis} onChange={(e) => set("dailyRateBasis", e.target.value as HrPolicyRules["dailyRateBasis"])}>
                <option value="30">{h.basis30}</option>
                <option value="calendar_days">{h.basisCalendar}</option>
                <option value="working_days">{h.basisWorking}</option>
              </select>
            </label>
            <label className={labelClass}>
              {h.deductionBase}
              <select className={fieldClass} value={form.deductionBase} onChange={(e) => set("deductionBase", e.target.value as HrPolicyRules["deductionBase"])}>
                <option value="fixed">{h.baseFixed}</option>
                <option value="basic">{h.baseBasic}</option>
              </select>
            </label>
            <label className={labelClass}>
              {h.unmarked}
              <select className={fieldClass} value={form.unmarkedDays} onChange={(e) => set("unmarkedDays", e.target.value as HrPolicyRules["unmarkedDays"])}>
                <option value="present">{h.unmarkedPresent}</option>
                <option value="absent">{h.unmarkedAbsent}</option>
              </select>
            </label>
          </div>
        </Section>

        <Section title={h.overtime} icon={<Clock className="w-4 h-4" />}>
          <div className="grid gap-3 sm:grid-cols-5">
            <label className={labelClass}>
              {h.overtimeBase}
              <select className={fieldClass} value={form.overtimeBase} onChange={(e) => set("overtimeBase", e.target.value as HrPolicyRules["overtimeBase"])}>
                <option value="basic">{h.baseBasic}</option>
                <option value="fixed">{h.baseFixed}</option>
              </select>
            </label>
            <label className={labelClass}>{h.otNormal}{number("overtimeRate", { min: 1, max: 5, step: 0.05 })}</label>
            <label className={labelClass}>{h.otNight}{number("overtimeNightRate", { min: 1, max: 5, step: 0.05 })}</label>
            <label className={labelClass}>{h.otRest}{number("overtimeRestDayRate", { min: 1, max: 5, step: 0.05 })}</label>
            <label className={labelClass}>{h.otHoliday}{number("overtimeHolidayRate", { min: 1, max: 5, step: 0.05 })}</label>
          </div>
        </Section>

        <Section title={h.lateness}>
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" role="switch" className="accent-accent" checked={form.deductLateness} onChange={(e) => set("deductLateness", e.target.checked)} />
              {h.deductLateness}
            </label>
            <label className={labelClass}>{h.grace}{number("lateGraceMinutes", { min: 0, max: 240, step: 1 })}</label>
          </div>
        </Section>

        <Section title={h.other}>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" role="switch" className="accent-accent" checked={form.prorateJoiners} onChange={(e) => set("prorateJoiners", e.target.checked)} />
            {h.prorate}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" role="switch" className="accent-accent" checked={form.commissionInPayroll} onChange={(e) => set("commissionInPayroll", e.target.checked)} />
            {h.commission}
          </label>
        </Section>
      </fieldset>
      {editable && (
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" disabled={saving} className="shadow-lg">{h.save}</Button>
        </div>
      )}
    </form>
  );
}

const emptyLeaveType = (order: number): LeaveTypeView => ({
  id: "", code: "", nameEn: "", nameAr: "", isPaid: true, payPercent: 100, payTiers: null, accrual: "annual", daysAllowedPerYear: 0,
  eligibleAfterMonths: 0, maxCarryOverDays: 0, maxDaysPerRequest: null, allowHalfDay: true, allowHours: false, countCalendarDays: false,
  requiresAttachment: false, isActive: true, sortOrder: order,
});

function LeaveTypeForm({ value, onClose }: { value: LeaveTypeView; onClose: () => void }) {
  const { t } = useAdminLocale();
  const h = t.hrSettings;
  const router = useRouter();
  const [form, setForm] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof LeaveTypeView>(key: K, v: LeaveTypeView[K]) => setForm((f) => ({ ...f, [key]: v }));
  const tiers = form.payTiers ?? [];

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveLeaveTypeAction({ ...form, id: form.id || null, payTiers: tiers.length ? tiers : null });
      toast.success(h.typeSaved);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, h.saveType));
    } finally {
      setSaving(false);
    }
  };
  const num = (key: keyof LeaveTypeView, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input type="number" dir="ltr" className={fieldClass} value={form[key] == null ? "" : String(form[key])} onChange={(e) => set(key, (e.target.value === "" ? null : Number(e.target.value)) as never)} {...props} />
  );

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>{h.code}<input required dir="ltr" maxLength={40} className={fieldClass} value={form.code} onChange={(e) => set("code", e.target.value)} /></label>
        <label className={labelClass}>{h.nameEn}<input required maxLength={80} className={fieldClass} value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></label>
        <label className={labelClass}>{h.nameAr}<input maxLength={80} dir="rtl" className={fieldClass} value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          {h.accrual}
          <select className={fieldClass} value={form.accrual} onChange={(e) => set("accrual", e.target.value as LeaveTypeView["accrual"])}>
            <option value="annual">{h.accrualAnnual}</option>
            <option value="monthly">{h.accrualMonthly}</option>
            <option value="none">{h.accrualNone}</option>
          </select>
        </label>
        {form.accrual !== "none" && <label className={labelClass}>{h.daysPerYear}{num("daysAllowedPerYear", { min: 0, max: 366, step: 0.5, required: true })}</label>}
        {form.accrual !== "none" && <label className={labelClass}>{h.carryOver}{num("maxCarryOverDays", { min: 0, max: 366, step: 0.5 })}</label>}
        <label className={labelClass}>{h.eligibleAfter}{num("eligibleAfterMonths", { min: 0, max: 120, step: 1 })}</label>
        <label className={labelClass}>{h.maxPerRequest}{num("maxDaysPerRequest", { min: 0.5, max: 366, step: 0.5 })}</label>
        <label className={labelClass}>{h.order}{num("sortOrder", { min: 0, max: 999, step: 1 })}</label>
      </div>
      <fieldset className="space-y-2 rounded-xl border border-ink/10 p-3">
        <legend className="px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{h.pay}</legend>
        {tiers.length === 0 ? (
          <label className={labelClass}>{h.payPercent} (%){num("payPercent", { min: 0, max: 100, step: 1 })}</label>
        ) : (
          <ul className="space-y-2">
            {tiers.map((tier, index) => (
              <li key={index} className="flex flex-wrap items-end gap-2">
                <label className={`${labelClass} w-32`}>{h.bandUpTo}<input type="number" dir="ltr" min={1} step={0.5} className={fieldClass} value={tier.upToDays} onChange={(e) => set("payTiers", tiers.map((x, i) => (i === index ? { ...x, upToDays: Number(e.target.value) } : x)))} /></label>
                <label className={`${labelClass} w-28`}>{h.bandPercent}<input type="number" dir="ltr" min={0} max={100} step={1} className={fieldClass} value={tier.percent} onChange={(e) => set("payTiers", tiers.map((x, i) => (i === index ? { ...x, percent: Number(e.target.value) } : x)))} /></label>
                <Button type="button" variant="ghost" size="sm" aria-label={h.delete} onClick={() => set("payTiers", tiers.filter((_, i) => i !== index))}><Trash2 className="w-3.5 h-3.5" /></Button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => set("payTiers", [...tiers, { upToDays: (tiers.at(-1)?.upToDays ?? 0) + 15, percent: tiers.length ? 50 : 100 }])}>
          <Plus className="w-3.5 h-3.5" />{h.addBand}
        </Button>
      </fieldset>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-200">
        {([["allowHalfDay", h.allowHalf], ["allowHours", h.allowHours], ["countCalendarDays", h.calendarDays], ["requiresAttachment", h.attachment], ["isActive", h.active]] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input type="checkbox" className="accent-accent" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
            {label}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{h.cancel}</Button>
        <Button type="submit" size="sm" disabled={saving}>{h.saveType}</Button>
      </div>
    </form>
  );
}

function LeaveTypes({ leaveTypes, editable }: { leaveTypes: LeaveTypeView[]; editable: boolean }) {
  const { t, locale } = useAdminLocale();
  const h = t.hrSettings;
  const [editing, setEditing] = React.useState<LeaveTypeView | null>(null);
  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setEditing(emptyLeaveType(leaveTypes.length + 1))}><Plus className="w-3.5 h-3.5" />{h.addLeaveType}</Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {leaveTypes.map((type) => (
          <Card key={type.id} className={`space-y-2 p-4 dark:bg-surface-raised ${type.isActive ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{locale === "ar" ? type.nameAr : type.nameEn}</h3>
                <p className="text-[11px] text-slate-500"><bdi dir="ltr">{type.code}</bdi>{!type.isActive && ` · ${h.inactive}`}</p>
              </div>
              {editable && <Button type="button" variant="ghost" size="sm" aria-label={h.edit} onClick={() => setEditing(type)}><Pencil className="w-3.5 h-3.5" /></Button>}
            </div>
            <ul className="flex flex-wrap gap-1.5 text-[11px]">
              <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">
                {type.payTiers?.length ? `${h.payBands}: ${type.payTiers.map((b) => `≤${b.upToDays} → ${b.percent}%`).join(" · ")}` : `${h.payPercent} ${type.payPercent}%`}
              </li>
              <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">
                {type.accrual === "none" ? h.accrualNone : `${type.accrual === "monthly" ? h.accrualMonthly : h.accrualAnnual} · ${type.daysAllowedPerYear}`}
              </li>
              {type.maxCarryOverDays > 0 && <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">{h.carryOver} {type.maxCarryOverDays}</li>}
              {type.eligibleAfterMonths > 0 && <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">{h.eligibleAfter} {type.eligibleAfterMonths}</li>}
              {type.allowHalfDay && <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">{h.allowHalf}</li>}
              {type.allowHours && <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">{h.allowHours}</li>}
              {type.countCalendarDays && <li className="rounded-full bg-surface-sunken px-2 py-0.5 text-slate-700 dark:text-slate-300">{h.calendarDays}</li>}
            </ul>
          </Card>
        ))}
      </div>
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? h.edit : h.addLeaveType} closeLabel={h.cancel} className="max-w-2xl">
        {editing && <LeaveTypeForm value={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function Holidays({ holidays, year, editable }: { holidays: Holiday[]; year: number; editable: boolean }) {
  const { t, locale } = useAdminLocale();
  const h = t.hrSettings;
  const router = useRouter();
  const [form, setForm] = React.useState({ date: "", nameEn: "", nameAr: "" });
  const [deleting, setDeleting] = React.useState<Holiday | null>(null);
  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await savePublicHolidayAction(form);
      toast.success(h.holidaySaved);
      setForm({ date: "", nameEn: "", nameAr: "" });
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, h.addHoliday));
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`?year=${year - 1}`} className="rounded-full px-3 py-1 text-xs hover:bg-ink/[0.06]"><bdi dir="ltr">{year - 1}</bdi></Link>
        <span className="text-sm font-semibold text-slate-900 dark:text-white"><bdi dir="ltr">{year}</bdi></span>
        <Link href={`?year=${year + 1}`} className="rounded-full px-3 py-1 text-xs hover:bg-ink/[0.06]"><bdi dir="ltr">{year + 1}</bdi></Link>
      </div>
      {editable && (
        <form onSubmit={add} className="grid items-end gap-3 rounded-2xl border border-ink/10 p-4 sm:grid-cols-[10rem_1fr_1fr_auto]">
          <label className={labelClass}>{h.date}<input type="date" required className={fieldClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className={labelClass}>{h.nameEn}<input required maxLength={120} className={fieldClass} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></label>
          <label className={labelClass}>{h.nameAr}<input maxLength={120} dir="rtl" className={fieldClass} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></label>
          <Button type="submit" size="sm"><Plus className="w-3.5 h-3.5" />{h.addHoliday}</Button>
        </form>
      )}
      {holidays.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{h.noHolidays}</p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10">
          {holidays.map((holiday) => (
            <li key={holiday.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-36 shrink-0 text-slate-600 dark:text-slate-300"><DateDisplay date={holiday.date} locale={locale} /></span>
              <span className="min-w-0 flex-1 truncate text-slate-900 dark:text-white">{locale === "ar" ? holiday.nameAr : holiday.nameEn}</span>
              {editable && <Button type="button" variant="ghost" size="sm" aria-label={h.delete} onClick={() => setDeleting(holiday)}><Trash2 className="w-3.5 h-3.5 text-rose-600" /></Button>}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDestructiveModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deletePublicHolidayAction(deleting.id);
            toast.success(h.holidayDeleted);
            router.refresh();
          } catch (error) {
            toast.error(errorMessage(error, t, h.delete));
          }
          setDeleting(null);
        }}
        title={h.delete}
        description={deleting ? `${deleting.date} · ${locale === "ar" ? deleting.nameAr : deleting.nameEn}` : ""}
        confirmLabel={h.delete}
        cancelLabel={h.cancel}
      />
    </div>
  );
}

function Shifts({ shiftTypes, editable }: { shiftTypes: ShiftTypeView[]; editable: boolean }) {
  const { t, locale } = useAdminLocale();
  const h = t.hrSettings;
  const router = useRouter();
  const blank = { id: "", code: "", nameEn: "", nameAr: "", allowanceMode: "fixed" as const, allowanceValue: 0, isActive: true };
  const [editing, setEditing] = React.useState<ShiftTypeView | null>(null);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await saveShiftTypeAction({ ...editing, id: editing.id || null });
      toast.success(h.shiftSaved);
      setEditing(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, h.addShift));
    }
  };
  return (
    <div className="space-y-3">
      {editable && <div className="flex justify-end"><Button type="button" size="sm" onClick={() => setEditing(blank)}><Plus className="w-3.5 h-3.5" />{h.addShift}</Button></div>}
      {shiftTypes.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{h.noShifts}</p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10">
          {shiftTypes.map((shift) => (
            <li key={shift.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm ${shift.isActive ? "" : "opacity-60"}`}>
              <span className="min-w-0 flex-1 text-slate-900 dark:text-white">{locale === "ar" ? shift.nameAr : shift.nameEn} <bdi dir="ltr" className="text-[11px] text-slate-500">{shift.code}</bdi></span>
              <span className="text-xs text-slate-600 dark:text-slate-300">
                <bdi dir="ltr">{shift.allowanceMode === "fixed" ? `${shift.allowanceValue.toFixed(3)} ${t.shared.bhd}` : `${shift.allowanceValue}%`}</bdi>
              </span>
              {editable && <Button type="button" variant="ghost" size="sm" aria-label={h.edit} onClick={() => setEditing(shift)}><Pencil className="w-3.5 h-3.5" /></Button>}
            </li>
          ))}
        </ul>
      )}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? h.edit : h.addShift} closeLabel={h.cancel}>
        {editing && (
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={labelClass}>{h.code}<input required dir="ltr" maxLength={40} className={fieldClass} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></label>
              <label className={labelClass}>{h.nameEn}<input required maxLength={80} className={fieldClass} value={editing.nameEn} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} /></label>
              <label className={labelClass}>{h.nameAr}<input maxLength={80} dir="rtl" className={fieldClass} value={editing.nameAr} onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {h.allowance}
                <select className={fieldClass} value={editing.allowanceMode} onChange={(e) => setEditing({ ...editing, allowanceMode: e.target.value as "fixed" | "percent" })}>
                  <option value="fixed">{h.allowanceFixed}</option>
                  <option value="percent">{h.allowancePercent}</option>
                </select>
              </label>
              <label className={labelClass}>&nbsp;<input type="number" dir="ltr" min={0} step="0.001" className={fieldClass} value={editing.allowanceValue} onChange={(e) => setEditing({ ...editing, allowanceValue: Number(e.target.value) })} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" className="accent-accent" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              {h.active}
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>{h.cancel}</Button>
              <Button type="submit" size="sm">{h.save}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function HrSettingsView({
  policy,
  leaveTypes,
  holidays,
  holidayYear,
  shiftTypes,
  canPolicy,
  canLeave,
}: {
  policy: HrPolicyRules;
  leaveTypes: LeaveTypeView[];
  holidays: Holiday[];
  holidayYear: number;
  shiftTypes: ShiftTypeView[];
  canPolicy: boolean;
  canLeave: boolean;
}) {
  const { t } = useAdminLocale();
  const h = t.hrSettings;
  const [tab, setTab] = React.useState<Tab>("policy");
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{h.title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{h.subtitle}</p>
      </header>
      <div className="flex gap-1 overflow-x-auto border-b border-ink/10" role="tablist">
        {(["policy", "leave", "holidays", "shifts"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "border-primary text-primary dark:border-accent dark:text-accent" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            {h.tabs[key]}
          </button>
        ))}
      </div>
      {tab === "policy" && <PolicyForm policy={policy} editable={canPolicy} />}
      {tab === "leave" && <LeaveTypes leaveTypes={leaveTypes} editable={canLeave} />}
      {tab === "holidays" && <Holidays holidays={holidays} year={holidayYear} editable={canLeave} />}
      {tab === "shifts" && <Shifts shiftTypes={shiftTypes} editable={canPolicy} />}
    </div>
  );
}
