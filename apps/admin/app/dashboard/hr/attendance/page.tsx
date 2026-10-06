import { getAttendanceSheet } from "@ishoot/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { AttendanceSheetView } from "../../../../components/hr/AttendanceSheetView";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePagePermission("employees", "read");
  const { month } = await searchParams;
  const now = new Date();
  const [year, m] = /^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "") ? month!.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const [sheet, canEdit] = await Promise.all([getAttendanceSheet(year, m), hasPermission("employees", "edit")]);
  return <AttendanceSheetView sheet={sheet} canEdit={canEdit} />;
}
