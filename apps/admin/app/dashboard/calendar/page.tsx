import * as React from 'react';
import { getCalendarEvents, getCRMDeals } from '@ishoot/database';
import { OdooCalendarView } from '../../../components/calendar/OdooCalendarView';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const [events, deals] = await Promise.all([
    getCalendarEvents(),
    getCRMDeals(),
  ]);

  return (
    <OdooCalendarView initialEvents={events} deals={deals} />
  );
}
