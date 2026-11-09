import * as React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CompanySettings } from "@platform/database/types";
import { registerPdfFont } from "./shared-styles";

interface LabelItem {
  code: string;
  productId: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  batch?: string;
}

interface LabelTemplate {
  widthMm: number;
  heightMm: number;
  gapMm: number;
  copies: number;
}

export interface StockLabelJobData {
  id: string;
  template: LabelTemplate;
  labels: LabelItem[];
}

const MM_TO_PT = 2.83464567;

export async function generateStockLabelsPdf(
  job: StockLabelJobData,
  company?: CompanySettings | null,
  locale: "en" | "ar" = "en",
) {
  if (company?.theme) {
    try {
      await registerPdfFont(company.theme);
    } catch {
    }
  }

  const widthPt = Math.max(25, job.template.widthMm) * MM_TO_PT;
  const heightPt = Math.max(15, job.template.heightMm) * MM_TO_PT;
  const copies = Math.min(10, Math.max(1, job.template.copies || 1));
  const isAr = locale === "ar";

  const pages: any[] = [];
  for (const label of job.labels) {
    for (let copyIdx = 0; copyIdx < copies; copyIdx++) {
      pages.push(
        <Page
          key={`${label.code}-${copyIdx}`}
          size={[widthPt, heightPt]}
          style={{
            padding: 6,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
            fontFamily: "Helvetica",
          }}
        >
          <View
            style={{
              flexDirection: isAr ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottomWidth: 0.5,
              borderBottomColor: "#D1D5DB",
              paddingBottom: 2,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "bold",
                color: "#111827",
              }}
            >
              {label.sku}
            </Text>
            <Text
              style={{
                fontSize: 7,
                color: "#4B5563",
                maxWidth: widthPt * 0.55,
                textAlign: isAr ? "right" : "left",
              }}
            >
              {isAr ? label.nameAr || label.nameEn : label.nameEn || label.nameAr}
            </Text>
          </View>

          <View
            style={{
              marginVertical: 3,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 3,
              paddingVertical: 3,
              paddingHorizontal: 4,
              backgroundColor: "#F9FAFB",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                letterSpacing: 1,
                color: "#111827",
              }}
            >
              {label.code}
            </Text>
          </View>

          <View
            style={{
              flexDirection: isAr ? "row-reverse" : "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopWidth: 0.5,
              borderTopColor: "#E5E7EB",
              paddingTop: 2,
            }}
          >
            <Text style={{ fontSize: 6, color: "#6B7280" }}>
              {label.batch ? `Batch: ${label.batch}` : "Stock Unit"}
            </Text>
            <Text style={{ fontSize: 6, color: "#9CA3AF" }}>
              {isAr
                ? company?.company_name_ar || company?.company_name_en || ""
                : company?.company_name_en || company?.company_name_ar || ""}
            </Text>
          </View>
        </Page>,
      );
    }
  }

  return renderToBuffer(
    <Document title={`Labels · ${job.id}`} author="Platform Inventory" language={locale}>
      {pages}
    </Document>,
  );
}
