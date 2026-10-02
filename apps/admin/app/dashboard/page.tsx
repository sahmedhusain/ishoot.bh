import { requireAuth } from "../../lib/auth";
import { hasPermission } from "@ishoot/database";
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
  const user = await requireAuth();
  const can = (resource: "finance_analytics" | "deals" | "leads" | "calendar") => hasPermission(user.role, resource, "read", user.permissions as Record<string, boolean> | undefined);
  const [canFinance, canDeals, canLeads, canCalendar] = await Promise.all([can("finance_analytics"), can("deals"), can("leads"), can("calendar")]);
  const [finance, monthlyCashflow, deals, inquiries, company, upcomingEvents] =
    await Promise.all([
      canFinance ? getFinancialSummary() : Promise.resolve({ revenue: 0, expenses: 0, netProfit: 0, profitMargin: 0, outstanding: 0, overdue: 0, discountsGiven: 0, vatCollected: 0, currency: "BHD" as const }),
      canFinance ? getMonthlyCashflow(6) : Promise.resolve([]),
      canDeals ? getCRMDeals() : Promise.resolve([]),
      canLeads ? getAllInquiries() : Promise.resolve([]),
      getCompanySettings(),
      canCalendar ? getCalendarEvents(new Date()) : Promise.resolve([]),
    ]);

  return (
    <ExecutiveDashboardView
      finance={finance}
      monthlyCashflow={monthlyCashflow}
      deals={deals}
      inquiries={inquiries}
      company={canFinance ? company : { ...company, bank_name: "", bank_iban: "", bank_account_number: "", bank_swift: "", vat_certificate_url: undefined, stamp_url: undefined, signature_url: undefined }}
      upcomingEvents={upcomingEvents}
    />
  );
}
