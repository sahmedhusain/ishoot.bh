import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { notFound } from "next/navigation";
import { getPaymentById, getCompanySettings } from "@ishoot/database";
import { PaymentDetailView } from "../../../../components/payments/PaymentDetailView";

export const dynamic = "force-dynamic";

interface PaymentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({
  params,
}: PaymentDetailPageProps) {
  await requirePermission("payments", "read");
  const { id } = await params;

  const [payment, company] = await Promise.all([
    getPaymentById(id),
    getCompanySettings(),
  ]);

  if (!payment || !company) {
    notFound();
  }

  return <PaymentDetailView payment={payment} company={company} />;
}
