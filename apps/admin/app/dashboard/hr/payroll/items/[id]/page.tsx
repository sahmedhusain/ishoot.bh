import { notFound } from "next/navigation";
import { getPayrollItemDetail } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../../../lib/auth";
import { PayrollItemView } from "../../../../../../components/hr/PayrollItemView";
import { pageMetadata } from "../../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/payroll/items/[id]");

export const dynamic = "force-dynamic";

export default async function PayrollItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("payroll", "read");
  const { id } = await params;
  const detail = await getPayrollItemDetail(id);
  if (!detail) notFound();
  const [canEdit, canPay] = await Promise.all([hasPermission("payroll", "edit"), hasPermission("payroll", "issue_send")]);
  return <PayrollItemView detail={JSON.parse(JSON.stringify(detail))} canEdit={canEdit} canPay={canPay} />;
}
