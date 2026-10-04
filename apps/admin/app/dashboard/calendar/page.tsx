import { requirePermission } from "../../../lib/auth";
import { getCalendarEvents } from "@ishoot/database";
import { OdooCalendarView } from "../../../components/calendar/OdooCalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  await requirePermission("calendar", "read");

  const events = await getCalendarEvents();

  return <OdooCalendarView initialEvents={events} deals={[]} />;
}
