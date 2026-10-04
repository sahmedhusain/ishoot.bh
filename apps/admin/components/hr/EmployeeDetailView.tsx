"use client";
import {
  PayrollSettingsFields,
  emptyPayrollSettings,
} from "./PayrollSettingsFields";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Department } from "@ishoot/database/types";
import { Card, Button } from "@ishoot/ui";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Edit2,
  AlertCircle,
} from "lucide-react";
import { updateEmployeeAction } from "../../app/actions/hrms";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { toast } from "sonner";

interface EmployeeDetailViewProps {
  employee: Employee;
  departments: Department[];
  canEdit: boolean;
}

export function EmployeeDetailView({
  employee,
  departments,
  canEdit,
}: EmployeeDetailViewProps) {
  const router = useRouter();
  const { isRTL, t } = useAdminLocale();

  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Edit fields state
  const [jobTitleEn, setJobTitleEn] = React.useState(employee.jobTitleEn);
  const [jobTitleAr, setJobTitleAr] = React.useState(employee.jobTitleAr || "");
  const [departmentId, setDepartmentId] = React.useState(
    employee.departmentId || "",
  );
  const [status, setStatus] = React.useState(employee.status);
  const [phone, setPhone] = React.useState(employee.phone || "");
  const [email, setEmail] = React.useState(employee.email || "");

  // Current compensation
  const currentRecord =
    employee.employmentRecords?.find((r) => r.isCurrent) ||
    employee.employmentRecords?.[0];
  const [basicSalary, setBasicSalary] = React.useState(
    currentRecord ? Number(currentRecord.basicSalary) : 0,
  );
  const [housingAllowance, setHousingAllowance] = React.useState(
    currentRecord ? Number(currentRecord.housingAllowance) : 0,
  );
  const [transportAllowance, setTransportAllowance] = React.useState(
    currentRecord ? Number(currentRecord.transportAllowance) : 0,
  );
  const [otherAllowances, setOtherAllowances] = React.useState(
    currentRecord ? Number(currentRecord.otherAllowances) : 0,
  );

  const totalMonthlyGross =
    basicSalary + housingAllowance + transportAllowance + otherAllowances;

  const [payrollSettings, setPayrollSettings] = React.useState(
    currentRecord?.payrollSettings ?? emptyPayrollSettings,
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading(t.hrText.text0);
    try {
      const res = await updateEmployeeAction(employee.id, {
        jobTitleEn: jobTitleEn.trim(),
        jobTitleAr: jobTitleAr.trim() || undefined,
        departmentId: departmentId || null,
        status: status as any,
        phone: phone.trim() || null,
        email: email.trim() || null,
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        payrollSettings,
      });

      if (res.success) {
        toast.success(t.hrText.text1, { id: toastId });
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(t.hrText.text2, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.hrText.extra290, {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hr/employees"
            className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {isRTL ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#09937F] font-medium">
                {employee.employeeNumber}
              </span>
              <span
                className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                  employee.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : employee.status === "on_leave"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {(t.hrExtensions as Record<string, string>)[employee.status] ||
                  employee.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {isRTL ? employee.firstNameAr : employee.firstNameEn}{" "}
              {isRTL ? employee.lastNameAr : employee.lastNameEn}
            </h1>
          </div>
        </div>

        {canEdit && !isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 bg-[#014842] hover:bg-[#013833] text-white px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{t.hrText.text3}</span>
          </Button>
        )}
      </div>

      {/* On Leave Availability Warning Banner */}
      {employee.status === "on_leave" && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-sm">{t.hrText.text4}</div>
            <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-[11px]">
              {t.hrText.text5}
            </p>
          </div>
        </div>
      )}

      <section className="text-sm">
        {t.hrExtensions.accountStatus}:{" "}
        {employee.user
          ? employee.user.isActive
            ? t.hrExtensions.active
            : t.hrExtensions.inactive
          : t.hrExtensions.unlinked}
      </section>
      {!currentRecord?.payrollSettings && (
        <p className="text-amber-600">{t.hrExtensions.configure}</p>
      )}
      {!isEditing && (
        <fieldset disabled>
          <PayrollSettingsFields value={payrollSettings} onChange={() => {}} />
        </fieldset>
      )}
      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-3">
              {t.hrText.text6}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text7}
                </label>
                <input
                  type="text"
                  required
                  value={jobTitleEn}
                  onChange={(e) => setJobTitleEn(e.target.value)}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text8}
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={jobTitleAr}
                  onChange={(e) => setJobTitleAr(e.target.value)}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text9}
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2.5 text-slate-900 dark:text-white"
                >
                  <option value="">{t.hrText.text10}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text11}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2.5 text-slate-900 dark:text-white"
                >
                  <option value="active">{t.hrText.text12}</option>
                  <option value="on_leave">{t.hrText.text13}</option>
                  <option value="suspended">{t.hrText.text14}</option>
                  <option value="terminated">{t.hrText.text15}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text16}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text17}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </Card>

          {/* Compensation Adjustment */}
          <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-3">
              {t.hrText.text18}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.hrText.text19}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.hrText.text20}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={housingAllowance}
                  onChange={(e) => setHousingAllowance(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.hrText.text21}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={transportAllowance}
                  onChange={(e) =>
                    setTransportAllowance(Number(e.target.value))
                  }
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t.hrText.text22}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={otherAllowances}
                  onChange={(e) => setOtherAllowances(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2"
                />
              </div>
            </div>
          </Card>

          <PayrollSettingsFields
            value={payrollSettings}
            onChange={setPayrollSettings}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-medium rounded-md border border-[#EAEAEA] dark:border-white/10 text-slate-600 hover:bg-slate-50"
            >
              {t.hrText.text23}
            </button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#014842] hover:bg-[#013833] text-white px-5 py-2 rounded-md text-xs font-medium"
            >
              {saving ? t.hrText.extra291 : t.hrText.extra292}
            </Button>
          </div>
        </form>
      ) : (
        /* Read-only View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main 2 Cols */}
          <div className="md:col-span-2 space-y-6">
            {/* Core Employment Details */}
            <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-3 flex items-center gap-2">
                <BriefcaseIcon className="w-4 h-4 text-[#09937F]" />
                {t.hrText.text24}
              </h2>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {t.hrText.text25}
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">
                    {employee.jobTitleEn}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {t.hrText.text26}
                  </span>
                  <div
                    className="font-semibold text-slate-900 dark:text-white text-sm"
                    dir="rtl"
                  >
                    {employee.jobTitleAr || "N/A"}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {t.hrText.text27}
                  </span>
                  <div className="text-slate-800 dark:text-neutral-200 font-medium">
                    {employee.department
                      ? `${employee.department.nameEn} (${employee.department.code})`
                      : t.hrText.extra293}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {t.hrText.text28}
                  </span>
                  <div className="font-mono text-slate-800 dark:text-neutral-200">
                    {new Date(employee.hireDate).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {t.hrText.text29}
                  </span>
                  <div className="font-mono text-slate-800 dark:text-neutral-200">
                    {employee.cprNumber || "Not recorded"}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">
                    {t.hrText.text30}
                  </span>
                  <div className="text-slate-800 dark:text-neutral-200">
                    {employee.email || "No email"}{" "}
                    {employee.phone ? `• ${employee.phone}` : ""}
                  </div>
                </div>
              </div>
            </Card>

            {/* Compensation Structure */}
            <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-white/10 pb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#09937F]" />
                  {t.hrText.text31}
                </h2>
                <span className="text-xs font-mono font-bold text-[#014842] dark:text-[#7de0d1]">
                  {t.hrText.text32}
                  {totalMonthlyGross.toFixed(3)}
                  {t.hrText.text33}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-neutral-900/40 rounded border border-[#EAEAEA] dark:border-white/5 space-y-1">
                  <span className="text-slate-400">{t.hrText.text19}</span>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                    {basicSalary.toFixed(3)}
                    {t.hrText.text33}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-900/40 rounded border border-[#EAEAEA] dark:border-white/5 space-y-1">
                  <span className="text-slate-400">{t.hrText.text34}</span>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                    {housingAllowance.toFixed(3)}
                    {t.hrText.text33}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-900/40 rounded border border-[#EAEAEA] dark:border-white/5 space-y-1">
                  <span className="text-slate-400">{t.hrText.text21}</span>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                    {transportAllowance.toFixed(3)}
                    {t.hrText.text33}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-neutral-900/40 rounded border border-[#EAEAEA] dark:border-white/5 space-y-1">
                  <span className="text-slate-400">{t.hrText.text35}</span>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white text-sm">
                    {otherAllowances.toFixed(3)}
                    {t.hrText.text33}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Leave Balance & User Link */}
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 border-b border-[#EAEAEA] dark:border-white/10 pb-2">
                {t.hrText.text36}
              </h3>
              <div>
                <span className="text-slate-500 text-xs">
                  {t.hrText.text37}
                </span>
                <div className="text-3xl font-bold font-mono text-[#014842] dark:text-[#7de0d1] mt-1">
                  {Number(employee.leaveBalanceDays).toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    {t.hrText.text38}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-white/5">
                {t.hrText.text39}
              </p>
            </Card>

            <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 border-b border-[#EAEAEA] dark:border-white/10 pb-2">
                {t.hrText.text40}
              </h3>
              {employee.user ? (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {employee.user.fullName}
                  </div>
                  <div className="text-slate-500">{employee.user.email}</div>
                  <div className="font-mono text-[11px] text-[#09937F] mt-1">
                    {t.hrText.text41}
                    {employee.user.role}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">{t.hrText.text42}</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
