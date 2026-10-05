-- Quotations, invoices and receipts are signed and stamped by a person after approval.
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedById" TEXT,
ADD COLUMN     "signerSignatureUrl" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedById" TEXT,
ADD COLUMN     "signerSignatureUrl" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedById" TEXT,
ADD COLUMN     "signerSignatureUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_signed_check" CHECK (("signedAt" IS NULL) = ("signedById" IS NULL));
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_signed_check" CHECK (("signedAt" IS NULL) = ("signedById" IS NULL));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_signed_check" CHECK (("signedAt" IS NULL) = ("signedById" IS NULL));

-- Documents already with clients were effectively signed by whoever issued them.
UPDATE "Quotation" q SET "signedById" = q."createdById", "signedAt" = q."updatedAt", "signerSignatureUrl" = u."signatureUrl"
FROM "User" u WHERE u.id = q."createdById" AND q.status IN ('issued', 'accepted', 'rejected', 'expired', 'converted');
UPDATE "Invoice" i SET "signedById" = i."createdById", "signedAt" = i."updatedAt", "signerSignatureUrl" = u."signatureUrl", "approvalStatus" = 'approved'
FROM "User" u WHERE u.id = i."createdById" AND i.status <> 'draft';
UPDATE "Payment" p SET "signedById" = p."createdById", "signedAt" = p."createdAt", "signerSignatureUrl" = u."signatureUrl"
FROM "User" u WHERE u.id = p."createdById";
