import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getCRMContacts } from "@ishoot/database";
import { ContactsManagementView } from "../../../../components/crm/ContactsManagementView";

export const dynamic = "force-dynamic";

export default async function ContactsDirectoryPage() {
  await requirePermission("contacts", "read");
  const contacts = await getCRMContacts();

  return <ContactsManagementView initialContacts={contacts} />;
}
