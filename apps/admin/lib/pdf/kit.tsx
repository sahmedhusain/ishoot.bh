import { formatMessage, getTranslations } from "@platform/locales";
import * as React from "react";
import { Image, Text, View, type Styles } from "@react-pdf/renderer";
import { getCurrencyDecimals, getCurrencyLabel } from "@platform/config/currency";

import { db, formatDocumentPhone } from "@platform/database";
import type { CompanySettings } from "@platform/database/types";
import { resolveConfiguredPdfAsset } from "./configured-asset";
import { DEFAULT_THEME, mix } from "@platform/database/constants/theme";
import { PDF_FONT, registerPdfFont } from "./shared-styles";

export const C = {
  primary: DEFAULT_THEME.primary,
  accent: DEFAULT_THEME.accent,
  ink: "#111827",
  body: "#374151",
  muted: "#6B7280",
  line: "#E5E7EB",
  soft: mix(DEFAULT_THEME.primary, "#FFFFFF", 0.95),
  danger: "#B91C1C",
  success: "#047857",
};

type Src = Buffer | string;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
type Style = Styles[string];
const styles = (style?: Style | Style[]) => (Array.isArray(style) ? style : style ? [style] : []);

export type DocLocale = "en" | "ar";

export interface PdfBrand {
  company: CompanySettings;
  logo?: Src;
  icon?: Src;
  fullLogo?: Src;
  stamp?: Src;
  signature?: Src;
  letterheadHeader?: Src;
  letterheadFooter?: Src;
}

export async function resolvePdfBrand(company: CompanySettings): Promise<PdfBrand> {
  C.primary = company.theme.primary;
  C.accent = company.theme.accent;
  C.soft = mix(company.theme.primary, "#FFFFFF", 0.95);
  pageStyle.fontFamily = (await registerPdfFont(company.theme)) ? PDF_FONT : "Helvetica";
  const [logo, icon, fullLogo, stamp, signature, assets] = await Promise.all([
    resolveConfiguredPdfAsset(company.logo_url),
    resolveConfiguredPdfAsset(company.icon_url),
    resolveConfiguredPdfAsset(company.full_logo_url),
    resolveConfiguredPdfAsset(company.stamp_url),
    resolveConfiguredPdfAsset(company.signature_url),
    db.companyAsset.findMany({ where: { assetKey: { in: ["letterhead_header", "letterhead_footer", "full_logo_light"] } }, select: { assetKey: true, fileUrl: true } }),
  ]);
  const asset = async (key: string) => {
    const url = assets.find((a) => a.assetKey === key)?.fileUrl;
    return url ? resolveConfiguredPdfAsset(url) : undefined;
  };
  const resolvedFullLogo = fullLogo || (await asset("full_logo_light"));
  const letterheadHeader = (company.document_header_url ? await resolveConfiguredPdfAsset(company.document_header_url) : undefined) || (await asset("letterhead_header"));
  const letterheadFooter = (company.document_footer_url ? await resolveConfiguredPdfAsset(company.document_footer_url) : undefined) || (await asset("letterhead_footer"));
  return { company, logo, icon, fullLogo: resolvedFullLogo, stamp, signature, letterheadHeader, letterheadFooter };
}

function numberLocale(isAr: boolean) {
  return isAr ? "ar-u-nu-latn" : "en-GB";
}

export function fmtNumber(value: number, decimals = 0) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function currencyLabel(code: string, isAr: boolean) {
  const upper = (code || "USD").toUpperCase();
  return getCurrencyLabel(upper, isAr, false);
}

export function fmtMoney(value: number, code: string, isAr: boolean) {
  const amount = fmtNumber(value, getCurrencyDecimals(code || "USD"));
  const symbol = currencyLabel(code, isAr);
  return isAr ? `${amount} ${symbol}` : `${symbol} ${amount}`;
}

export function fmtDate(value: string | Date | null | undefined, isAr: boolean, month: "long" | "short" = "long", timeZone = "UTC") {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(numberLocale(isAr), { day: "numeric", month, year: "numeric", timeZone }).format(date);
}

export function fmtMonth(year: number, month: number, isAr: boolean) {
  return new Intl.DateTimeFormat(numberLocale(isAr), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

const LETTERHEAD_HEIGHT = 104;
const FOOTER_HEIGHT = 58;

export const pageStyle: Style = {
  fontFamily: PDF_FONT,
  fontSize: 9,
  color: C.ink,
  backgroundColor: "#FFFFFF",
  paddingTop: LETTERHEAD_HEIGHT + 14,
  paddingBottom: FOOTER_HEIGHT + 14,
  paddingHorizontal: 40,
};

function BrandMark({ brand, height = 30 }: { brand: PdfBrand; height?: number }) {
  if (brand.fullLogo)
    return <Image src={brand.fullLogo} style={{ height, width: height * 3.5, objectFit: "contain" }} />;
  if (!brand.icon && !brand.logo)
    return <Text style={{ fontSize: 16, fontWeight: "bold", color: C.primary }}>{brand.company.company_name_en}</Text>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {brand.icon ? <Image src={brand.icon} style={{ height, width: height, objectFit: "contain" }} /> : null}
      {brand.logo ? <Image src={brand.logo} style={{ height: height * 0.62, width: height * 2.2, objectFit: "contain", marginLeft: 6 }} /> : null}
    </View>
  );
}

export function Letterhead({ brand }: { brand: PdfBrand }) {
  const company = brand.company;
  const en = getTranslations("en").admin.pdfDocs;
  const ar = getTranslations("ar").admin.pdfDocs;
  if (brand.letterheadHeader)
    return (
      <View fixed style={{ position: "absolute", top: 0, left: 0, right: 0, height: LETTERHEAD_HEIGHT }}>
        <Image src={brand.letterheadHeader} style={{ width: "100%", height: LETTERHEAD_HEIGHT, objectFit: "cover" }} />
      </View>
    );
  const meta = (label: string, value: string | null | undefined) => (value ? `${label} ${value}` : "");
  const rtl = { direction: "rtl", textAlign: "right" } as Style;
  return (
    <View fixed style={{ position: "absolute", top: 0, left: 0, right: 0, height: LETTERHEAD_HEIGHT, paddingHorizontal: 40, paddingTop: 26 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 190 }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: C.primary }}>{company.company_name_en}</Text>
          {company.address_en ? <Text style={{ fontSize: 6.8, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>{company.address_en}</Text> : null}
          <Text style={{ fontSize: 6.8, color: C.muted, marginTop: 1 }}>{meta(en.crNo, company.cr_number)}</Text>
        </View>
        <BrandMark brand={brand} />
        <View style={{ width: 190, alignItems: "flex-end" }}>
          <Text style={[{ fontSize: 9, fontWeight: "bold", color: C.primary }, rtl]}>{company.company_name_ar}</Text>
          {company.address_ar ? <Text style={[{ fontSize: 6.8, color: C.muted, marginTop: 2, lineHeight: 1.35 }, rtl]}>{company.address_ar}</Text> : null}
          <Text style={[{ fontSize: 6.8, color: C.muted, marginTop: 1 }, rtl]}>{meta(ar.crNo, company.cr_number)}</Text>
        </View>
      </View>
      <View style={{ marginTop: 12, height: 2.2, backgroundColor: C.primary }} />
      <View style={{ marginTop: 1.6, height: 0.8, backgroundColor: C.accent }} />
    </View>
  );
}

export interface Column {
  key: string;
  label: string;
  flex: number;
  align?: "start" | "end" | "center";
}

export interface CompanySignature {
  signatureSrc?: Src | null;
  signerName?: string | null;
  signerTitle?: string | null;
  signedAt?: string | null;
}

export interface TaxCertificateMark {
  qr?: Buffer;
  title: string;
  registration?: string | null;
}

export interface ClientAcceptance {
  signerName: string;
  signerTitle?: string | null;
  signedAt: string;
  method: "electronic" | "upload";
  signatureSrc?: Src | null;
}

export type DocKit = ReturnType<typeof docKit>;

export function docKit(locale: DocLocale, timeZone = "UTC") {
  const isAr = locale === "ar";
  const t = getTranslations(locale).admin;
  const d = t.pdfDocs;
  const endItems = isAr ? "flex-start" : "flex-end";
  const startItems = isAr ? "flex-end" : "flex-start";
  const textAlignFor = (align?: "start" | "end" | "center") =>
    align === "center" ? "center" : align === "end" ? (isAr ? "left" : "right") : isAr ? "right" : "left";
  const money = (value: number, code: string) => fmtMoney(value, code, isAr);
  const date = (value: string | Date | null | undefined, month: "long" | "short" = "long") => fmtDate(value, isAr, month, timeZone);
  const pageLabel = (n: number, total: number) => formatMessage(d.page, { n: String(n), total: String(total) });

  function T({ style, align, children, ...rest }: { style?: Style | Style[]; align?: "start" | "end" | "center"; children?: React.ReactNode } & Omit<React.ComponentProps<typeof Text>, "style">) {
    const plain = (Array.isArray(children) ? children : [children]).every((c) => typeof c === "string" || typeof c === "number");
    const latinOnly = plain && !ARABIC.test((Array.isArray(children) ? children : [children]).join(""));
    return (
      <Text {...rest} style={[{ direction: isAr && !latinOnly ? "rtl" : "ltr", textAlign: textAlignFor(align), lineHeight: 1.45 } as Style, ...styles(style)]}>
        {children}
      </Text>
    );
  }

  function Row({ style, children, ...rest }: { style?: Style | Style[]; children?: React.ReactNode } & Omit<React.ComponentProps<typeof View>, "style">) {
    return (
      <View {...rest} style={[{ flexDirection: isAr ? "row-reverse" : "row" } as Style, ...styles(style)]}>
        {children}
      </View>
    );
  }

  function Footer({ brand, reference }: { brand: PdfBrand; reference?: string }) {
    const company = brand.company;
    if (brand.letterheadFooter)
      return (
        <View fixed style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT }}>
          <Image src={brand.letterheadFooter} style={{ width: "100%", height: FOOTER_HEIGHT, objectFit: "cover" }} />
          <View
            style={{
              position: "absolute",
              bottom: 4,
              [isAr ? "left" : "right"]: 40,
              backgroundColor: "rgba(255, 255, 255, 0.88)",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 3,
            } as Style}
          >
            <Text
              fixed
              style={{ fontSize: 6.8, color: C.body, direction: isAr ? "rtl" : "ltr" } as Style}
              render={({ pageNumber, totalPages }) => [reference, pageLabel(pageNumber, totalPages)].filter(Boolean).join("   ·   ")}
            />
          </View>
        </View>
      );
    const contact = [company.phone ? formatDocumentPhone(company.phone, company.country) : "", company.email, company.website?.replace(/^https?:\/\//, "")].filter(Boolean).join("   ·   ");
    return (
      <View fixed style={{ position: "absolute", bottom: 0, left: 40, right: 40, height: FOOTER_HEIGHT, paddingTop: 12 }}>
        <View style={{ height: 0.8, backgroundColor: C.accent }} />
        <View style={{ flexDirection: isAr ? "row-reverse" : "row", justifyContent: "space-between", marginTop: 7 }}>
          <Text style={{ fontSize: 7, color: C.body }}>{contact}</Text>
          <Text
            fixed
            style={{ width: 240, fontSize: 7, color: C.muted, direction: isAr ? "rtl" : "ltr", textAlign: isAr ? "left" : "right" } as Style}
            render={({ pageNumber, totalPages }) => [reference, pageLabel(pageNumber, totalPages)].filter(Boolean).join("   ·   ")}
          />
        </View>
      </View>
    );
  }

  function TaxCertificates({ items, inline = false }: { items: TaxCertificateMark[]; inline?: boolean }) {
    if (!items.length) return null;
    const width = inline ? 96 : 120;
    const marks = items.map((item) => (
      <View key={item.title} style={{ alignItems: "center", width }}>
        {item.qr ? <Image src={item.qr} style={{ width: inline ? 58 : 66, height: inline ? 58 : 66 }} /> : null}
        <T align="center" style={{ fontSize: inline ? 7 : 7.5, fontWeight: "bold", color: C.primary, marginTop: 3, width, lineHeight: 1.3 }}>{item.title}</T>
        {item.registration ? <T align="center" style={{ fontSize: 6.5, color: C.muted, width }}>{item.registration}</T> : null}
      </View>
    ));
    if (inline) return <View wrap={false} style={{ alignItems: "center" }}>{marks}</View>;
    return (
      <View wrap={false} style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 0.6, borderTopColor: C.line, alignItems: "center" }}>
        <View style={{ flexDirection: isAr ? "row-reverse" : "row", justifyContent: "center", gap: 28 }}>{marks}</View>
      </View>
    );
  }

  function ClosingRow({ start, end, certificates }: { start?: React.ReactNode; end: React.ReactNode; certificates: TaxCertificateMark[] }) {
    const single = certificates.length === 1;
    return (
      <>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }} wrap={false}>
          {start ?? <View style={{ width: 196 }} />}
          {single ? (
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 4 }}>
              <TaxCertificates items={certificates} inline />
            </View>
          ) : null}
          {end}
        </Row>
        {!single ? <TaxCertificates items={certificates} /> : null}
      </>
    );
  }

  function TitleBlock({ title, subtitle, number, facts = [] }: { title: string; subtitle?: string; number?: string; facts?: Array<[string, string]> }) {
    return (
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <View style={{ alignItems: startItems, maxWidth: "58%" }}>
          <T style={{ fontSize: 20, fontWeight: "bold", color: C.primary, lineHeight: 1.2 }}>{title}</T>
          {subtitle ? <T style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{subtitle}</T> : null}
          {number ? <T style={{ fontSize: 10, fontWeight: "bold", color: C.accent, marginTop: 4, letterSpacing: 0.4 }}>{number}</T> : null}
        </View>
        {facts.length ? (
          <View style={{ alignItems: endItems }}>
            {facts.map(([label, value]) => (
              <Row key={label} style={{ marginTop: 2 }}>
                <T style={{ fontSize: 7.5, color: C.muted }}>{label}</T>
                <T style={{ fontSize: 8.5, fontWeight: "bold", color: C.ink, marginHorizontal: 6 }}>{value}</T>
              </Row>
            ))}
          </View>
        ) : null}
      </Row>
    );
  }

  function Card({ label, children, style }: { label?: string; children: React.ReactNode; style?: Style }) {
    return (
      <View style={[{ flex: 1, backgroundColor: C.soft, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 }, ...styles(style)]}>
        {label ? <T style={{ fontSize: 7, color: C.accent, fontWeight: "bold", marginBottom: 4, letterSpacing: 0.3 }}>{label}</T> : null}
        {children}
      </View>
    );
  }

  function Field({ label, value, strong }: { label: string; value?: React.ReactNode; strong?: boolean }) {
    if (value == null || value === "") return null;
    return (
      <Row style={{ marginTop: 1.5 }}>
        <T style={{ fontSize: 8, color: C.muted }}>{label}</T>
        <T style={{ fontSize: 8, color: C.ink, fontWeight: strong ? "bold" : "normal", marginHorizontal: 5 }}>{value}</T>
      </Row>
    );
  }

  function Table({ columns, rows }: { columns: Column[]; rows: Array<Record<string, React.ReactNode>> }) {
    return (
      <View style={{ borderRadius: 6, overflow: "hidden", borderWidth: 0.8, borderColor: C.line, marginBottom: 14 }}>
        <Row style={{ backgroundColor: C.primary, paddingVertical: 6, paddingHorizontal: 10 }} fixed>
          {columns.map((column) => (
            <T key={column.key} align={column.align} style={{ flex: column.flex, color: "#FFFFFF", fontSize: 7.5, fontWeight: "bold", paddingHorizontal: 3 }}>
              {column.label}
            </T>
          ))}
        </Row>
        {rows.map((row, index) => (
          <Row
            key={index}
            wrap={false}
            style={{ paddingVertical: 6.5, paddingHorizontal: 10, borderTopWidth: index ? 0.6 : 0, borderTopColor: C.line, backgroundColor: index % 2 ? "#FAFBFB" : "#FFFFFF", alignItems: "center" }}
          >
            {columns.map((column) => (
              <View key={column.key} style={{ flex: column.flex, paddingHorizontal: 3 }}>
                {typeof row[column.key] === "string" || typeof row[column.key] === "number" ? (
                  <T align={column.align} style={{ fontSize: 8.5 }}>{row[column.key]}</T>
                ) : (
                  row[column.key]
                )}
              </View>
            ))}
          </Row>
        ))}
      </View>
    );
  }

  function Totals({ lines, width = 230 }: { lines: Array<{ label: string; value: string; tone?: "danger" | "success" | "final" | "muted" }>; width?: number }) {
    return (
      <View style={{ width, alignSelf: endItems }}>
        {lines.map((line, index) => {
          const final = line.tone === "final";
          return (
            <Row
              key={index}
              wrap={false}
              style={{ justifyContent: "space-between", paddingVertical: final ? 7 : 3, paddingHorizontal: final ? 10 : 2, marginTop: final ? 5 : 0, backgroundColor: final ? C.primary : undefined, borderRadius: final ? 5 : 0 }}
            >
              <T style={{ fontSize: final ? 9.5 : 8.5, color: final ? "#FFFFFF" : C.body, fontWeight: final ? "bold" : "normal" }}>{line.label}</T>
              <T
                style={{
                  fontSize: final ? 10.5 : 8.5,
                  fontWeight: final || line.tone ? "bold" : "normal",
                  color: final ? "#FFFFFF" : line.tone === "danger" ? C.danger : line.tone === "success" ? C.success : line.tone === "muted" ? C.muted : C.ink,
                }}
              >
                {line.value}
              </T>
            </Row>
          );
        })}
      </View>
    );
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return <T style={{ fontSize: 9.5, fontWeight: "bold", color: C.primary, marginBottom: 6, marginTop: 4 }}>{children}</T>;
  }

  function Paragraph({ children, style }: { children: React.ReactNode; style?: Style }) {
    return <T style={[{ fontSize: 9.5, lineHeight: 1.8, color: C.body, marginBottom: 10 }, ...styles(style)]}>{children}</T>;
  }

  function CompanySignatureBlock({ brand, signing, pending, label }: { brand: PdfBrand; signing?: CompanySignature | null; pending?: string; label?: string }) {
    const companyName = isAr ? brand.company.company_name_ar : brand.company.company_name_en;
    return (
      <View wrap={false} style={{ width: 210, alignItems: "center" }}>
        <T align="center" style={{ fontSize: 7.5, color: C.muted, marginBottom: 2 }}>{label ?? d.authorizedSignatory}</T>
        <View style={{ height: 70, width: 210, justifyContent: "center", alignItems: "center" }}>
          {signing && brand.stamp ? (
            <Image src={brand.stamp} style={{ position: "absolute", height: 70, width: 70, objectFit: "contain", opacity: 0.82, transform: "rotate(-10deg)", left: isAr ? 18 : 122, top: 0 }} />
          ) : null}
          {signing?.signatureSrc ? (
            <Image src={signing.signatureSrc} style={{ height: 46, width: 150, objectFit: "contain" }} />
          ) : !signing && pending ? (
            <T align="center" style={{ fontSize: 7, color: "#9CA3AF" }}>{pending}</T>
          ) : null}
        </View>
        <View style={{ width: 180, height: 0.8, backgroundColor: C.body }} />
        <T align="center" style={{ fontSize: 8.5, fontWeight: "bold", color: C.ink, marginTop: 4 }}>{signing?.signerName || companyName}</T>
        {signing?.signerTitle ? <T align="center" style={{ fontSize: 7.5, color: C.muted }}>{signing.signerTitle}</T> : null}
        {signing?.signedAt ? <T align="center" style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>{formatMessage(d.signedOn, { date: date(signing.signedAt) })}</T> : null}
      </View>
    );
  }

  function ClientAcceptanceBlock({ acceptance, documentKind, width = 230 }: { acceptance?: ClientAcceptance | null; documentKind: "quotation" | "invoice"; width?: number }) {
    const c = d.client;
    const line = (label: string, value?: string | null) => (
      <Row style={{ alignItems: "flex-end", marginTop: 7 }}>
        <T style={{ fontSize: 7.5, color: C.muted, width: 52 }}>{label}</T>
        <View style={{ flex: 1, borderBottomWidth: 0.7, borderBottomColor: "#9CA3AF", borderBottomStyle: value ? "solid" : "dashed", paddingBottom: 1 }}>
          <T style={{ fontSize: 8.5, fontWeight: "bold" }}>{value || " "}</T>
        </View>
      </Row>
    );
    return (
      <View wrap={false} style={{ width }}>
        <T style={{ fontSize: 8.5, fontWeight: "bold", color: C.primary }}>{c.title}</T>
        <T style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>{formatMessage(c.statement, { document: documentKind === "quotation" ? c.quotation : c.invoice })}</T>
        {line(c.name, acceptance ? [acceptance.signerName, acceptance.signerTitle].filter(Boolean).join(isAr ? "، " : ", ") : null)}
        <Row style={{ alignItems: "flex-end", marginTop: 7 }}>
          <T style={{ fontSize: 7.5, color: C.muted, width: 52 }}>{c.signature}</T>
          <View style={{ flex: 1, height: 34, borderBottomWidth: 0.7, borderBottomColor: "#9CA3AF", borderBottomStyle: acceptance ? "solid" : "dashed", justifyContent: "flex-end", alignItems: startItems }}>
            {acceptance?.signatureSrc ? <Image src={acceptance.signatureSrc} style={{ height: 32, width: 130, objectFit: "contain" }} /> : null}
          </View>
        </Row>
        {line(c.date, acceptance ? date(acceptance.signedAt) : null)}
        {acceptance ? <T style={{ fontSize: 6.8, color: C.success, marginTop: 4 }}>{acceptance.method === "electronic" ? c.signedElectronically : c.signedCopy}</T> : null}
      </View>
    );
  }

  return {
    locale, isAr, t, d, money, date, endItems, startItems,
    T, Row, Footer, TitleBlock, Card, Field, Table, Totals, SectionTitle, Paragraph, CompanySignatureBlock, ClientAcceptanceBlock, TaxCertificates, ClosingRow,
  };
}
