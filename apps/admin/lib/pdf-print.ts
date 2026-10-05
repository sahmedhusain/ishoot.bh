export type PdfDocumentType = "invoice" | "receipt" | "quotation";

export function documentPdfUrl(type: PdfDocumentType, id: string, locale: string, download = false) {
  return `/api/documents/${encodeURIComponent(id)}/pdf?type=${type}&locale=${locale}${download ? "&download=true" : ""}`;
}

/**
 * Prints the exact PDF the download produces: the file is loaded into a hidden frame and printed
 * from the browser's PDF viewer, so there are no page headers, footers or extra margins.
 */
export async function printDocumentPdf(type: PdfDocumentType, id: string, locale: string): Promise<void> {
  const response = await fetch(documentPdfUrl(type, id, locale), { cache: "no-store" });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf"))
    throw new Error("PDF unavailable");
  const url = URL.createObjectURL(await response.blob());
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.src = url;
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => {
    frame.onload = () => {
      // The PDF viewer needs a beat after load before print() picks up the document.
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          // Some browsers block printing a frame: fall back to opening the PDF for the user to print.
          window.open(url, "_blank", "noopener");
        }
        resolve();
      }, 300);
    };
  });
  // Keep the frame alive long enough for the print dialog to read it.
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

export function downloadDocumentPdf(type: PdfDocumentType, id: string, number: string, locale: string) {
  const link = document.createElement("a");
  link.href = documentPdfUrl(type, id, locale, true);
  link.download = `${type}-${number}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
