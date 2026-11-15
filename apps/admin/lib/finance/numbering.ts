import { listTableRows, upsertTableRow } from "../api/tables";
import { formatDocumentNumber } from "../constants/finance";
import { reserveDocumentNumber } from "../api/company";

export async function allocateDocumentNumber(
  kind: "invoice" | "receipt",
  documentDate: Date,
  _client?: unknown,
): Promise<string> {
  try {
    const num = await reserveDocumentNumber(
      kind,
      documentDate.toISOString().slice(0, 10),
      `alloc:${kind}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    );
    if (num) return num;
  } catch {}
  const settings = await listTableRows<any>("system", "company_setting").catch(() => []);
  const company = settings[0];
  if (!company) {
    return formatDocumentNumber(kind === "invoice" ? "INV" : "REC", documentDate.getFullYear(), 1);
  }
  const nextVal =
    kind === "invoice"
      ? Number(company.invoiceNextNumber ?? 1)
      : Number(company.receiptNextNumber ?? 1);
  await upsertTableRow("system", "company_setting", {
    ...company,
    ...(kind === "invoice"
      ? { invoiceNextNumber: nextVal + 1 }
      : { receiptNextNumber: nextVal + 1 }),
  });
  const prefix =
    kind === "invoice"
      ? company.invoicePrefix || "INV"
      : company.receiptPrefix || "REC";
  return formatDocumentNumber(prefix, documentDate.getFullYear(), nextVal);
}
