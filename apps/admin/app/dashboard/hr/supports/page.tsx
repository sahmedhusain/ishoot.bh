import {
  getSupportClaims,
  listEmployeeSupports,
  listSupportPrograms,
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { SupportProgramsView } from "../../../../components/supports/SupportProgramsView";
import { SupportClaimsPanel } from "../../../../components/hr/SupportClaimsPanel";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/supports");

export const dynamic = "force-dynamic";

export default async function SupportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("payroll", "read");
  const query = await searchParams;
  const pick = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  const program = pick("program") ?? "all";
  const status = pick("status") ?? "all";
  const [programs, enrolments, rawEmployees, canEdit, claims] = await Promise.all([
    listSupportPrograms(),
    listEmployeeSupports({
      programId: program === "all" ? undefined : program,
      status,
    }),
    listEmployees().catch(() => []),
    hasPermission("payroll", "edit"),
    getSupportClaims(),
  ]);
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employee_number || e.id,
    firstNameEn: e.first_name_en || "",
    lastNameEn: e.last_name_en || "",
    firstNameAr: e.first_name_ar || e.first_name_en || "",
    lastNameAr: e.last_name_ar || e.last_name_en || "",
  }));
  return (
    <div className="space-y-8">
      <SupportProgramsView
        programs={programs}
        enrolments={enrolments}
        employees={employees.map((e) => ({
          id: e.id,
          number: e.employeeNumber,
          nameEn: `${e.firstNameEn} ${e.lastNameEn}`,
          nameAr: `${e.firstNameAr} ${e.lastNameAr}`,
        }))}
        filters={{ program, status }}
        canEdit={canEdit}
      />
      <div className="max-w-6xl mx-auto">
        <SupportClaimsPanel claims={claims} canRecord={canEdit} />
      </div>
    </div>
  );
}
