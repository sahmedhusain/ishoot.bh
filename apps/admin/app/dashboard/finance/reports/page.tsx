import { requirePermission } from "../../../../lib/auth";
import { getFinancialSummaryReport } from "@ishoot/database";
import { FinancialReportsView } from "../../../../components/finance/FinancialReportsView";

export const dynamic = "force-dynamic";

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("reports", "read");
  const query = await searchParams;
  const basis = query.basis === "accrual" ? "accrual" : "cash";
  const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom : undefined;
  const dateTo = typeof query.dateTo === "string" ? query.dateTo : undefined;

  const report = await getFinancialSummaryReport({
    basis,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  });

  return (
    <FinancialReportsView
      report={report}
      currentBasis={basis}
      dateFrom={dateFrom}
      dateTo={dateTo}
    />
  );
}
