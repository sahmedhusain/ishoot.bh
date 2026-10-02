import { requirePermission } from "../../../lib/auth";
import * as React from "react";
import {
  getAllAttachments,
  getCRMContacts,
  getCRMDeals,
  getAllInvoices,
  getAllPayments,
} from "@ishoot/database";
import { ArchiveManagementView } from "../../../components/archive/ArchiveManagementView";

export const dynamic = "force-dynamic";

export default async function ArchiveVaultPage() {
  for (const resource of ["contacts", "deals", "invoices", "payments", "settings"] as const) await requirePermission(resource, "read");
  const [attachments, contacts, deals, invoices, payments] = await Promise.all([
    getAllAttachments(),
    getCRMContacts(),
    getCRMDeals(),
    getAllInvoices(),
    getAllPayments(),
  ]);

  return (
    <ArchiveManagementView
      initialAttachments={attachments}
      contacts={contacts}
      deals={deals}
      invoices={invoices}
      payments={payments}
    />
  );
}
