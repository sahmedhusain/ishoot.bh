import * as React from "react";
import {
  getFinancialSummary,
  getMonthlyCashflow,
  getCRMDeals,
  getAllInquiries,
  getCompanySettings,
  getCalendarEvents,
} from "@ishoot/database";
import { ExecutiveDashboardView } from "../../components/dashboard/ExecutiveDashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [finance, monthlyCashflow, deals, inquiries, company, upcomingEvents] =
    await Promise.all([
      getFinancialSummary(),
      getMonthlyCashflow(6),
      getCRMDeals(),
      getAllInquiries(),
      getCompanySettings(),
      getCalendarEvents(new Date()),
    ]);

  return (
    <ExecutiveDashboardView
      finance={finance}
      monthlyCashflow={monthlyCashflow}
      deals={deals}
      inquiries={inquiries}
      company={company}
      upcomingEvents={upcomingEvents}
    />
  );
}
