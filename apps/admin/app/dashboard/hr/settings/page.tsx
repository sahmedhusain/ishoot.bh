import { redirect } from "next/navigation";
import { getHrPolicy, listLeaveTypeRules, listPublicHolidays, listShiftTypes } from "@platform/database";
import { ROUTES } from "../../../../constants/routes";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { HrSettingsView } from "../../../../components/hr/HrSettingsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/settings");

export const dynamic = "force-dynamic";

export default async function HrSettingsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requirePagePermission("employees", "read");
  const [canPolicy, canLeave] = await Promise.all([hasPermission("payroll", "edit"), hasPermission("employees", "edit")]);
  if (!canPolicy && !canLeave) redirect(ROUTES.hr.employees);
  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) >= 2000 && Number(yearParam) <= 2200 ? Number(yearParam) : new Date().getUTCFullYear();
  const [policy, leaveTypes, holidays, shiftTypes] = await Promise.all([getHrPolicy(), listLeaveTypeRules(), listPublicHolidays(year), listShiftTypes()]);
  return <HrSettingsView policy={policy} leaveTypes={leaveTypes} holidays={holidays} holidayYear={year} shiftTypes={shiftTypes} canPolicy={canPolicy} canLeave={canLeave} />;
}
