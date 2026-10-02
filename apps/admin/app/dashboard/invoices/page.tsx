import { requirePermission } from "../../../lib/auth";
import * as React from "react";
import { getAllInvoices } from "@ishoot/database";
import { InvoicesListView } from "../../../components/invoices/InvoicesListView";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requirePermission("invoices", "read");
  const invoices = await getAllInvoices();
  const active = invoices.filter((invoice) => invoice.currency === "BHD" && invoice.status !== "void");
  const finance = {
    outstanding: active.filter((invoice) => invoice.status !== "draft").reduce((total, invoice) => total + invoice.amount_due, 0),
    overdue: active.filter((invoice) => invoice.status !== "draft" && invoice.due_date < new Date().toISOString().slice(0, 10)).reduce((total, invoice) => total + invoice.amount_due, 0),
    discountsGiven: active.reduce((total, invoice) => total + invoice.discount_amount, 0),
  };

  return <InvoicesListView initialInvoices={invoices} finance={finance} />;
}
