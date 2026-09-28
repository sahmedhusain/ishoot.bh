import * as React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./shared-styles";
import type { Contract, CompanySettings } from "@ishoot/database/types";
import initialCompanyConfig from "@ishoot/database/config";

const defaultCompany = initialCompanyConfig.company;

interface ContractPdfProps {
  contract: Contract;
  company: CompanySettings;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export function ContractPdfDocument({ contract, company }: ContractPdfProps) {
  const compNameEn = company.company_name_en || defaultCompany.companyNameEn;
  const compNameAr = company.company_name_ar || defaultCompany.companyNameAr;
  const clientName = contract.contact?.full_name ?? "Client";
  const clientCompany = contract.contact?.company || "";
  const clientEmail = contract.contact?.email || "";

  const labels = {
    crPrefix: "CR:",
    country: "Kingdom of Bahrain",
    productionAgreement: "PRODUCTION AGREEMENT",
    status: "Status",
    validFrom: "Valid From",
    to: "To",
    firstParty: "FIRST PARTY (SERVICE PROVIDER)",
    secondParty: "SECOND PARTY (CLIENT)",
    crNumber: "CR Number",
    termsAndScope: "TERMS & SCOPE OF PRODUCTION",
  };

  const statusMap: Record<string, string> = {
    draft: "DRAFT",
    sent: "SENT FOR REVIEW",
    signed: "DIGITALLY SIGNED",
    active: "ACTIVE & IN EFFECT",
    expired: "EXPIRED",
    terminated: "TERMINATED",
  };

  const statusText = statusMap[contract.status] || contract.status?.toUpperCase() || "DRAFT";

  return (
    <Document title={`Contract ${contract.contract_number} - ${compNameEn}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBanner}>
          <View>
            <Text style={pdfStyles.brandTitle}>
              {compNameEn}
            </Text>
            <Text style={pdfStyles.companySubtitle}>
              {compNameAr}
            </Text>
            <Text style={pdfStyles.companyMeta}>
              {labels.crPrefix} {company.cr_number || defaultCompany.crNumber} • {labels.country}
            </Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>{labels.productionAgreement}</Text>
            <Text style={pdfStyles.docNumber}>{contract.contract_number}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#014842" }}>
            {contract.title_en}
          </Text>
          <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 3 }}>
            {labels.status}: {statusText} • {labels.validFrom}:{" "}
            {formatDate(contract.valid_from)} {labels.to}:{" "}
            {formatDate(contract.valid_until)}
          </Text>
        </View>

        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>
              {labels.firstParty}
            </Text>
            <Text style={pdfStyles.metaValue}>{company.company_name_en || defaultCompany.companyNameEn}</Text>
            {company.cr_number ? (
              <Text style={pdfStyles.metaSub}>
                {labels.crNumber}: {company.cr_number}
              </Text>
            ) : null}
            {company.address_en ? (
              <Text style={pdfStyles.metaSub}>
                {company.address_en}
              </Text>
            ) : null}
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>{labels.secondParty}</Text>
            <Text style={pdfStyles.metaValue}>{clientName}</Text>
            {clientCompany ? (
              <Text style={pdfStyles.metaSub}>{clientCompany}</Text>
            ) : null}
            {clientEmail ? (
              <Text style={pdfStyles.metaSub}>{clientEmail}</Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={[pdfStyles.metaLabel, { marginBottom: 8 }]}>
            {labels.termsAndScope}
          </Text>
          <View
            style={{
              padding: 12,
              backgroundColor: "#F9FAFB",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              lineHeight: 1.4,
            }}
          >
            <Text style={{ fontSize: 8.5, color: "#374151", marginBottom: 8 }}>
              1. SCOPE OF SERVICES: The Service Provider shall execute
              commercial services, deliverables, and production as agreed upon in the linked project treatment.
            </Text>
            <Text style={{ fontSize: 8.5, color: "#374151", marginBottom: 8 }}>
              2. INTELLECTUAL PROPERTY: Upon receipt of full payment, all
              commercial broadcast and exhibition rights for the produced
              deliverables shall transfer to the Client. RAW master assets and
              project files remain the property of the Service Provider.
            </Text>
            <Text style={{ fontSize: 8.5, color: "#374151", marginBottom: 8 }}>
              3. PAYMENT TERMS: Payments shall adhere to standard invoice
              milestones within agreed calendar days.
            </Text>
            <Text style={{ fontSize: 8.5, color: "#374151" }}>
              4. GOVERNING LAW: This agreement is governed by the laws and
              commercial regulations of the local jurisdiction.
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 25,
            gap: 20,
          }}
        >
          <View
            style={{
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: "#9CA3AF",
              paddingTop: 8,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#111827" }}>
              FOR FIRST PARTY:
            </Text>
            <Text style={{ fontSize: 7.5, color: "#6B7280", marginTop: 2 }}>
              Authorized Signatory, {company.company_name_en || defaultCompany.companyNameEn}
            </Text>
            <Text
              style={{
                fontSize: 7.5,
                color: "#09937F",
                marginTop: 6,
                fontWeight: "bold",
              }}
            >
              ELECTRONICALLY VERIFIED
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: "#9CA3AF",
              paddingTop: 8,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "bold", color: "#111827" }}>
              FOR SECOND PARTY:
            </Text>
            <Text style={{ fontSize: 7.5, color: "#6B7280", marginTop: 2 }}>
              Authorized Signatory, {clientCompany || clientName}
            </Text>
            {contract.signed_at ? (
              <Text
                style={{
                  fontSize: 7.5,
                  color: "#059669",
                  marginTop: 6,
                  fontWeight: "bold",
                }}
              >
                SIGNED ON {formatDate(contract.signed_at)}
              </Text>
            ) : (
              <Text style={{ fontSize: 7.5, color: "#9CA3AF", marginTop: 6 }}>
                Signature Pending
              </Text>
            )}
          </View>
        </View>

        <View style={pdfStyles.footer} fixed>
          <Text>
            Legal Agreement • {compNameEn}
          </Text>
          <Text>
            {company.website || defaultCompany.website}
            {` • ${company.email || defaultCompany.email}`}
            {` • ${company.phone || defaultCompany.phone}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
