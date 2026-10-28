"use client";
import { useCompanyCurrency } from "@platform/ui";
import { PhoneInput } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import {
  PayrollSettingsFields,
  emptyPayrollSettings,
} from "./PayrollSettingsFields";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Department } from "@platform/database/types";
import { Select, Card, Button, formatDate } from "@platform/ui";
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
  /** May see salary and payroll settings (payroll:read). */
  canViewPay?: boolean;
  /** May change salary and payroll settings (payroll:edit). */
  canEditPay?: boolean;
}

export function EmployeeDetailView({
  employee,
  departments,
  canEdit,
  canViewPay = false,
  canEditPay = false,
}: EmployeeDetailViewProps) {
  const companyCurrency = useCompanyCurrency();
  const router = useRouter();
  const { isArabic, isRTL, t, locale } = useAdminLocale();

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
    const toastId = toast.loading(t.employeeDetail.updatingEmployeeProfile);
    try {
      const res = await updateEmployeeAction(employee.id, {
        jobTitleEn: jobTitleEn.trim(),
        jobTitleAr: jobTitleAr.trim() || undefined,
        departmentId: departmentId || null,
        status: status as any,
        phone: phone.trim() || null,
        email: email.trim() || null,
        ...(canEditPay && { basicSalary, housingAllowance, transportAllowance, otherAllowances, payrollSettings }),
      });

      if (res.success) {
        toast.success(t.employeeDetail.employeeProfileUpdatedSuccessfully, { id: toastId });
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(t.employeeDetail.failedToUpdateEmployee, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.employeeDetail.updateFailed), {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-5">
        <div className="flex items-center gap-3" data-page-header>
          <Link
            href={ROUTES.hr.employees}
            className="p-2 rounded-md hover:bg-surface-sunken dark:hover:bg-surface-raised text-ink-muted hover:text-ink dark:hover:text-white transition-colors"
          >
            {isRTL ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-widest text-accent font-medium">
                {employee.employeeNumber}
              </span>
              <span
                className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${employee.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : employee.status === "on_leave"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-ink/5 text-ink-muted"
                  }`}
              >
                {(t.hrExtensions as Record<string, string>)[employee.status] ||
                  employee.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink mt-1">
              {isArabic ? employee.firstNameAr : employee.firstNameEn}{" "}
              {isArabic ? employee.lastNameAr : employee.lastNameEn}
            </h1>
          </div>
        </div>

        {canEdit && !isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{t.employeeDetail.editProfile}</span>
          </Button>
        )}
      </div>

      {/* On Leave Availability Warning Banner */}
      {employee.status === "on_leave" && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-sm">{t.employeeDetail.employeeCurrentlyOnApprovedLeave}</div>
            <p className="text-amber-700 dark:text-amber-400 leading-relaxed text-[11px]">
              {t.employeeDetail.governanceInvariantInEffectThe}
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
      {canViewPay && !currentRecord?.payrollSettings && (
        <p className="text-amber-600">{t.hrExtensions.configure}</p>
      )}
      {canViewPay && !isEditing && (
        <fieldset disabled>
          <PayrollSettingsFields value={payrollSettings} onChange={() => { }} />
        </fieldset>
      )}
      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono border-b border-outline-variant pb-3">
              {t.employeeDetail.editEmploymentAndRoleInformation}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label>
                <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  {t.shared.jobTitleEnglish}
                </span>
                <input
                  type="text"
                  required
                  value={jobTitleEn}
                  onChange={(e) => setJobTitleEn(e.target.value)}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                 dir="ltr"/>
              </label>

              <label>
                <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  {t.shared.text}
                </span>
                <input
                  type="text"
                  dir="rtl"
                  value={jobTitleAr}
                  onChange={(e) => setJobTitleAr(e.target.value)}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>

              <label>
                <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  {t.shared.department}
                </span>
                <Select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2.5 text-ink dark:text-ink"
                >
                  <option value="">{t.employeeDetail.noDepartmentAssigned}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn} ({d.code})
                    </option>
                  ))}
                </Select>
              </label>

              <label>
                <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  {t.employeeDetail.dutyStatus}
                </span>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2.5 text-ink dark:text-ink"
                >
                  <option value="active">{t.shared.activeDuty}</option>
                  <option value="on_leave">{t.shared.onLeave}</option>
                  <option value="suspended">{t.shared.suspended}</option>
                  <option value="terminated">{t.shared.terminated}</option>
                </Select>
              </label>

              <label>
                <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  <bdi dir="ltr">{t.shared.email}</bdi>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>

              <label>
                <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  <bdi dir="ltr">{t.employeeDetail.phone}</bdi>
                </span>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>
            </div>
          </Card>

          {/* Compensation Adjustment */}
          {canEditPay && (<>
            <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono border-b border-outline-variant pb-3">
                {t.employeeDetail.effectiveCompensationBhd}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <label>
                  <span className="block text-xs font-medium text-ink-muted mb-1">
                    {t.employeeDetail.basicSalary}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2"
                  />
                </label>
                <label>
                  <span className="block text-xs font-medium text-ink-muted mb-1">
                    {t.shared.housing}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={housingAllowance}
                    onChange={(e) => setHousingAllowance(Number(e.target.value))}
                    className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2"
                  />
                </label>
                <label>
                  <span className="block text-xs font-medium text-ink-muted mb-1">
                    {t.shared.transport}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transportAllowance}
                    onChange={(e) =>
                      setTransportAllowance(Number(e.target.value))
                    }
                    className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2"
                  />
                </label>
                <label>
                  <span className="block text-xs font-medium text-ink-muted mb-1">
                    {t.employeeDetail.other}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={otherAllowances}
                    onChange={(e) => setOtherAllowances(Number(e.target.value))}
                    className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2"
                  />
                </label>
              </div>
            </Card>

            <PayrollSettingsFields
              value={payrollSettings}
              onChange={setPayrollSettings}
            />
          </>)}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-medium rounded-md border border-outline-variant text-ink-muted hover:bg-ink/10"
            >
              {t.shared.cancel}
            </button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-5 py-2 rounded-md text-xs font-medium"
            >
              {saving ? t.employeeDetail.savingChanges : t.employeeDetail.saveUpdates}
            </Button>
          </div>
        </form>
      ) : (
        /* Read-only View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main 2 Cols */}
          <div className="md:col-span-2 space-y-6">
            {/* Core Employment Details */}
            <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono border-b border-outline-variant pb-3 flex items-center gap-2">
                <BriefcaseIcon className="w-4 h-4 text-accent" />
                {t.employeeDetail.jobAndOrganization}
              </h2>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-ink-muted block mb-0.5">
                    {t.employeeDetail.jobTitleEn}
                  </span>
                  <div className="font-semibold text-ink dark:text-ink text-sm">
                    {employee.jobTitleEn}
                  </div>
                </div>
                <div>
                  <span className="text-ink-muted block mb-0.5">
                    {t.employeeDetail.jobTitle}
                  </span>
                  <div
                    className="font-semibold text-ink dark:text-ink text-sm"
                    dir="rtl"
                  >
                    {employee.jobTitleAr || t.copy.notAvailable}
                  </div>
                </div>

                <div>
                  <span className="text-ink-muted block mb-0.5">
                    {t.employeeDetail.department}
                  </span>
                  <div className="text-ink dark:text-ink font-medium">
                    {employee.department
                      ? `${employee.department.nameEn} (${employee.department.code})`
                      : t.employeeDetail.general}
                  </div>
                </div>

                <div>
                  <span className="text-ink-muted block mb-0.5">
                    {t.employeeDetail.hireDate}
                  </span>
                  <div className="font-mono text-ink dark:text-ink">
                    {formatDate(employee.hireDate, locale, "long")}
                  </div>
                </div>

                <div>
                  <span className="text-ink-muted block mb-0.5">
                    {t.employeeDetail.bahrainCpr}
                  </span>
                  <div className="font-mono text-ink dark:text-ink">
                    {employee.cprNumber || t.employeeDetail.notRecorded}
                  </div>
                </div>

                <div>
                  <span className="text-ink-muted block mb-0.5">
                    {t.employeeDetail.contact}
                  </span>
                  <div className="text-ink dark:text-ink">
                    <bdi dir="ltr">{employee.email || t.employeeDetail.noEmail}</bdi>{" "}
                    {employee.phone ? <>• <bdi dir="ltr">{employee.phone}</bdi></> : ""}
                  </div>
                </div>
              </div>
            </Card>

            {/* Compensation Structure */}
            {canViewPay && (
              <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
                <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-accent" />
                    {t.employeeDetail.monthlyRemunerationAndGosiBase}
                  </h2>
                  <span className="text-xs font-mono font-bold text-primary dark:text-mint">
                    {t.employeeDetail.totalGross}
                    {totalMonthlyGross.toFixed(3)}
                    {companyCurrency}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-surface-raised dark:bg-surface-raised/40 rounded border border-outline-variant dark:border-white/5 space-y-1">
                    <span className="text-ink-muted">{t.employeeDetail.basicSalary}</span>
                    <div className="font-mono font-semibold text-ink dark:text-ink text-sm">
                      {basicSalary.toFixed(3)}
                      {companyCurrency}
                    </div>
                  </div>
                  <div className="p-3 bg-surface-raised dark:bg-surface-raised/40 rounded border border-outline-variant dark:border-white/5 space-y-1">
                    <span className="text-ink-muted">{t.shared.housingAllowance}</span>
                    <div className="font-mono font-semibold text-ink dark:text-ink text-sm">
                      {housingAllowance.toFixed(3)}
                      {companyCurrency}
                    </div>
                  </div>
                  <div className="p-3 bg-surface-raised dark:bg-surface-raised/40 rounded border border-outline-variant dark:border-white/5 space-y-1">
                    <span className="text-ink-muted">{t.shared.transport}</span>
                    <div className="font-mono font-semibold text-ink dark:text-ink text-sm">
                      {transportAllowance.toFixed(3)}
                      {companyCurrency}
                    </div>
                  </div>
                  <div className="p-3 bg-surface-raised dark:bg-surface-raised/40 rounded border border-outline-variant dark:border-white/5 space-y-1">
                    <span className="text-ink-muted">{t.shared.otherAllowances}</span>
                    <div className="font-mono font-semibold text-ink dark:text-ink text-sm">
                      {otherAllowances.toFixed(3)}
                      {companyCurrency}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Leave Balance & User Link */}
          <div className="space-y-6">
            <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-ink-muted border-b border-outline-variant pb-2">
                {t.employeeDetail.leaveAndStatutoryEntitlement}
              </h3>
              <div>
                <span className="text-ink-muted text-xs">
                  {t.employeeDetail.annualLeaveBalance}
                </span>
                <div className="text-3xl font-bold font-mono text-primary dark:text-mint mt-1">
                  {Number(employee.leaveBalanceDays).toFixed(1)}{" "}
                  <span className="text-xs font-normal text-ink-muted">
                    {t.shared.days}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed pt-2 border-t border-outline-variant dark:border-white/5">
                {t.employeeDetail.bahrainLabourLawStandard30}
              </p>
            </Card>

            <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-ink-muted border-b border-outline-variant pb-2">
                {t.employeeDetail.linkedSystemLogin}
              </h3>
              {employee.user ? (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-ink dark:text-ink">
                    <bdi dir="auto">{employee.user.fullName}</bdi>
                  </div>
                  <div className="text-ink-muted"><bdi dir="ltr">{employee.user.email}</bdi></div>
                  <div className="font-mono text-[11px] text-accent mt-1">
                    {t.employeeDetail.role}
                    {employee.user.role}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-ink-muted">{t.employeeDetail.noDashboardUserLinkedEmployee}</div>
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
