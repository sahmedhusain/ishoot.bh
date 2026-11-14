import { serverMessages } from "@platform/locales";
export type PdfDocumentType = "invoice" | "receipt" | "quotation";

function documentPdfUrl(
  type: PdfDocumentType,
  id: string,
  locale: string,
  download = false,
) {
  return `/api/documents/${encodeURIComponent(id)}/pdf?type=${type}&locale=${locale}${download ? "&download=true" : ""}`;
}

export async function printDocumentPdf(
  type: PdfDocumentType,
  id: string,
  locale: string,
): Promise<void> {
  return printPdfUrl(documentPdfUrl(type, id, locale));
}

export const salaryDocumentPdfUrl = (
  id: string,
  locale: string,
  download = false,
) =>
  `/api/hr/documents/${encodeURIComponent(id)}/pdf?locale=${locale}${download ? "&download=true" : ""}`;

export const momPdfUrl = (id: string, locale: string, download = false) =>
  `/api/moms/${encodeURIComponent(id)}/pdf?locale=${locale}${download ? "&download=true" : ""}`;

export async function printPdfUrl(pdfUrl: string): Promise<void> {
  const response = await fetch(pdfUrl, { cache: "no-store" });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/pdf")
  )
    throw new Error(serverMessages.pdfUnavailable);
  const blob = await response.blob();
  if (!blob.size) throw new Error(serverMessages.pdfUnavailable);
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.src = url;
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const fallbackTimer = setTimeout(() => {
      window.open(url, "_blank", "noopener");
      finish();
    }, 3500);
    frame.onload = () => {
      clearTimeout(fallbackTimer);
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          window.open(url, "_blank", "noopener");
        }
        finish();
      }, 300);
    };
    frame.onerror = () => {
      clearTimeout(fallbackTimer);
      window.open(url, "_blank", "noopener");
      finish();
    };
  });
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

export function downloadDocumentPdf(
  type: PdfDocumentType,
  id: string,
  number: string,
  locale: string,
) {
  const link = document.createElement("a");
  link.href = documentPdfUrl(type, id, locale, true);
  link.download = `${type}-${number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
