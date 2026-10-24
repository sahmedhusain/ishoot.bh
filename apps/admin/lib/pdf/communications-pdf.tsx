import { Document, Page, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanySettings } from "@platform/database/types";
import type {
  OfficialLetterDetail,
  AnnouncementDetail,
} from "@platform/database";
import { Letterhead, docKit, pageStyle, resolvePdfBrand, fmtDate } from "./kit";
import { resolveConfiguredPdfAsset } from "./configured-asset";
export async function generateLetterheadPdf(
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const brand = await resolvePdfBrand(company);
  const k = docKit(locale);
  return renderToBuffer(
    <Document title={k.t.communications.letterhead} author={company.company_name_en}>
      <Page size="A4" style={pageStyle}>
        <Letterhead brand={brand} />
        <k.Footer brand={brand} />
      </Page>
    </Document>,
  );
}
export async function generateCommunicationPdf(
  item: OfficialLetterDetail | AnnouncementDetail,
  company: CompanySettings,
  locale: "en" | "ar",
) {
  const k = docKit(locale);
  const { T, TitleBlock, CompanySignatureBlock } = k;
  const isLetter = "subjectEn" in item;
  const brand = await resolvePdfBrand(company);
  const signature = await resolveConfiguredPdfAsset(item.signatureUrl);
  const issued = isLetter
    ? item.status === "approved"
    : item.status === "published";
  const subject = isLetter
    ? k.isAr
      ? item.subjectAr
      : item.subjectEn
    : k.isAr
      ? item.titleAr
      : item.titleEn;
  const body = k.isAr ? item.bodyAr : item.bodyEn;
  return renderToBuffer(
    <Document
      title={`${item.reference} · ${subject}`}
      author={company.company_name_en}
      language={locale}
    >
      <Page size="A4" style={pageStyle}>
        <Letterhead brand={brand} />
        <TitleBlock
          title={subject}
          number={item.reference}
          facts={[
            [
              k.t.communications.date,
              fmtDate(isLetter ? item.letterDate : item.publishedAt, k.isAr),
            ],
          ]}
        />
        {!issued && (
          <T style={{ fontSize: 18, color: "#999999", marginBottom: 15 }}>
            {k.t.communications.draft}
          </T>
        )}
        {isLetter && (
          <View style={{ marginBottom: 15 }}>
            {[
              item.recipientName,
              item.recipientTitle,
              item.recipientOrganization,
              item.recipientAddress,
            ]
              .filter(Boolean)
              .map((line, i) => (
                <T key={i} style={{ fontSize: 10 }}>
                  {line}
                </T>
              ))}
          </View>
        )}
        {body.split("\n").map((line, i) => (
          <T
            key={i}
            style={{
              fontSize: 11,
              lineHeight: 1.65,
              marginBottom: line ? 6 : 12,
            }}
          >
            {line || " "}
          </T>
        ))}
        {issued && (!isLetter || item.showSignature || item.showStamp) && (
          <CompanySignatureBlock
            brand={{
              ...brand,
              stamp: !isLetter || item.showStamp ? brand.stamp : undefined,
            }}
            signing={{
              signatureSrc:
                !isLetter || item.showSignature ? signature : undefined,
              signerName: k.isAr ? item.signer?.nameAr : item.signer?.nameEn,
              signerTitle: k.isAr ? item.signer?.titleAr : item.signer?.titleEn,
              signedAt: item.signedAt,
            }}
          />
        )}
        <k.Footer brand={brand} reference={item.reference} />
      </Page>
    </Document>,
  );
}
