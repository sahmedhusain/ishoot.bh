import { getCurrentPermissions,requireAuth } from "../../lib/auth";
import {
getFinancialSummary,
getMonthlyCashflow,
getCRMDealOverview,
db,
getCompanySettings,
getCalendarEvents,
} from "@ishoot/database";
import { ExecutiveDashboardView } from "../../components/dashboard/ExecutiveDashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth();
  const grants = await getCurrentPermissions();
  const canFinance = grants["finance_analytics:read"] === true;
  const canDeals = grants["deals:read"] === true;
  const canLeads = grants["leads:read"] === true;
  const canCalendar = grants["calendar:read"] === true;
  const [finance, monthlyCashflow, deals, inquiries, company, upcomingEvents] =
    await Promise.all([
      canFinance
        ? getFinancialSummary()
        : Promise.resolve({
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            profitMargin: 0,
            outstanding: 0,
            overdue: 0,
            discountsGiven: 0,
            vatCollected: 0,
            currency: "BHD" as const,
          }),
      canFinance ? getMonthlyCashflow(6) : Promise.resolve([]),
      canDeals
        ? getCRMDealOverview(canFinance)
        : Promise.resolve({
            recent: [],
            stageStats: {},
            activeCount: 0,
            activePipelineValue: 0,
          }),
      canLeads
        ? db.inquiry.count({
            where: {
              intent: { not: "complaint" },
              createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
            },
          })
        : Promise.resolve(0),
      getCompanySettings(),
      canCalendar
        ? getCalendarEvents(new Date(), undefined, 3)
        : Promise.resolve([]),
    ]);

  return (
    <ExecutiveDashboardView
      capabilities={{ finance: canFinance, deals: canDeals, leads: canLeads, calendar: canCalendar, createInvoice: grants["invoices:write"] === true && grants["contacts:read"] === true, settings: grants["settings:read"] === true }}
      finance={finance}
      monthlyCashflow={monthlyCashflow}
      dealOverview={deals}
      inquiryCount={inquiries}
      company={
        canFinance
          ? company
          : {
              ...company,
              bank_name: "",
              bank_iban: "",
              bank_account_number: "",
              bank_swift: "",
              vat_certificate_url: undefined,
              stamp_url: undefined,
              signature_url: undefined,
            }
      }
      upcomingEvents={upcomingEvents}
    />
  );
}
