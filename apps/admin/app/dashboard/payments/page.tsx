import { ROUTES } from "../../../constants/routes";
import { requirePermission } from "../../../lib/auth";
import { getPaymentsPage, type ListParameters } from "@ishoot/database";
import { PaymentsManagementView } from "../../../components/payments/PaymentsManagementView";
import { ListControls } from "../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePermission("payments", "read");
  const result = await getPaymentsPage(await searchParams);
  return <><ListControls path={ROUTES.payments.list} {...result} exportDomain="payments" /><PaymentsManagementView initialPayments={result.items} {...result} /></>;
}
