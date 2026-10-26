-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "guestCheckout" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFee" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "freeDeliveryOver" DECIMAL(12, 3),
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bankInstructionsEn" TEXT,
    "bankInstructionsAr" TEXT,
    "orderNotifyEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(12, 3) NOT NULL,
    "minOrder" DECIMAL(12, 3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT,
    "contactId" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'website',
    "status" TEXT NOT NULL DEFAULT 'placed',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paymentMethod" TEXT NOT NULL,
    "fulfilment" TEXT NOT NULL DEFAULT 'delivery',
    "shippingAddress" JSONB,
    "subtotal" DECIMAL(12, 3) NOT NULL,
    "discountAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "vatAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "total" DECIMAL(12, 3) NOT NULL,
    "amountPaid" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "amountRefunded" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "note" TEXT,
    "warehouseId" TEXT,
    "invoiceId" TEXT,
    "createdById" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14, 3) NOT NULL,
    "unitPrice" DECIMAL(12, 3) NOT NULL,
    "vatExempt" BOOLEAN NOT NULL DEFAULT false,
    "lineTotal" DECIMAL(12, 3) NOT NULL,
    "locationId" TEXT,
    "returnedQuantity" DECIMAL(14, 3) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT,
    "note" TEXT,
    "amount" DECIMAL(12, 3),
    "byId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon" ("code");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_number_key" ON "SalesOrder" ("number");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_invoiceId_key" ON "SalesOrder" ("invoiceId");

-- CreateIndex
CREATE INDEX "SalesOrder_status_idx" ON "SalesOrder" ("status");

-- CreateIndex
CREATE INDEX "SalesOrder_customerId_idx" ON "SalesOrder" ("customerId");

-- CreateIndex
CREATE INDEX "SalesOrder_placedAt_idx" ON "SalesOrder" ("placedAt");

-- CreateIndex
CREATE INDEX "SalesOrderEvent_orderId_createdAt_idx" ON "SalesOrderEvent" ("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "SalesOrder"
ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine"
ADD CONSTRAINT "SalesOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderEvent"
ADD CONSTRAINT "SalesOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Guards the code also keeps.
ALTER TABLE "SalesOrderLine"
ADD CONSTRAINT "SalesOrderLine_amounts_check" CHECK (
    "quantity" > 0
    AND "unitPrice" >= 0
    AND "returnedQuantity" >= 0
    AND "returnedQuantity" <= "quantity"
);

ALTER TABLE "SalesOrder"
ADD CONSTRAINT "SalesOrder_amounts_check" CHECK (
    "total" >= 0
    AND "amountPaid" >= 0
    AND "amountRefunded" >= 0
    AND "amountRefunded" <= "amountPaid"
);

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_value_check" CHECK (
    "value" > 0
    AND (
        "kind" <> 'percent'
        OR "value" <= 100
    )
);