-- Taxes besides VAT: a registry with rate, registration number and certificate, and a per-document snapshot.
ALTER TABLE "Invoice" ADD COLUMN "otherTaxAmount" DECIMAL(12,3) NOT NULL DEFAULT 0;
ALTER TABLE "Quotation" ADD COLUMN "otherTaxAmount" DECIMAL(12,3) NOT NULL DEFAULT 0;

CREATE TABLE "TaxRate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "ratePercent" DECIMAL(5,2) NOT NULL,
  "registrationNumber" TEXT,
  "certificateUrl" TEXT,
  "certificateValidUntil" DATE,
  "appliesToInvoices" BOOLEAN NOT NULL DEFAULT true,
  "appliesToQuotations" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaxRate_rate_check" CHECK ("ratePercent" > 0 AND "ratePercent" <= 100),
  CONSTRAINT "TaxRate_code_check" CHECK ("code" ~ '^[a-z0-9][a-z0-9-]{1,39}$' AND "code" <> 'vat')
);
CREATE UNIQUE INDEX "TaxRate_code_key" ON "TaxRate"("code");

CREATE TABLE "DocumentTax" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT,
  "quotationId" TEXT,
  "taxRateId" TEXT,
  "code" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "ratePercent" DECIMAL(5,2) NOT NULL,
  "registrationNumber" TEXT,
  "amount" DECIMAL(12,3) NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DocumentTax_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentTax_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DocumentTax_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DocumentTax_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DocumentTax_one_document" CHECK (("invoiceId" IS NULL) <> ("quotationId" IS NULL)),
  CONSTRAINT "DocumentTax_amount_check" CHECK ("amount" >= 0)
);
CREATE INDEX "DocumentTax_invoiceId_idx" ON "DocumentTax"("invoiceId");
CREATE INDEX "DocumentTax_quotationId_idx" ON "DocumentTax"("quotationId");
CREATE UNIQUE INDEX "DocumentTax_invoice_code" ON "DocumentTax"("invoiceId", "code") WHERE "invoiceId" IS NOT NULL;
CREATE UNIQUE INDEX "DocumentTax_quotation_code" ON "DocumentTax"("quotationId", "code") WHERE "quotationId" IS NOT NULL;
