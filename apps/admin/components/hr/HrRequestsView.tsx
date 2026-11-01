"use client";
import { DataTable } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Plus } from "lucide-react";
import { Select, ModalFooter, Button, Card, Modal, formatDate } from "@platform/ui";
import { ROUTES } from "@platform/database/constants/routes";
import { errorMessage } from "../../lib/error-text";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { createLeaveRequestAction } from "../../app/actions/leave";
import { payslipMonthsForEmployeeAction } from "../../app/actions/salary-documents";
import { SalaryDocumentsView } from "./SalaryDocumentsView";
import { PageHeader } from "../layout/PageHeader";

export interface HrRequestRow {
  key: string;
  type: "leave" | "salary_document" | "claim";
  reference: string;
  employee: { en: string; ar: string };
  summaryEn: string;
  summaryAr: string;
  detail: string;
  status: string;
  createdAt: string;
  href: string;
}
interface EmployeeOption { id: string; number: string; nameEn: string; nameAr: string }
interface LeaveTypeOption { id: string; nameEn: string; nameAr: string }

const TYPES = ["all", "leave", "salary_document", "claim"] as const;
const STATUSES = ["all", "pending", "approved", "issued", "paid", "rejected", "cancelled"] as const;
const CHIP: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  issued: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-surface-sunken/10 text-ink-muted dark:text-ink",
};
const field = "w-full rounded-lg border border-outline-variant bg-surface-raised dark:bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40";

export function HrRequestsView(props: {
  rows: HrRequestRow[];
  type: string;
  status: string;
  employeeId: string;
  canFile: boolean;
  canFileDocuments: boolean;
  employees: EmployeeOption[];
  leaveTypes: LeaveTypeOption[];
}) {
  const { rows, type, status, employeeId, canFile, canFileDocuments, employees, leaveTypes } = props;
  const { t, locale } = useAdminLocale();
  const c = t.hrRequests;
  const router = useRouter();
  const isAr = locale === "ar";
  const [filing, setFiling] = React.useState(false);

  const go = (next: { type?: string; status?: string; employeeId?: string }) =>
    router.push(
      ROUTES.hr.requests({
        type: (next.type ?? type) === "all" ? null : (next.type ?? type),
        status: (next.status ?? status) === "all" ? null : (next.status ?? status),
        employeeId: (next.employeeId ?? employeeId) || null,
      }),
    );
  const employeeName = (e: EmployeeOption) => `${isAr ? e.nameAr || e.nameEn : e.nameEn} (${e.number})`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 shrink-0 rounded-2xl bg-accent/10 text-accent flex items-center justify-center" aria-hidden>
            <ClipboardList className="w-6 h-6" />
          </span>
          <PageHeader />
        </div>
        {canFile && (
          <Button type="button" onClick={() => setFiling(true)} className="gap-1.5">
            <Plus className="w-4 h-4" aria-hidden /> {c.fileForEmployee}
          </Button>
        )}
      </header>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <label className="block space-y-1 text-xs font-medium text-ink-muted">
          {c.filters.type}
          <Select className={field} value={type} onChange={(e) => go({ type: e.target.value })}>
            {TYPES.map((v) => <option key={v} value={v}>{c.types[v]}</option>)}
          </Select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-ink-muted">
          {c.filters.status}
          <Select className={field} value={status} onChange={(e) => go({ status: e.target.value })}>
            {STATUSES.map((v) => <option key={v} value={v}>{c.statuses[v]}</option>)}
          </Select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-ink-muted min-w-56">
          {c.filters.employee}
          <Select className={field} value={employeeId} onChange={(e) => go({ employeeId: e.target.value })}>
            <option value="">{c.allEmployees}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{employeeName(e)}</option>)}
          </Select>
        </label>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-muted">{c.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <DataTable className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-muted">
                <tr>
                  {[c.columns.employee, c.columns.type, c.columns.request, c.columns.status, c.columns.date].map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((r) => (
                  <tr key={r.key} className="hover:bg-ink/5">
                    <td className="px-4 py-3">
                      <Link href={r.href} className="font-semibold text-ink hover:text-accent">{isAr ? r.employee.ar || r.employee.en : r.employee.en}</Link>
                      <div className="text-[11px] font-mono text-ink-muted text-start"><bdi dir="ltr">{r.reference}</bdi></div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.types[r.type]}</td>
                    <td className="px-4 py-3">
                      <div className="text-ink">
                        {r.type === "leave" ? (isAr ? r.summaryAr : r.summaryEn) : r.type === "salary_document" ? c.documentKinds[r.summaryEn as "payslip" | "salary_certificate"] ?? r.summaryEn : r.summaryEn}
                      </div>
                      {r.detail && <div className="text-[11px] text-ink-muted text-start"><bdi dir="ltr">{r.detail}</bdi></div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${CHIP[r.status] ?? CHIP.cancelled}`}>
                        {c.statuses[r.status as keyof typeof c.statuses] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{formatDate(r.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}
      </Card>

      <FileForEmployeeModal
        isOpen={filing}
        onClose={() => setFiling(false)}
        employees={employees}
        leaveTypes={leaveTypes}
        canFileDocuments={canFileDocuments}
      />
    </div>
  );
}

function FileForEmployeeModal({ isOpen, onClose, employees, leaveTypes, canFileDocuments }: {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeOption[];
  leaveTypes: LeaveTypeOption[];
  canFileDocuments: boolean;
}) {
  const modalFormId = React.useId();

  const { t, locale } = useAdminLocale();
  const c = t.hrRequests;
  const isAr = locale === "ar";
  const router = useRouter();
  const [employeeId, setEmployeeId] = React.useState("");
  const [kind, setKind] = React.useState<"leave" | "salary_document">("leave");
  const [leaveTypeId, setLeaveTypeId] = React.useState(leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [months, setMonths] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;
    setEmployeeId(""); setKind("leave"); setStartDate(""); setEndDate(""); setReason(""); setMonths([]);
  }, [isOpen]);
  React.useEffect(() => {
    if (!employeeId || kind !== "salary_document") return setMonths([]);
    let live = true;
    payslipMonthsForEmployeeAction(employeeId).then((m) => live && setMonths(m)).catch(() => live && setMonths([]));
    return () => { live = false; };
  }, [employeeId, kind]);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason.trim()) return toast.error(c.fillAll);
    if (endDate < startDate) return toast.error(c.endBeforeStart);
    setBusy(true);
    try {
      await createLeaveRequestAction({ employeeId, leaveTypeId, startDate, endDate, reason: reason.trim() });
      toast.success(c.filed);
      router.refresh();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, t, c.failed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={c.fileForEmployee} footer={!employeeId ? <Button type="button" variant="outline" onClick={onClose}>{c.cancel}</Button> : null}>
      <div className="space-y-5">
        <p className="text-sm text-ink-muted">{c.fileHint}</p>
        <label className="block space-y-1 text-xs font-medium text-ink-muted">
          {c.filters.employee}
          <Select className={field} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">—</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{`${isAr ? e.nameAr || e.nameEn : e.nameEn} (${e.number})`}</option>)}
          </Select>
        </label>
        <div role="radiogroup" aria-label={c.filters.type} className="inline-flex gap-1 p-1 rounded-full bg-surface-sunken border border-outline-variant">
          {(["leave", ...(canFileDocuments ? ["salary_document"] : [])] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={kind === v} onClick={() => setKind(v as typeof kind)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${kind === v ? "bg-accent text-accent-foreground shadow-sm" : "text-ink-muted hover:text-ink hover:bg-ink/5"}`}>
              {c.types[v as "leave" | "salary_document"]}
            </button>
          ))}
        </div>

        {!employeeId ? (
          <p className="text-xs text-ink-muted">{c.pickEmployeeFirst}</p>
        ) : kind === "leave" ? (
          <form onSubmit={submitLeave} className="space-y-4" id={modalFormId}>
            <label className="block space-y-1 text-xs font-medium text-ink-muted">
              {c.leaveType}
              <Select className={field} value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
                {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{isAr ? lt.nameAr : lt.nameEn}</option>)}
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs font-medium text-ink-muted">{c.from}
                <input type="date" dir="ltr" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="block space-y-1 text-xs font-medium text-ink-muted">{c.to}
                <input type="date" dir="ltr" className={field} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-medium text-ink-muted">{c.reason}
              <textarea rows={3} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <ModalFooter><div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{c.cancel}</Button>
              <Button type="submit" disabled={busy} form={modalFormId}>{c.submit}</Button>
            </div></ModalFooter>
          </form>
        ) : (
          <SalaryDocumentsView embedded employeeId={employeeId} documents={[]} availableMonths={months} />
        )}
      </div>
    </Modal>
  );
}
