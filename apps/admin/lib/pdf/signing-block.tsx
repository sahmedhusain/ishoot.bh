import { Text, View, Image as PdfImage } from "@react-pdf/renderer";
import type { CompanySettings } from "@ishoot/database/types";
import { pdfStyles } from "./shared-styles";

export interface PdfSigning {
  /** The signer's approved signature (resolved image), snapshotted when they signed. */
  signatureSrc?: string | Buffer | null;
  signerName: string;
  signedAt: string;
}

/**
 * Stamp and signature appear only once the document is approved and signed; until then the
 * block says it is awaiting approval and signature.
 */
export function PdfSigningBlock({
  company,
  signing,
  isAr,
  issuedByLabel,
  signatoryLabel,
  unsignedLabel,
  signedOnLabel,
}: {
  company: CompanySettings;
  signing?: PdfSigning | null;
  isAr: boolean;
  issuedByLabel: string;
  signatoryLabel: string;
  unsignedLabel: string;
  signedOnLabel: string;
}) {
  const companyName = isAr ? company.company_name_ar || company.company_name_en : company.company_name_en || company.company_name_ar;
  return (
    <View style={pdfStyles.signatureContainer}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {signing && company.stamp_url && <PdfImage src={company.stamp_url as never} style={pdfStyles.stampImage} />}
        <View>
          <Text style={{ fontSize: 7.5, color: "#6B7280" }}>{issuedByLabel}</Text>
          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: "#111827", marginTop: 1 }}>{companyName}</Text>
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        {signing?.signatureSrc ? (
          <PdfImage src={signing.signatureSrc as never} style={pdfStyles.signatureImage} />
        ) : (
          <View style={[pdfStyles.signatureBox, { justifyContent: "center", alignItems: "center" }]}>
            {!signing && <Text style={{ fontSize: 6.5, color: "#9CA3AF" }}>{unsignedLabel}</Text>}
          </View>
        )}
        <Text style={pdfStyles.signatureLabel}>{signatoryLabel}</Text>
        {signing && (
          <Text style={{ fontSize: 6.5, color: "#6B7280", marginTop: 1 }}>
            {signing.signerName} · {signedOnLabel} {signing.signedAt.slice(0, 10)}
          </Text>
        )}
      </View>
    </View>
  );
}
