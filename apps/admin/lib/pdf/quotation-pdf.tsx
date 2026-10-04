import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "IBM Plex Sans Arabic",
  src: "https://fonts.gstatic.com/s/ibmplexsansarabic/v4/w8kaH2cz2ym-N8a9_Jv5eG8q_0MDeT6x-48KxwY.ttf",
});

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "IBM Plex Sans Arabic", fontSize: 10, color: "#333" },
  header: { fontSize: 16, marginBottom: 20, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 5, marginBottom: 5 },
  tableRow: { flexDirection: "row", marginBottom: 5 },
  colDesc: { width: "40%" },
  colQty: { width: "20%", textAlign: "center" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  totalSection: { marginTop: 20, alignItems: "flex-end" }
});

export function QuotationPdf({ quotation, companySettings }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Quotation / عرض سعر: {quotation.quotationNumber}</Text>
        <View style={styles.row}>
          <Text>Date: {new Date(quotation.issueDate).toLocaleDateString()}</Text>
          <Text>Valid Until: {new Date(quotation.validUntilDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {quotation.lineItems.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.descriptionEn}</Text>
              <Text style={styles.colQty}>{item.quantity.toString()}</Text>
              <Text style={styles.colPrice}>{item.unitPrice.toString()}</Text>
              <Text style={styles.colTotal}>{item.lineTotal.toString()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.totalSection}>
          <Text>Subtotal: {quotation.subtotal.toString()} {quotation.currency}</Text>
          {quotation.vatEnabled && <Text>VAT ({quotation.vatPercentage.toString()}%): {quotation.vatAmount.toString()} {quotation.currency}</Text>}
          <Text style={{ fontWeight: "bold", marginTop: 5 }}>Total: {quotation.totalAmount.toString()} {quotation.currency}</Text>
        </View>
      </Page>
    </Document>
  );
}
