import * as React from "react";
import { getAllInquiries } from "@ishoot/database";
import { LeadsManagementView } from "../../../../components/crm/LeadsManagementView";

export const dynamic = "force-dynamic";

export default async function LeadsInboxPage() {
  const inquiries = await getAllInquiries();

  return <LeadsManagementView initialInquiries={inquiries} />;
}
