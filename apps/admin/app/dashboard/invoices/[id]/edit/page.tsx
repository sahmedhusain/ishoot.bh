import * as React from "react";
import { notFound } from "next/navigation";
import {
  getInvoiceById,
  getCRMContacts,
  getCompanySettings,
  getAllServices,
} from "@ishoot/database";
import { InvoiceEditFormView } from "../../../../../components/invoices/InvoiceEditFormView";

export const dynamic = "force-dynamic";

interface InvoiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceEditPage({
  params,
}: InvoiceEditPageProps) {
  const { id } = await params;

  const [invoice, contacts, company, services] = await Promise.all([
    getInvoiceById(id),
    getCRMContacts(),
    getCompanySettings(),
    getAllServices({ isActive: true }),
  ]);

  if (!invoice || !company) {
    notFound();
  }

  return (
    <InvoiceEditFormView
      invoice={invoice}
      initialContacts={contacts}
      company={company}
      services={services}
    />
  );
}
