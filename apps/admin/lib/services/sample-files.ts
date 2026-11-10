import { getCompanySettings } from "../queries/company-settings";

export async function samplePdf(
  title: string,
  subtitle?: string,
): Promise<Buffer> {
  const company = await getCompanySettings().catch(() => null);
  const companyName = company?.company_name_en || company?.company_name_ar || "Company";
  const cr = company?.cr_number ? `CR: ${company.cr_number}` : "";
  const vat = company?.vat_id ? `VAT: ${company.vat_id}` : "";
  const sub = subtitle || [cr, vat].filter(Boolean).join(" | ");

  const safe = (text: string) =>
    text.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
  const content = [
    "BT /F1 18 Tf 72 720 Td (" + safe(companyName).slice(0, 60) + ") Tj ET",
    "BT /F1 14 Tf 72 696 Td (" + safe(title).slice(0, 60) + ") Tj ET",
    sub ? "BT /F1 10 Tf 72 676 Td (" + safe(sub).slice(0, 90) + ") Tj ET" : "",
    "0.85 G 72 660 m 540 660 l S",
  ].filter(Boolean).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
