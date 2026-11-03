-- Reject inconsistent existing configuration; an operator must reconcile it, never fabricate identity.
ALTER TABLE "CompanySetting"
ADD CONSTRAINT "CompanySetting_vat_registration_check" CHECK (
    NOT "vatEnabled"
    OR length(trim(COALESCE("vatId", ''))) > 0
),
ADD CONSTRAINT "CompanySetting_financial_config_check" CHECK (
    "vatPercentage" BETWEEN 0 AND 100
    AND "currencyDecimals" BETWEEN 0 AND 4
    AND "paymentTermsDays" BETWEEN 0 AND 3650
    AND "invoiceNextNumber" > 0
    AND "receiptNextNumber" > 0
    AND length(trim("invoicePrefix")) BETWEEN 1 AND 64
    AND length(trim("receiptPrefix")) BETWEEN 1 AND 64
    AND "defaultCurrency" IN (
        'BHD',
        'SAR',
        'AED',
        'KWD',
        'OMR',
        'QAR',
        'USD'
    )
);