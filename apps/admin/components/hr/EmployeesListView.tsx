"use client";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Employee, Department } from "@ishoot/database/types";
import { Card } from "@ishoot/ui";
import { UserPlus, Search, Clock, ArrowRight, AlertCircle } from "lucide-react";

interface EmployeesListViewProps {
  employees: Employee[];
  departments: Department[];
  total: number;
  currentDepartment: string;
  currentStatus: string;
  search: string;
  page: number;
}

export function EmployeesListView({
  employees,
  departments,
  total,
  currentDepartment,
  currentStatus,
  search,
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
      "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#09937F] bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-[#7de0d1] px-2.5 py-0.5 rounded-full font-medium">
              {t.employeesList.humanCapitalAndOrganization}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.employeesList.employeesAndTalentDirectory}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t.employeesList.manageOrganizationalRosterCompensationProfiles}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.hr.newEmployee()}
            className="inline-flex items-center gap-2 bg-[#014842] hover:bg-[#013833] text-white px-4 py-2 rounded-md text-sm font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.employeesList.onboardEmployee}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.employeesList.totalStaffCount}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {total}
          </div>
          <div className="text-xs text-slate-400">{t.employeesList.totalRegisteredProfiles}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.shared.activeDuty}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <div className="text-xs text-slate-400">{t.employeesList.availableForAssignment}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.employeesList.onApprovedLeave}
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2">
            {onLeaveCount}
            {onLeaveCount > 0 && <Clock className="w-4 h-4" />}
          </div>
          <div className="text-xs text-slate-400">{t.employeesList.strictlyBlockedFromAllocation}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.employeesList.departments}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {departments.length}
          </div>
          <div className="text-xs text-slate-400">{t.employeesList.functionalUnits}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 w-full sm:w-80"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.employeesList.searchByNameEmployeeTitle}
              className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 pl-9 pr-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs rounded-md font-medium text-slate-700 dark:text-neutral-300"
          >
            {t.employeesList.search}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={currentDepartment}
            onChange={(e) => updateFilter(e.target.value, currentStatus)}
            className="text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 px-3 py-2 text-slate-800 dark:text-neutral-200"
          >
            <option value="all">{t.employeesList.allDepartments}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameEn} / {d.nameAr}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={currentStatus}
            onChange={(e) => updateFilter(currentDepartment, e.target.value)}
            className="text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 px-3 py-2 text-slate-800 dark:text-neutral-200"
          >
            <option value="all">{t.employeesList.allStatuses}</option>
            <option value="active">{t.shared.activeDuty}</option>
            <option value="on_leave">{t.shared.onLeave}</option>
            <option value="suspended">{t.shared.suspended}</option>
            <option value="terminated">{t.shared.terminated}</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <Card className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#EAEAEA] dark:border-white/10 text-xs font-mono uppercase text-slate-400 bg-slate-50/50 dark:bg-neutral-900/30">
                <th className="py-3 px-4">{t.shared.employee}</th>
                <th className="py-3 px-4">{t.employeesList.jobTitleAndDept}</th>
                <th className="py-3 px-4">{t.employeesList.statusAndAvailability}</th>
                <th className="py-3 px-4 text-right">{t.employeesList.leaveBalance}</th>
                <th className="py-3 px-4 text-right">{t.employeesList.compensation}</th>
                <th className="py-3 px-4 text-right">{t.employeesList.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA] dark:divide-white/5">
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-xs text-slate-400"
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
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {isRTL ? emp.firstNameAr : emp.firstNameEn}{" "}
                          {isRTL ? emp.lastNameAr : emp.lastNameEn}
                        </div>
                        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
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
                        <div className="text-slate-800 dark:text-neutral-200 font-medium">
                          {emp.jobTitleEn}
                        </div>
                        <div className="text-xs text-slate-400">
                          {emp.department
                            ? `${emp.department.nameEn} (${emp.department.code})`
                            : t.employeesList.generalOperations}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                            statusColors[emp.status] || statusColors.active
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

                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 dark:text-neutral-300">
                        {Number(emp.leaveBalanceDays).toFixed(1)}
                        {t.shared.days}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {totalSalary > 0 ? (
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {totalSalary.toFixed(3)}
                            {t.shared.bhd}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {t.employeesList.nA}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={ROUTES.hr.employee(emp.id)}
                          className="inline-flex items-center gap-1 text-xs text-[#09937F] hover:text-[#014842] dark:hover:text-[#7de0d1] font-medium"
                        >
                          <span>{t.employeesList.profile}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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
