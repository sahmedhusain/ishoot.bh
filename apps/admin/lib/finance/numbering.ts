import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { formatDocumentNumber } from "../constants/finance";

type Client = Pick<typeof db, "companySetting">;

/**
 * The single numbering source for invoices and receipts: the company counter (editable in Settings),
 * formatted PREFIX-YYYY-NNNN with the year of the document date. The increment is atomic.
 */
export async function allocateDocumentNumber(
  kind: "invoice" | "receipt",
  documentDate: Date,
  client: any = db,
): Promise<string> {
  const company = await client.companySetting.findFirst({
    select: { id: true },
  });
  if (!company)
    throw new Error(
      serverMessages.configureCompanySettingsBeforeCreatingFinancialRecords,
    );
  const updated = await client.companySetting.update({
    where: { id: company.id },
    data:
      kind === "invoice"
        ? { invoiceNextNumber: { increment: 1 } }
        : { receiptNextNumber: { increment: 1 } },
    select: {
      invoicePrefix: true,
      receiptPrefix: true,
      invoiceNextNumber: true,
      receiptNextNumber: true,
    },
  });
  const [prefix, next] =
    kind === "invoice"
      ? [updated.invoicePrefix, updated.invoiceNextNumber]
      : [updated.receiptPrefix, updated.receiptNextNumber];
  return formatDocumentNumber(prefix, documentDate.getFullYear(), next - 1);
}
