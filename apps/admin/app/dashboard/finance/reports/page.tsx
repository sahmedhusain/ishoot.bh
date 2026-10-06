import { requirePagePermission } from "../../../../lib/auth";
import { getFinancialSummaryReport, getFinancialReportDetail } from "@ishoot/database";
import { companyVat } from "@ishoot/database/finance/vat";
import { FinancialReportDetailView } from "../../../../components/finance/FinancialReportDetailView";
import { FinancialReportsView } from "../../../../components/finance/FinancialReportsView";

export const dynamic = "force-dynamic";

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("reports", "read");
  const query = await searchParams;
  const basis = query.basis === "accrual" ? "accrual" : "cash";
  const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom : undefined;
  const dateTo = typeof query.dateTo === "string" ? query.dateTo : undefined;

  const filters = {
    basis,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined,
  } as const;
  const [report, detail, vat] = await Promise.all([getFinancialSummaryReport(filters), getFinancialReportDetail(filters), companyVat()]);
  // VAT figures appear when the company is VAT-registered, or when the period still holds VAT documents.
  const showVat = vat.vatEnabled || detail.vat.hasVatDocuments;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <FinancialReportsView
        report={report}
        currentBasis={basis}
        dateFrom={dateFrom}
        dateTo={dateTo}
        showVat={showVat}
      />
      <FinancialReportDetailView detail={detail} showVat={showVat} />
    </div>
  );
}
