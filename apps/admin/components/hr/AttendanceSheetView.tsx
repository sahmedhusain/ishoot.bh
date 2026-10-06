"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Button, Card, Modal } from "@ishoot/ui";
import type { AttendanceCell, AttendanceSheet } from "@ishoot/database/queries/attendance";
import { ROUTES } from "@ishoot/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { deleteAttendanceAction, markMonthPresentAction, saveAttendanceAction } from "../../app/actions/hr-settings";

type Employee = AttendanceSheet["employees"][number];

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/20 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);

const STATUS_STYLE: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  absent: "bg-rose-500/20 text-rose-800 dark:text-rose-300",
  half_day: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
  on_leave: "bg-blue-500/15 text-blue-800 dark:text-blue-300",
  holiday: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

const overtimeOf = (cell: AttendanceCell) => cell.overtimeMinutes + cell.overtimeNightMinutes + cell.overtimeRestDayMinutes + cell.overtimeHolidayMinutes;

function CellEditor({
  employee,
  date,
  cell,
  sheet,
  onClose,
}: {
  employee: Employee;
  date: string;
  cell: AttendanceCell | undefined;
  sheet: AttendanceSheet;
  onClose: () => void;
}) {
  const { t } = useAdminLocale();
  const a = t.attendance;
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const num = (value: number | undefined) => (value ? String(value) : "");
  const [form, setForm] = React.useState({
    status: cell?.status ?? "present",
    checkIn: cell?.checkIn ?? "",
    checkOut: cell?.checkOut ?? "",
    lateMinutes: num(cell?.lateMinutes),
    overtimeMinutes: num(cell?.overtimeMinutes),
    overtimeNightMinutes: num(cell?.overtimeNightMinutes),
    overtimeRestDayMinutes: num(cell?.overtimeRestDayMinutes),
    overtimeHolidayMinutes: num(cell?.overtimeHolidayMinutes),
    shiftTypeId: cell?.shiftTypeId ?? "",
    notes: cell?.notes ?? "",
  });
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const present = form.status === "present" || form.status === "half_day";
  const minutes = (value: string) => (value.trim() === "" ? null : Number(value));
  // When the times change, let the server work lateness and overtime out again.
  const timesChanged = form.checkIn !== (cell?.checkIn ?? "") || form.checkOut !== (cell?.checkOut ?? "");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveAttendanceAction({
        employeeId: employee.id,
        date,
        status: form.status,
        checkIn: present ? form.checkIn || null : null,
        checkOut: present ? form.checkOut || null : null,
        lateMinutes: timesChanged ? null : minutes(form.lateMinutes),
        overtimeMinutes: timesChanged ? null : minutes(form.overtimeMinutes),
        overtimeNightMinutes: minutes(form.overtimeNightMinutes),
        overtimeRestDayMinutes: timesChanged ? null : minutes(form.overtimeRestDayMinutes),
        overtimeHolidayMinutes: timesChanged ? null : minutes(form.overtimeHolidayMinutes),
        shiftTypeId: present ? form.shiftTypeId || null : null,
        notes: form.notes || null,
      });
      toast.success(a.saved);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.save));
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    try {
      await deleteAttendanceAction(employee.id, date);
      toast.success(a.cleared);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.clear));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-xs text-slate-600 dark:text-slate-300"><bdi dir="ltr">{date}</bdi></p>
      <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
        {a.status}
        <select className={fieldClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
          {(["present", "absent", "half_day", "on_leave", "holiday"] as const).map((s) => (
            <option key={s} value={s}>{t.payrollItem.statuses[s]}</option>
          ))}
        </select>
      </label>
      {present && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              {a.checkIn}
              <input type="time" dir="ltr" className={fieldClass} value={form.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              {a.checkOut}
              <input type="time" dir="ltr" className={fieldClass} value={form.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
            </label>
          </div>
          <p className="text-[11px] text-slate-500">{a.auto}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["lateMinutes", a.late],
              ["overtimeMinutes", a.ot],
              ["overtimeNightMinutes", a.otNight],
              ["overtimeRestDayMinutes", a.otRest],
              ["overtimeHolidayMinutes", a.otHoliday],
            ] as const).map(([key, label]) => (
              <label key={key} className="block space-y-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                {label}
                <input type="number" min={0} max={1440} step={1} inputMode="numeric" dir="ltr" placeholder="—" className={fieldClass} value={form[key]} onChange={(e) => set(key, e.target.value)} />
              </label>
            ))}
          </div>
          {sheet.shiftTypes.length > 0 && (
            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
              {a.shift}
              <select className={fieldClass} value={form.shiftTypeId} onChange={(e) => set("shiftTypeId", e.target.value)}>
                <option value="">{a.noShift}</option>
                {sheet.shiftTypes.filter((s) => s.isActive || s.id === form.shiftTypeId).map((s) => <option key={s.id} value={s.id}>{s.nameEn}</option>)}
              </select>
            </label>
          )}
        </>
      )}
      <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
        {a.notes}
        <input maxLength={500} className={fieldClass} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {cell && <Button type="button" variant="ghost" size="sm" className="me-auto text-rose-700 dark:text-rose-400" disabled={saving} onClick={clear}>{a.clear}</Button>}
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{a.cancel}</Button>
        <Button type="submit" size="sm" disabled={saving}>{a.save}</Button>
      </div>
    </form>
  );
}

export function AttendanceSheetView({ sheet, canEdit }: { sheet: AttendanceSheet; canEdit: boolean }) {
  const { t, locale, isRTL } = useAdminLocale();
  const a = t.attendance;
  const router = useRouter();
  const [editing, setEditing] = React.useState<{ employee: Employee; date: string } | null>(null);
  const [marking, setMarking] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  const prev = sheet.month === 1 ? monthKey(sheet.year - 1, 12) : monthKey(sheet.year, sheet.month - 1);
  const next = sheet.month === 12 ? monthKey(sheet.year + 1, 1) : monthKey(sheet.year, sheet.month + 1);
  const title = new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(sheet.year, sheet.month - 1, 1)));
  const weekday = new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { weekday: "narrow", timeZone: "UTC" });
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const markPresent = async () => {
    setMarking(true);
    try {
      const result = await markMonthPresentAction(sheet.year, sheet.month, null);
      toast.success(fill(a.marked, { n: result.created }));
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.markPresent));
    } finally {
      setMarking(false);
    }
  };

  const editable = (employee: Employee, date: string) =>
    canEdit && date <= today && date >= employee.hireDate && !(sheet.lockedThrough && date <= sheet.lockedThrough);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-16">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{a.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{a.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`?month=${prev}`} aria-label={a.previousMonth} className="rounded-full p-2 hover:bg-ink/[0.06]"><PrevIcon className="w-4 h-4" /></Link>
          <span className="min-w-32 text-center text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
          <Link href={`?month=${next}`} aria-label={a.nextMonth} className="rounded-full p-2 hover:bg-ink/[0.06]"><NextIcon className="w-4 h-4" /></Link>
          {canEdit && (
            <Button type="button" size="sm" variant="secondary" disabled={marking} onClick={markPresent} title={a.markPresentBody}>
              <CalendarCheck className="w-3.5 h-3.5" />
              {a.markPresent}
            </Button>
          )}
          <Link href={ROUTES.hr.payroll()} className="inline-flex min-h-8 items-center rounded-full border border-ink/20 px-3.5 text-xs font-medium text-primary hover:bg-primary/[0.06] dark:text-accent">
            {t.payrollManagement.payrollAndCompensationRuns}
          </Link>
        </div>
      </header>

      {sheet.lockedThrough && (
        <p className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          {fill(a.locked, { date: sheet.lockedThrough })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300" aria-label={a.legend}>
        {(["present", "absent", "half_day", "on_leave", "holiday"] as const).map((s) => (
          <span key={s} className={`rounded-md px-2 py-0.5 font-medium ${STATUS_STYLE[s]}`}>{t.payrollItem.statuses[s]}</span>
        ))}
        <span className="rounded-md bg-ink/[0.06] px-2 py-0.5">{a.weekend}</span>
        <span className="rounded-md border border-dashed border-blue-500/50 px-2 py-0.5">{a.leavePending}</span>
      </div>

      <Card className="p-0 overflow-hidden dark:bg-surface-raised">
        {sheet.employees.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-600 dark:text-slate-300">{a.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th scope="col" className="sticky start-0 z-10 bg-white px-3 py-2 text-start font-semibold text-slate-700 dark:bg-surface-raised dark:text-slate-200">{a.employee}</th>
                  {sheet.days.map((day) => (
                    <th key={day.date} scope="col" title={day.holiday ?? undefined} className={`w-8 px-0.5 py-1 text-center font-medium ${day.working ? "text-slate-600 dark:text-slate-300" : "bg-ink/[0.05] text-slate-500"} ${day.date === today ? "text-primary dark:text-accent" : ""}`}>
                      <span className="block text-[10px]">{weekday.format(new Date(`${day.date}T00:00:00Z`))}</span>
                      <span className="block">{Number(day.date.slice(8))}</span>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-start font-semibold text-slate-700 dark:text-slate-200">{a.summary}</th>
                </tr>
              </thead>
              <tbody>
                {sheet.employees.map((employee) => {
                  const cells = Object.values(employee.cells);
                  const presentCount = cells.filter((c) => c.status === "present").length + cells.filter((c) => c.status === "half_day").length / 2;
                  const absentCount = cells.filter((c) => c.status === "absent").length + cells.filter((c) => c.status === "half_day").length / 2;
                  const otHours = Math.round((cells.reduce((s, c) => s + overtimeOf(c), 0) / 60) * 10) / 10;
                  return (
                    <tr key={employee.id} className="border-t border-ink/10">
                      <th scope="row" className="sticky start-0 z-10 max-w-48 border-t border-ink/10 bg-white px-3 py-1.5 text-start font-medium text-slate-800 dark:bg-surface-raised dark:text-slate-100">
                        <span className="block truncate">{locale === "ar" ? employee.nameAr : employee.name}</span>
                        <bdi dir="ltr" className="block text-[10px] font-normal text-slate-500">{employee.employeeNumber}</bdi>
                      </th>
                      {sheet.days.map((day) => {
                        const cell = employee.cells[day.date];
                        const leave = employee.leave[day.date];
                        const beforeHire = day.date < employee.hireDate;
                        const canClick = editable(employee, day.date);
                        let label = "";
                        let style = day.working ? "" : "bg-ink/[0.05]";
                        if (cell) {
                          label = cell.status === "present" ? a.presentShort : cell.status === "absent" ? a.absentShort : cell.status === "half_day" ? a.halfShort : cell.status === "on_leave" ? a.leaveShort : a.holidayShort;
                          style = STATUS_STYLE[cell.status];
                        } else if (leave) {
                          label = a.leaveShort;
                          style = leave.status === "approved" ? STATUS_STYLE.on_leave : "border border-dashed border-blue-500/50 text-blue-700 dark:text-blue-300";
                        } else if (day.holiday) {
                          label = a.holidayShort;
                          style = STATUS_STYLE.holiday;
                        } else if (day.working && !beforeHire && day.date < today) {
                          label = "·";
                          style = "text-slate-400";
                        }
                        const ot = cell ? overtimeOf(cell) : 0;
                        const titleText = [day.date, cell ? t.payrollItem.statuses[cell.status] : leave ? `${leave.code} (${leave.status})` : day.holiday, cell?.checkIn && cell.checkOut ? `${cell.checkIn}–${cell.checkOut}` : null, cell?.lateMinutes ? `${a.late}: ${cell.lateMinutes}` : null, ot ? `${a.ot}: ${ot}` : null].filter(Boolean).join(" · ");
                        return (
                          <td key={day.date} className={`border-t border-ink/10 p-0.5 text-center ${beforeHire ? "opacity-30" : ""}`}>
                            <button
                              type="button"
                              disabled={!canClick}
                              title={titleText}
                              aria-label={titleText}
                              onClick={() => setEditing({ employee, date: day.date })}
                              className={`relative flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors enabled:hover:ring-2 enabled:hover:ring-accent/50 disabled:cursor-default ${style}`}
                            >
                              {label}
                              {ot > 0 && <span className="absolute -top-0.5 end-0 h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />}
                              {cell?.lateMinutes ? <span className="absolute -bottom-0.5 end-0 h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden /> : null}
                            </button>
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap border-t border-ink/10 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                        {fill(a.totals, { present: presentCount, absent: absentCount, ot: otHours })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? fill(a.edit, { name: locale === "ar" ? editing.employee.nameAr : editing.employee.name }) : ""}
        closeLabel={a.cancel}
      >
        {editing && <CellEditor employee={editing.employee} date={editing.date} cell={editing.employee.cells[editing.date]} sheet={sheet} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
