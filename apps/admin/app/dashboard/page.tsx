import * as React from 'react';
import {
  getFinancialSummary,
  getCRMDeals,
  getAllInquiries,
  getCompanySettings,
  getCalendarEvents,
} from '@ishoot/database';
import { ExecutiveDashboardView } from '../../components/dashboard/ExecutiveDashboardView';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [finance, deals, inquiries, company, upcomingEvents] = await Promise.all([
    getFinancialSummary(),
    getCRMDeals(),
    getAllInquiries(),
    getCompanySettings(),
    getCalendarEvents(new Date()),
  ]);

  return (
    <ExecutiveDashboardView
      finance={finance}
      deals={deals}
      inquiries={inquiries}
      company={company}
      upcomingEvents={upcomingEvents}
    />
  );
}
