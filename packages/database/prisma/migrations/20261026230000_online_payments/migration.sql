-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN "paymentGateway" TEXT;

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "sessionId" TEXT,
    "gatewayPaymentId" TEXT,
    "amount" DECIMAL(12, 3) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "amountRefunded" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "gateway" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attemptId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("gateway", "eventId")
);

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_idx" ON "PaymentAttempt" ("orderId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_createdAt_idx" ON "PaymentAttempt" ("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_gateway_sessionId_key" ON "PaymentAttempt" ("gateway", "sessionId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity
ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_status_check" CHECK (
    "status" IN (
        'created',
        'pending',
        'paid',
        'failed',
        'expired'
    )
);

ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_gateway_check" CHECK (
    "gateway" IN (
        'stripe',
        'tap',
        'paypal',
        'checkout_com',
        'paytabs',
        'moyasar',
        'hyperpay'
    )
);

ALTER TABLE "PaymentAttempt"
ADD CONSTRAINT "PaymentAttempt_amounts_check" CHECK (
    "amount" > 0
    AND "amountRefunded" >= 0
    AND "amountRefunded" <= "amount"
);

ALTER TABLE "StoreSettings"
ADD CONSTRAINT "StoreSettings_paymentGateway_check" CHECK (
    "paymentGateway" IS NULL
    OR "paymentGateway" IN (
        'stripe',
        'tap',
        'paypal',
        'checkout_com',
        'paytabs',
        'moyasar',
        'hyperpay'
    )
);