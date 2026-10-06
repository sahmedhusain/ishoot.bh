import { ROUTES } from "../../../constants/routes";
import { requirePagePermission } from "../../../lib/auth";
import { getPaymentsPage, type ListParameters } from "@ishoot/database";
import { PaymentsManagementView } from "../../../components/payments/PaymentsManagementView";
import { ListControls } from "../../../components/shared/ListControls";
export const dynamic = "force-dynamic";
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<ListParameters> }) {
  await requirePagePermission("payments", "read");
  const result = await getPaymentsPage(await searchParams);
  return <PaymentsManagementView initialPayments={result.items} {...result} controls={<ListControls path={ROUTES.payments.list} {...result} exportDomain="payments" />} />;
}
