import * as React from "react";
import {
  getAllAttachments,
  getCRMContacts,
  getCRMDeals,
  getAllInvoices,
} from "@ishoot/database";
import { ArchiveManagementView } from "../../../components/archive/ArchiveManagementView";

export const dynamic = "force-dynamic";

export default async function ArchiveVaultPage() {
  const [attachments, contacts, deals, invoices] = await Promise.all([
    getAllAttachments(),
    getCRMContacts(),
    getCRMDeals(),
    getAllInvoices(),
  ]);

  return (
    <ArchiveManagementView
      initialAttachments={attachments}
      contacts={contacts}
      deals={deals}
      invoices={invoices}
    />
  );
}
