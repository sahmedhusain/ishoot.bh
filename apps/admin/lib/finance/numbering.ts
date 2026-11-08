import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import { formatDocumentNumber } from "../constants/finance";
import { reserveDocumentNumber } from "../api/company";

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
  try {
    const num = await reserveDocumentNumber(
      kind,
      documentDate.toISOString().slice(0, 10),
      `alloc:${kind}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    );
    if (num) return num;
  } catch {}
  const company = await client.companySetting?.findFirst?.({
    select: { id: true },
  });
  if (!company) {
    return formatDocumentNumber(kind === "invoice" ? "INV" : "REC", documentDate.getFullYear(), 1);
  }
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
