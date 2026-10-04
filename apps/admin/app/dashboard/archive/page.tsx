import { requirePermission } from "../../../lib/auth";
import { getAttachmentsPage, type ListParameters } from "@ishoot/database";
import { ArchiveManagementView } from "../../../components/archive/ArchiveManagementView";
import { ListControls } from "../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function ArchiveVaultPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  for (const resource of ["contacts", "deals", "invoices", "payments", "expenses", "settings"] as const) await requirePermission(resource, "read");
  const result = await getAttachmentsPage(await searchParams);
  return <><ListControls exportDomain="archive" path="/dashboard/archive" {...result} statuses={["payment", "invoice", "contact", "customer_vault", "deal", "company_setting", "general"]} /><ArchiveManagementView key={JSON.stringify(result.filters) + result.page} initialAttachments={result.items} counts={result.counts} /></>;
}
