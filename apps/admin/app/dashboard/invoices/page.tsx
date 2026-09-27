import * as React from "react";
import { getAllInvoices, getFinancialSummary } from "@ishoot/database";
import { InvoicesListView } from "../../../components/invoices/InvoicesListView";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, finance] = await Promise.all([
    getAllInvoices(),
    getFinancialSummary(),
  ]);

  return <InvoicesListView initialInvoices={invoices} finance={finance} />;
}
