import {
  getCalendarFeedInfo,
  getCalendarFor,
  isCalendarSyncEnabled,
  getDepartmentTree,
  getStaffRoles,
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { requirePagePermission } from "../../../lib/auth";
import { CalendarView } from "../../../components/calendar/CalendarView";
import { pageMetadata } from "../../../lib/company-metadata";
import { LiveRefresh } from "../../../components/live/LiveRefresh";

export const generateMetadata = () => pageMetadata("calendar");

export const dynamic = "force-dynamic";

/** The signed-in person's calendar: their events, what is shared with them, and the dated work of their role. */
export default async function CalendarPage() {
  const user = await requirePagePermission("calendar", "read");
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 7 * 86_400_000,
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0) + 8 * 86_400_000,
  );
  const [events, rawEmployees, departmentTree, feed, syncEnabled, dbRoles] =
    await Promise.all([
      getCalendarFor(user.id, start, end),
      listEmployees().catch(() => []),
      getDepartmentTree(),
      getCalendarFeedInfo(user.id),
      isCalendarSyncEnabled(),
      getStaffRoles(),
    ]);
  const people = rawEmployees
    .filter((e) => e.id !== user.id)
    .map((e: any) => ({
      id: e.id,
      fullName: `${e.firstNameEn || e.first_name_en || ""} ${e.lastNameEn || e.last_name_en || ""}`.trim() || e.id,
    }));
  const departments = departmentTree.map((d) => ({
    id: d.id,
    nameEn: d.name_en,
    nameAr: d.name_ar,
  }));
  const roles = dbRoles.map((r) => ({
    id: r.id,
    nameEn: r.nameEn || r.id,
    nameAr: r.nameAr || r.id,
  }));
  return (
    <>
      <LiveRefresh resources={["calendar"]} notificationCategories={["calendar"]} />
      <CalendarView
        initialEvents={events}
        currentUserId={user.id}
        people={people.map((p) => ({ id: p.id, name: p.fullName }))}
        departments={departments}
        roles={roles}
        feedConnected={!!feed}
        feed={feed}
        syncEnabled={syncEnabled}
      />
    </>
  );
}
