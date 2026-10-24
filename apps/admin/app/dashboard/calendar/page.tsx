import { db, getCalendarFeedInfo, getCalendarFor } from "@platform/database";
import { requirePagePermission } from "../../../lib/auth";
import { OdooCalendarView } from "../../../components/calendar/OdooCalendarView";

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
  const [events, people, departments, roles, feed] = await Promise.all([
    getCalendarFor(user.id, start, end),
    db.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    db.department.findMany({
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: "asc" },
    }),
    db.role.findMany({
      select: { id: true, nameEn: true, nameAr: true },
      orderBy: { nameEn: "asc" },
    }),
    getCalendarFeedInfo(user.id),
  ]);
  return (
    <OdooCalendarView
      initialEvents={events}
      currentUserId={user.id}
      people={people.map((p) => ({ id: p.id, name: p.fullName }))}
      departments={departments}
      roles={roles}
      feedConnected={!!feed}
    />
  );
}
