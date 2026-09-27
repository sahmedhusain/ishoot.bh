import * as React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./shared-styles";
import type { Contract, CompanySettings } from "@ishoot/database/types";

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
  const clientName = contract.contact?.full_name || "Client Name";
  const clientCompany = contract.contact?.company || "";
  const clientEmail = contract.contact?.email || "";

  return (
    <Document title={`Contract ${contract.contract_number} - ishoot`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBanner}>
          <View>
            <Text style={pdfStyles.brandTitle}>
              ishoot<Text style={pdfStyles.brandDot}>.</Text>
            </Text>
            <Text style={pdfStyles.companySubtitle}>
              {company.company_name_en}
            </Text>
            <Text style={pdfStyles.companyMeta}>CR: {company.cr_number}</Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>PRODUCTION AGREEMENT</Text>
            <Text style={pdfStyles.docNumber}>{contract.contract_number}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#014842" }}>
            {contract.title_en}
          </Text>
          <Text style={{ fontSize: 8, color: "#6B7280", marginTop: 3 }}>
            Status: {contract.status.toUpperCase()} • Valid From:{" "}
            {formatDate(contract.valid_from)} To:{" "}
            {formatDate(contract.valid_until)}
          </Text>
        </View>

        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>
              FIRST PARTY (SERVICE PROVIDER)
            </Text>
            <Text style={pdfStyles.metaValue}>{company.company_name_en}</Text>
            <Text style={pdfStyles.metaSub}>
              CR Number: {company.cr_number}
            </Text>
            <Text style={pdfStyles.metaSub}>
              {company.address_en || "Seef District, Manama, Bahrain"}
            </Text>
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>SECOND PARTY (CLIENT)</Text>
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
            TERMS & SCOPE OF ENGAGEMENT
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
              commercial cinema production, aerial capture, and post-production
              color mastering as agreed upon in the linked project treatment.
            </Text>
            <Text style={{ fontSize: 8.5, color: "#374151", marginBottom: 8 }}>
              2. INTELLECTUAL PROPERTY: Upon receipt of full payment, all
              commercial broadcast and exhibition rights for the produced
              deliverables shall transfer to the Client. RAW master assets and
              cinema project files remain the property of ishoot.
            </Text>
            <Text style={{ fontSize: 8.5, color: "#374151", marginBottom: 8 }}>
              3. PAYMENT TERMS: Payments shall adhere to standard invoice
              milestones (50% upfront pre-production, 50% upon final master
              color delivery) within 30 calendar days.
            </Text>
            <Text style={{ fontSize: 8.5, color: "#374151" }}>
              4. GOVERNING LAW: This agreement is governed by the laws and
              commercial regulations of the Kingdom of Bahrain.
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
              Authorized Signatory, ishoot Cinema Production
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
            Legal Production Agreement • ishoot Cinema Production S.P.C.
          </Text>
          <Text>
            {company.website || "https://ishoot.bh"} •{" "}
            {company.email || "hello@ishoot.bh"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
