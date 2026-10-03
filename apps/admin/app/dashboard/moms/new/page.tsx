import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getCRMContacts, getCRMDeals } from "@ishoot/database";
import { NewMomFormView } from "../../../../components/moms/NewMomFormView";

export const dynamic = "force-dynamic";

export default async function NewMomPage() {
  await requirePermission("moms", "write");

  const [contacts, deals] = await Promise.all([
    getCRMContacts(),
    getCRMDeals(),
  ]);

  const clients = contacts.map((c) => ({
    id: c.id,
    name: c.full_name || c.company || "Unnamed Client",
    company: c.company,
  }));

  const dealList = deals.map((d) => ({
    id: d.id,
    title: d.title,
  }));

  return <NewMomFormView clients={clients} deals={dealList} />;
}
