"use client";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Department } from "@platform/database/types";
import { Select, Card } from "@platform/ui";
import { UserPlus, FileUp, Search, Clock, ArrowRight, AlertCircle } from "lucide-react";

interface EmployeesListViewProps {
  employees: Employee[];
  departments: Department[];
  total: number;
  currentDepartment: string;
  currentStatus: string;
  search: string;
  page: number;
  canViewPay?: boolean;
  canCreate?: boolean;
  /** Shown under the page header (e.g. documents about to expire). */
  notice?: React.ReactNode;
}

export function EmployeesListView({
  employees,
  departments,
  total,
  currentDepartment,
  currentStatus,
  search,
  canViewPay = false,
  canCreate = false,
  notice,
}: EmployeesListViewProps) {
  const { t, isRTL } = useAdminLocale();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = React.useState(search);

  const activeCount = employees.filter((e) => e.status === "active").length;
  const onLeaveCount = employees.filter((e) => e.status === "on_leave").length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (currentDepartment !== "all")
      params.set("departmentId", currentDepartment);
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", "1");
    router.push(`${ROUTES.hr.employees}?${params.toString()}`);
  };

  const updateFilter = (deptId?: string, st?: string) => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (deptId && deptId !== "all") params.set("departmentId", deptId);
    if (st && st !== "all") params.set("status", st);
    params.set("page", "1");
    router.push(`${ROUTES.hr.employees}?${params.toString()}`);
  };

  const statusColors: Record<string, string> = {
    active:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    on_leave:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    suspended:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
    terminated:
      "bg-surface-sunken text-ink-muted dark:bg-surface-raised dark:text-ink-muted",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6" data-page-header>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent bg-secondary-container dark:bg-tone-15/40 dark:text-mint px-2.5 py-0.5 rounded-full font-medium">
              {t.employeesList.humanCapitalAndOrganization}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ink dark:text-ink mt-1">
            {t.employeesList.employeesAndTalentDirectory}
          </h1>
          <p className="text-sm text-ink-muted dark:text-ink-muted mt-1">
            {t.employeesList.manageOrganizationalRosterCompensationProfiles}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && <Link
            href={ROUTES.hr.importEmployees}
            className="inline-flex items-center gap-2 border border-outline-variant hover:bg-ink/5 text-ink px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all"
          >
            <FileUp className="w-4 h-4" />
            <span>{t.peopleImport.open}</span>
          </Link>}
          {canCreate && <Link
            href={ROUTES.hr.newEmployee()}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.employeesList.onboardEmployee}</span>
          </Link>}
        </div>
      </div>

      {notice}

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.employeesList.totalStaffCount}
          </div>
          <div className="text-2xl font-bold font-mono text-ink dark:text-ink">
            {total}
          </div>
          <div className="text-xs text-ink-muted">{t.employeesList.totalRegisteredProfiles}</div>
        </div>

        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.shared.activeDuty}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <div className="text-xs text-ink-muted">{t.employeesList.availableForAssignment}</div>
        </div>

        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.employeesList.onApprovedLeave}
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2">
            {onLeaveCount}
            {onLeaveCount > 0 && <Clock className="w-4 h-4" />}
          </div>
          <div className="text-xs text-ink-muted">{t.employeesList.strictlyBlockedFromAllocation}</div>
        </div>

        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.employeesList.departments}
          </div>
          <div className="text-2xl font-bold font-mono text-ink dark:text-ink">
            {departments.length}
          </div>
          <div className="text-xs text-ink-muted">{t.employeesList.functionalUnits}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-surface-raised dark:bg-surface-raised border border-outline-variant">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 w-full sm:w-80"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute start-3 top-2.5 text-ink-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.employeesList.searchByNameEmployeeTitle}
              className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised ps-9 pe-3 py-2 text-ink dark:text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-surface-sunken hover:bg-surface-sunken dark:bg-surface-raised dark:hover:bg-surface-sunken text-xs rounded-md font-medium text-ink dark:text-ink"
          >
            {t.employeesList.search}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2" data-page-toolbar>
          {/* Department Filter */}
          <Select
            value={currentDepartment}
            onChange={(e) => updateFilter(e.target.value, currentStatus)}
            className="text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised px-3 py-2 text-ink dark:text-ink"
          >
            <option value="all">{t.employeesList.allDepartments}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameEn} / {d.nameAr}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={currentStatus}
            onChange={(e) => updateFilter(currentDepartment, e.target.value)}
            className="text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised px-3 py-2 text-ink dark:text-ink"
          >
            <option value="all">{t.employeesList.allStatuses}</option>
            <option value="active">{t.shared.activeDuty}</option>
            <option value="on_leave">{t.shared.onLeave}</option>
            <option value="suspended">{t.shared.suspended}</option>
            <option value="terminated">{t.shared.terminated}</option>
          </Select>
        </div>
      </div>

      {/* Employees Table */}
      <Card className="bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-xs font-mono uppercase text-ink-muted bg-surface-raised/50 dark:bg-surface-raised/30">
                <th className="py-3 px-4">{t.shared.employee}</th>
                <th className="py-3 px-4">{t.employeesList.jobTitleAndDept}</th>
                <th className="py-3 px-4">{t.employeesList.statusAndAvailability}</th>
                <th className="py-3 px-4 text-end">{t.employeesList.leaveBalance}</th>
                {canViewPay && <th className="py-3 px-4 text-end">{t.employeesList.compensation}</th>}
                <th className="py-3 px-4 text-end">{t.employeesList.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant dark:divide-white/5">
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={canViewPay ? 6 : 5}
                    className="py-12 text-center text-xs text-ink-muted"
                  >
                    {t.employeesList.noEmployeeRecordsFoundMatching}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const currentComp = emp.employmentRecords?.find(
                    (r) => r.isCurrent,
                  );
                  const totalSalary = currentComp
                    ? Number(currentComp.basicSalary) +
                    Number(currentComp.housingAllowance) +
                    Number(currentComp.transportAllowance) +
                    Number(currentComp.otherAllowances)
                    : 0;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-surface-raised/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink dark:text-ink">
                          {isRTL ? emp.firstNameAr : emp.firstNameEn}{" "}
                          {isRTL ? emp.lastNameAr : emp.lastNameEn}
                        </div>
                        <div className="text-xs font-mono text-ink-muted flex items-center gap-1.5 mt-0.5">
                          <span>{emp.employeeNumber}</span>
                          {emp.cprNumber && (
                            <span>
                              {t.employeesList.cpr}
                              {emp.cprNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-ink dark:text-ink font-medium">
                          {emp.jobTitleEn}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {emp.department
                            ? `${emp.department.nameEn} (${emp.department.code})`
                            : t.employeesList.generalOperations}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${statusColors[emp.status] || statusColors.active
                            }`}
                        >
                          {emp.status === "on_leave" && (
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          )}
                          {(t.hrExtensions as Record<string, string>)[
                            emp.status
                          ] || emp.status}
                        </span>
                        {emp.status === "on_leave" && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            {t.employeesList.assignmentBlocked}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono text-xs text-ink dark:text-ink">
                        {Number(emp.leaveBalanceDays).toFixed(1)}
                        {t.shared.days}
                      </td>

                      {canViewPay && <td className="py-3.5 px-4 text-end font-mono text-xs">
                        {totalSalary > 0 ? (
                          <span className="font-semibold text-ink dark:text-ink">
                            {totalSalary.toFixed(3)}
                            {t.shared.bhd}
                          </span>
                        ) : (
                          <span className="text-ink-muted">
                            {t.employeesList.nA}
                          </span>
                        )}
                      </td>}

                      <td className="py-3.5 px-4 text-end">
                        <Link
                          href={ROUTES.hr.employee(emp.id)}
                          className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary dark:hover:text-mint font-medium"
                        >
                          <span>{t.employeesList.profile}</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
