import { Document, Page, renderToBuffer } from "@react-pdf/renderer";
import type { CompanySettings } from "@platform/database/types";
import type { ReportColumnKind } from "@platform/database/constants/reports";
import { Letterhead, fmtNumber, pageStyle, resolvePdfBrand, docKit } from "./kit";

interface ReportPdfInput {
  title: string;
  period: string;
  header: string[];
  rows: (string | number | null)[][];
  totals: (string | number | null)[];
  kinds: ReportColumnKind[];
  currency: string;
}

/** A report as a PDF in the company letterhead: title, period and the table with its totals (landscape when wide). */
export async function generateReportPdf(input: ReportPdfInput, company: CompanySettings, locale: "en" | "ar") {
  const brand = await resolvePdfBrand(company);
  const k = docKit(locale);
  const show = (value: string | number | null, kind: ReportColumnKind) => {
    if (value === null || value === "") return "—";
    if (typeof value !== "number") return String(value);
    if (kind === "money") return fmtNumber(value, 3);
    if (kind === "percent") return `${fmtNumber(value, 1)}%`;
    return fmtNumber(value, value % 1 ? 2 : 0);
  };
  const columns = input.header.map((label, i) => ({ key: `c${i}`, label, flex: i === 0 ? 3 : 1.4, align: (input.kinds[i] === "text" || input.kinds[i] === "date" ? "start" : "end") as "start" | "end" }));
  const rows = [...input.rows, input.totals].map((row) => Object.fromEntries(row.map((value, i) => [`c${i}`, show(value, input.kinds[i])])));
  return renderToBuffer(
    <Document title={`${input.title} · ${input.period}`} author={company.company_name_en} language={locale}>
      <Page size="A4" orientation={input.header.length > 5 ? "landscape" : "portrait"} style={pageStyle}>
        <Letterhead brand={brand} />
        <k.TitleBlock title={input.title} number={input.period} facts={[]} />
        <k.Table columns={columns} rows={rows} />
        <k.Footer brand={brand} reference={input.period} />
      </Page>
    </Document>,
  );
}
