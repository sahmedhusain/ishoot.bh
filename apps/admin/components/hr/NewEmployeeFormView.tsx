"use client";
import { useCompanyCurrency } from "@platform/ui";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import {
  PayrollSettingsFields,
  emptyPayrollSettings,
} from "./PayrollSettingsFields";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Department } from "@platform/database/types";
import { Card, Button, Input, PhoneInput, Select, useCompanyCountry } from "@platform/ui";
import type { EmployeeCredentialInput, EmployeeIdentityInput } from "@platform/database";
import { needsWorkVisa } from "@platform/database/constants/employee-documents";
import { countryOptions } from "@platform/database/constants/clients";
import { CredentialFields, emptyCredential } from "./CredentialFields";
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
  visaExemptCountries?: string[];
  /** Existing user account the new employee record will be linked to. */
  linkUser?: { id: string; fullName: string; email: string } | null;
  /** Salary and payroll settings are set only by payroll managers; others leave them for payroll to complete. */
  canSetPay?: boolean;
}

export function NewEmployeeFormView({ departments, linkUser, canSetPay = false, visaExemptCountries = [] }: NewEmployeeFormViewProps) {
  const companyCurrency = useCompanyCurrency();
  const router = useRouter();
  const companyCountry = useCompanyCountry();
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
  const [identity, setIdentity] = React.useState<EmployeeIdentityInput>({ nationality: "BH", gender: "", passport_country: "" });
  const [visa, setVisa] = React.useState<EmployeeCredentialInput>(emptyCredential("visa"));
  const countries = React.useMemo(() => countryOptions(t.countries), [t.countries]);
  const visaRequired = needsWorkVisa(identity.nationality, [...visaExemptCountries, ...(companyCountry ? [companyCountry] : [])]);
  const setId = <K extends keyof EmployeeIdentityInput>(key: K, value: EmployeeIdentityInput[K]) => setIdentity((v) => ({ ...v, [key]: value }));
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

  // Compensation in the company currency
  const [basicSalary, setBasicSalary] = React.useState(500);
  const [housingAllowance, setHousingAllowance] = React.useState(100);
  const [transportAllowance, setTransportAllowance] = React.useState(50);
  const [otherAllowances, setOtherAllowances] = React.useState(0);

  const markSaved = useUnsavedChanges({ payrollSettings, firstNameEn, lastNameEn, firstNameAr, lastNameAr, email, phone, cprNumber, identity, visa, jobTitleEn, jobTitleAr, departmentId, hireDate, contractType, basicSalary, housingAllowance, transportAllowance, otherAllowances });

  const totalMonthlyGross =
    basicSalary + housingAllowance + transportAllowance + otherAllowances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstNameEn.trim() || !lastNameEn.trim() || !jobTitleEn.trim()) {
      toast.error(t.newEmployeeForm.pleaseFillInAllMandatory);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(t.newEmployeeForm.registeringEmployeeRecordInHrms);
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
        ...(canSetPay && { basicSalary, housingAllowance, transportAllowance, otherAllowances, payrollSettings }),
        userId: linkUser?.id,
        identity: { ...identity, cpr_number: cprNumber.trim() || undefined },
        // A visa is recorded for nationals who need one, once any of its details are filled in.
        credentials: visaRequired && (visa.number || visa.expiry_date || visa.cost_amount !== undefined) ? [visa] : [],
      });

      if (res.success && res.employee) {
        toast.success(formatMessage(t.employeeResidency.created, { number: res.employee.employeeNumber }), { id: toastId });
        if (!markSaved()) return;
        router.push(ROUTES.hr.employee(res.employee.id));
      } else {
        toast.error(t.newEmployeeForm.failedToOnboardEmployee, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.newEmployeeForm.errorOnboardingEmployee), {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form inert={submitting} aria-busy={submitting} onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
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
            <div className="text-xs font-mono uppercase tracking-widest text-accent font-medium">
              {t.newEmployeeForm.hrmsRegistry}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">
              {t.newEmployeeForm.onboardNewEmployee}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.hr.employees}
            className="px-4 py-2 text-xs font-medium rounded-md border border-outline-variant text-ink-muted dark:text-ink hover:bg-surface-raised dark:hover:bg-surface-raised transition-colors"
          >
            {t.shared.cancel}
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-5 py-2 rounded-md font-medium text-xs active:scale-[0.98] transition-all shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? t.shared.saving : t.newEmployeeForm.saveEmployeeRecord}</span>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal & Compliance Information */}
        <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono flex items-center gap-2 border-b border-outline-variant pb-3">
            <ShieldCheck className="w-4 h-4 text-accent" />
            {t.newEmployeeForm.personalAndStatutoryComplianceBahrain}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.firstNameEnglish}
              </span>
              <input
                type="text"
                required
                value={firstNameEn}
                onChange={(e) => setFirstNameEn(e.target.value)}
                placeholder={t.newEmployeeForm.eGAhmed}
                className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
               dir="ltr"/>
            </label>
            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.lastNameEnglish}
              </span>
              <input
                type="text"
                required
                value={lastNameEn}
                onChange={(e) => setLastNameEn(e.target.value)}
                placeholder={t.newEmployeeForm.eGAlMansoor}
                className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
               dir="ltr"/>
            </label>

            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.firstNameArabic}
              </span>
              <input
                type="text"
                dir="rtl"
                value={firstNameAr}
                onChange={(e) => setFirstNameAr(e.target.value)}
                placeholder={t.newEmployeeForm.exampleAhmed}
                className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.lastNameArabic}
              </span>
              <input
                type="text"
                dir="rtl"
                value={lastNameAr}
                onChange={(e) => setLastNameAr(e.target.value)}
                placeholder={t.newEmployeeForm.exampleAlMansoor}
                className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
              />
            </label>

            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.cprNumberBahrainId}
              </span>
              <input
                type="text"
                value={cprNumber}
                onChange={(e) => setCprNumber(e.target.value)}
                placeholder={t.newEmployeeForm.eG950812345}
                className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.emailAddress}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.newEmployeeForm.employeeEmailExample}
                className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
              />
            </label>
            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.shared.phoneNumber}
              </span>
              <PhoneInput
                value={phone}
                onChange={setPhone}
              />
            </label>
          </div>
        </Card>

        {/* Job & Department Details */}
        <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono flex items-center gap-2 border-b border-outline-variant pb-3">
            <ShieldCheck className="w-4 h-4 text-accent" />
            {t.employeeResidency.identity}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.nationality}</span>
              <Select value={identity.nationality ?? ""} onChange={(e) => setId("nationality", e.target.value)}>
                <option value="">{t.employeeResidency.fields.select}</option>
                {countries.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.dateOfBirth}</span>
              <Input type="date" value={identity.date_of_birth ?? ""} onChange={(e) => setId("date_of_birth", e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.gender}</span>
              <Select value={identity.gender ?? ""} onChange={(e) => setId("gender", e.target.value as "male" | "female" | "")}>
                <option value="">{t.employeeResidency.fields.select}</option>
                <option value="male">{t.employeeResidency.genders.male}</option>
                <option value="female">{t.employeeResidency.genders.female}</option>
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.cprExpiry}</span>
              <Input type="date" value={identity.cpr_expiry_date ?? ""} onChange={(e) => setId("cpr_expiry_date", e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.passportNumber}</span>
              <Input dir="ltr" value={identity.passport_number ?? ""} onChange={(e) => setId("passport_number", e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.passportCountry}</span>
              <Select value={identity.passport_country || identity.nationality || ""} onChange={(e) => setId("passport_country", e.target.value)}>
                <option value="">{t.employeeResidency.fields.select}</option>
                {countries.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">{t.employeeResidency.fields.passportExpiry}</span>
              <Input type="date" value={identity.passport_expiry_date ?? ""} onChange={(e) => setId("passport_expiry_date", e.target.value)} />
            </label>
          </div>
          {visaRequired ? (
            <div className="rounded-2xl border border-outline-variant bg-ink/[0.02] p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-ink">{t.employeeResidency.visaTitle}</h3>
                <p className="text-[11px] text-ink-muted">{t.employeeResidency.visaHint}</p>
              </div>
              <CredentialFields value={visa} onChange={setVisa} />
            </div>
          ) : (
            <p className="text-[11px] text-ink-muted">{t.employeeResidency.noVisaNeeded}</p>
          )}
        </Card>

        <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono flex items-center gap-2 border-b border-outline-variant pb-3">
            <Building className="w-4 h-4 text-accent" />
            {t.newEmployeeForm.jobRoleAndOrganization}
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
                placeholder={t.newEmployeeForm.eGSeniorCinematographer}
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
                placeholder={t.newEmployeeForm.exampleSeniorCinematographer}
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
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn} ({d.code})
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.newEmployeeForm.contractType}
              </span>
              <Select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as any)}
                className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2.5 text-ink dark:text-ink"
              >
                <option value="full_time">{t.newEmployeeForm.fullTimeEmployment}</option>
                <option value="part_time">{t.newEmployeeForm.partTime}</option>
                <option value="contract">{t.newEmployeeForm.independentRetainerContract}</option>
              </Select>
            </label>

            <label>
              <span className="block text-xs font-medium text-ink dark:text-ink mb-1">
                {t.shared.hireDate}
              </span>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
              />
            </label>
          </div>
        </Card>

        {/* Compensation & Allowances */}
        {canSetPay ? (<>
          <Card className="p-6 bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg space-y-4" data-page-section>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink dark:text-ink font-mono flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                {t.newEmployeeForm.monthlyCompensationStructureBhd}
              </h2>
              <div className="text-xs font-mono font-semibold text-primary dark:text-mint">
                {t.newEmployeeForm.totalMonthlyGross}
                {totalMonthlyGross.toFixed(3)}
                {companyCurrency}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label>
                <span className="block text-xs font-medium text-ink-muted dark:text-ink-muted mb-1">
                  {t.newEmployeeForm.basicSalaryBhd}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>
              <label>
                <span className="block text-xs font-medium text-ink-muted dark:text-ink-muted mb-1">
                  {t.shared.housingAllowance}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={housingAllowance}
                  onChange={(e) => setHousingAllowance(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>
              <label>
                <span className="block text-xs font-medium text-ink-muted dark:text-ink-muted mb-1">
                  {t.newEmployeeForm.transportAllowance}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={transportAllowance}
                  onChange={(e) => setTransportAllowance(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>
              <label>
                <span className="block text-xs font-medium text-ink-muted dark:text-ink-muted mb-1">
                  {t.shared.otherAllowances}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={otherAllowances}
                  onChange={(e) => setOtherAllowances(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </label>
            </div>
          </Card>
          <PayrollSettingsFields
            value={payrollSettings}
            onChange={setPayrollSettings}
          />
        </>) : (
          <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">{t.hrExtensions.payrollCompletesPay}</p>
        )}
      </div>
    </form>
  );
}
