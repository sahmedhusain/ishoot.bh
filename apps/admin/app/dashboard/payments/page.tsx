import { requirePermission } from "../../../lib/auth";
import * as React from "react";
import {
  getAllPayments,
  getAllInvoices,
  getCompanySettings,
} from "@ishoot/database";
import { PaymentsManagementView } from "../../../components/payments/PaymentsManagementView";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requirePermission("payments", "read");
  await requirePermission("invoices", "read");
  const [payments, invoices, company] = await Promise.all([
    getAllPayments(),
    getAllInvoices(),
    getCompanySettings(),
  ]);

  return (
    <PaymentsManagementView
      initialPayments={payments}
      invoices={invoices}
      company={company}
    />
  );
}
