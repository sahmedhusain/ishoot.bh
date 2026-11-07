import { getCurrentPermissions, requirePagePermission } from "../../../../lib/auth";
import { getExpenseCategories } from "@platform/database";
import { NewClaimFormView } from "../../../../components/claims/NewClaimFormView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("claims/new");

export const dynamic = "force-dynamic";

export default async function NewClaimPage() {
  const user = await requirePagePermission("self_service", "create");
  const [categories, grants] = await Promise.all([getExpenseCategories(), getCurrentPermissions()]);
  const meetings: { id: string; title: string; startDate: string }[] = [];
  return (
    <NewClaimFormView
      categories={categories}
      meetings={meetings}
      canLinkDeals={grants["deals:read"] === true}
      canLinkInvoices={grants["invoices:read"] === true}
    />
  );
}
