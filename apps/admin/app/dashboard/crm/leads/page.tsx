import { requirePermission } from "../../../../lib/auth";
import { getAllInquiries, hasPermission } from "@ishoot/database";
import { LeadsManagementView } from "../../../../components/crm/LeadsManagementView";
export const dynamic = "force-dynamic";
export default async function LeadsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePermission("leads", "read");
  const canSupport = await hasPermission(
    user.role,
    "support",
    "read",
    user.permissions as Record<string, boolean>,
  );
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number((await searchParams).page)) || 1),
  );
  const inquiries = await getAllInquiries(canSupport, page);
  return <LeadsManagementView initialInquiries={inquiries} page={page} />;
}
