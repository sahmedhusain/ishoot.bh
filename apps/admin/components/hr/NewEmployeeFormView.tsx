"use client";
import {
  PayrollSettingsFields,
  emptyPayrollSettings,
} from "./PayrollSettingsFields";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Department } from "@ishoot/database/types";
import { Card, Button } from "@ishoot/ui";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { createEmployeeAction } from "../../app/actions/hrms";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { toast } from "sonner";

interface NewEmployeeFormViewProps {
  departments: Department[];
  /** Existing user account the new employee record will be linked to. */
  linkUser?: { id: string; fullName: string; email: string } | null;
}

export function NewEmployeeFormView({ departments, linkUser }: NewEmployeeFormViewProps) {
  const router = useRouter();
  const { isRTL, t } = useAdminLocale();

  const [submitting, setSubmitting] = React.useState(false);

  // Form State
  const [payrollSettings, setPayrollSettings] =
    React.useState(emptyPayrollSettings);
  const [firstNameEn, setFirstNameEn] = React.useState(linkUser?.fullName.split(" ")[0] ?? "");
  const [lastNameEn, setLastNameEn] = React.useState(linkUser?.fullName.split(" ").slice(1).join(" ") ?? "");
  const [firstNameAr, setFirstNameAr] = React.useState("");
  const [lastNameAr, setLastNameAr] = React.useState("");
  const [email, setEmail] = React.useState(linkUser?.email ?? "");
  const [phone, setPhone] = React.useState("");
  const [cprNumber, setCprNumber] = React.useState("");
  const [jobTitleEn, setJobTitleEn] = React.useState("");
  const [jobTitleAr, setJobTitleAr] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(
    departments[0]?.id || "",
  );
  const [hireDate, setHireDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [contractType, setContractType] = React.useState<
    "full_time" | "part_time" | "contract"
  >("full_time");

  // Compensation Structure (BHD)
  const [basicSalary, setBasicSalary] = React.useState(500);
  const [housingAllowance, setHousingAllowance] = React.useState(100);
  const [transportAllowance, setTransportAllowance] = React.useState(50);
  const [otherAllowances, setOtherAllowances] = React.useState(0);

  const totalMonthlyGross =
    basicSalary + housingAllowance + transportAllowance + otherAllowances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstNameEn.trim() || !lastNameEn.trim() || !jobTitleEn.trim()) {
      toast.error(t.hrText.text113);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(t.hrText.text114);
    try {
      const res = await createEmployeeAction({
        firstNameEn: firstNameEn.trim(),
        lastNameEn: lastNameEn.trim(),
        firstNameAr: firstNameAr.trim() || undefined,
        lastNameAr: lastNameAr.trim() || undefined,
        email: email.trim() || null,
        phone: phone.trim() || null,
        cprNumber: cprNumber.trim() || null,
        jobTitleEn: jobTitleEn.trim(),
        jobTitleAr: jobTitleAr.trim() || undefined,
        departmentId: departmentId || null,
        hireDate,
        contractType,
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        payrollSettings,
        userId: linkUser?.id,
      });

      if (res.success && res.employee) {
        toast.success(
          `Employee ${res.employee.employeeNumber} created successfully`,
          { id: toastId },
        );
        router.push(`/dashboard/hr/employees/${res.employee.id}`);
      } else {
        toast.error(t.hrText.text115, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.hrText.extra302, {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
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
            <div className="text-xs font-mono uppercase tracking-widest text-[#09937F] font-medium">
              {t.hrText.text116}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t.hrText.text117}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hr/employees"
            className="px-4 py-2 text-xs font-medium rounded-md border border-[#EAEAEA] dark:border-white/10 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {t.hrText.text23}
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#014842] hover:bg-[#013833] text-white px-5 py-2 rounded-md font-medium text-xs active:scale-[0.98] transition-all shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? t.hrText.text215 : t.hrText.extra303}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal & Compliance Information */}
        <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2 border-b border-[#EAEAEA] dark:border-white/10 pb-3">
            <ShieldCheck className="w-4 h-4 text-[#09937F]" />
            {t.hrText.text118}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text119}
              </label>
              <input
                type="text"
                required
                value={firstNameEn}
                onChange={(e) => setFirstNameEn(e.target.value)}
                placeholder={t.hrText.text120}
                className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text121}
              </label>
              <input
                type="text"
                required
                value={lastNameEn}
                onChange={(e) => setLastNameEn(e.target.value)}
                placeholder={t.hrText.text122}
                className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text123}
              </label>
              <input
                type="text"
                dir="rtl"
                value={firstNameAr}
                onChange={(e) => setFirstNameAr(e.target.value)}
                placeholder={t.hrText.text124}
                className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text125}
              </label>
              <input
                type="text"
                dir="rtl"
                value={lastNameAr}
                onChange={(e) => setLastNameAr(e.target.value)}
                placeholder={t.hrText.text126}
                className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text127}
              </label>
              <input
                type="text"
                value={cprNumber}
                onChange={(e) => setCprNumber(e.target.value)}
                placeholder={t.hrText.text128}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text129}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.hrText.text130}
                className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text131}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+973 39000000"
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Job & Department Details */}
        <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2 border-b border-[#EAEAEA] dark:border-white/10 pb-3">
            <Building className="w-4 h-4 text-[#09937F]" />
            {t.hrText.text132}
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
                placeholder={t.hrText.text133}
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
                placeholder={t.hrText.text134}
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
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text135}
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as any)}
                className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2.5 text-slate-900 dark:text-white"
              >
                <option value="full_time">{t.hrText.text136}</option>
                <option value="part_time">{t.hrText.text137}</option>
                <option value="contract">{t.hrText.text138}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text139}
              </label>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Compensation & Allowances */}
        <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] dark:border-white/10 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#09937F]" />
              {t.hrText.text140}
            </h2>
            <div className="text-xs font-mono font-semibold text-[#014842] dark:text-[#7de0d1]">
              {t.hrText.text141}
              {totalMonthlyGross.toFixed(3)}
              {t.hrText.text33}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                {t.hrText.text142}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                {t.hrText.text34}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={housingAllowance}
                onChange={(e) => setHousingAllowance(Number(e.target.value))}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                {t.hrText.text143}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={transportAllowance}
                onChange={(e) => setTransportAllowance(Number(e.target.value))}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                {t.hrText.text35}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={otherAllowances}
                onChange={(e) => setOtherAllowances(Number(e.target.value))}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </Card>
        <PayrollSettingsFields
          value={payrollSettings}
          onChange={setPayrollSettings}
        />
      </div>
    </form>
  );
}
