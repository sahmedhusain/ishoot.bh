import { getCurrentPermissions, requirePermission } from "../../../../lib/auth";
import { db, getExpenseCategories } from "@ishoot/database";
import { NewClaimFormView } from "../../../../components/claims/NewClaimFormView";

export const dynamic = "force-dynamic";

export default async function NewClaimPage() {
  const user = await requirePermission("self_service", "create");
  const since = new Date(Date.now() - 90 * 86400000);
  const [categories, grants] = await Promise.all([getExpenseCategories(), getCurrentPermissions()]);
  const meetings = await db.calendarEvent.findMany({
      // Recent meetings: the claimant's own, or all of them for people who can see the calendar.
      where: {
        startDate: { gte: since, lte: new Date(Date.now() + 86400000) },
        ...(grants["calendar:read"] === true ? {} : { createdById: user.id }),
      },
      select: { id: true, title: true, startDate: true },
      orderBy: { startDate: "desc" },
      take: 60,
    });
  return (
    <NewClaimFormView
      categories={categories}
      meetings={meetings.map((m) => ({ id: m.id, title: m.title, startDate: m.startDate.toISOString() }))}
      canLinkDeals={grants["deals:read"] === true}
      canLinkInvoices={grants["invoices:read"] === true}
    />
  );
}
