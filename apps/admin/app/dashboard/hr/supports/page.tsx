import {
  db,
  getSupportClaims,
  listEmployeeSupports,
  listSupportPrograms,
} from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { SupportProgramsView } from "../../../../components/supports/SupportProgramsView";
import { SupportClaimsPanel } from "../../../../components/hr/SupportClaimsPanel";

export const dynamic = "force-dynamic";

/** Wage-support programmes (e.g. Wage support fund): their dated terms, each employee's application and decision, and claims. */
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
  const [programs, enrolments, employees, canEdit, claims] = await Promise.all([
    listSupportPrograms(),
    listEmployeeSupports({
      programId: program === "all" ? undefined : program,
      status,
    }),
    db.employee.findMany({
      where: { status: { not: "terminated" } },
      select: {
        id: true,
        employeeNumber: true,
        firstNameEn: true,
        lastNameEn: true,
        firstNameAr: true,
        lastNameAr: true,
      },
      orderBy: { firstNameEn: "asc" },
    }),
    hasPermission("payroll", "edit"),
    getSupportClaims(),
  ]);
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
