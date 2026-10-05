import { hasPermission, requirePermission } from "../../../../lib/auth";
import { SigningPanel } from "../../../../components/sales/SigningPanel";
import { notFound } from "next/navigation";
import { getPaymentById, getSigningState, canSignDocument } from "@ishoot/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { PaymentDetailView } from "../../../../components/payments/PaymentDetailView";

export const dynamic = "force-dynamic";

interface PaymentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({
  params,
}: PaymentDetailPageProps) {
  const user = await requirePermission("payments", "read");
  const { id } = await params;

  const [payment, company] = await Promise.all([
    getPaymentById(id),
    getCachedCompanySettings(),
  ]);

  if (!payment || !company) {
    notFound();
  }

  const [signing, canSign] = await Promise.all([
    getSigningState("receipt", id),
    canSignDocument("receipt", id, user, await hasPermission("payments", "write")),
  ]);
  return (
    <>
      <PaymentDetailView payment={payment} company={company} signing={signing.signed ? { signatureUrl: signing.signatureUrl, signerName: signing.signedBy?.name ?? "" } : null} />
      <div className="max-w-6xl mx-auto mt-6 no-print">
        <SigningPanel type="receipt" id={id} state={signing} canSign={canSign} hasSignature={!!user.signature_url} />
      </div>
    </>
  );
}
