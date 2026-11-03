-- Periodic company costs (rent, utilities, phones, subscriptions…) recorded automatically or reminded.
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "categoryId" TEXT,
    "vendorName" TEXT,
    "reference" TEXT,
    "amount" DECIMAL(12, 3) NOT NULL,
    "inputVatAmount" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "isVatRecoverable" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'BHD',
    "paymentMethod" TEXT,
    "frequency" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextDueDate" DATE NOT NULL,
    "autoRecord" BOOLEAN NOT NULL DEFAULT false,
    "remindDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdById" TEXT,
    "lastRecordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringExpense_frequency_check" CHECK (
        "frequency" IN (
            'weekly',
            'monthly',
            'quarterly',
            'semiannual',
            'yearly'
        )
    ),
    CONSTRAINT "RecurringExpense_amount_check" CHECK (
        "amount" > 0
        AND "inputVatAmount" >= 0
        AND "inputVatAmount" < "amount"
    ),
    CONSTRAINT "RecurringExpense_dates_check" CHECK (
        "endDate" IS NULL
        OR "endDate" >= "startDate"
    ),
    CONSTRAINT "RecurringExpense_remind_check" CHECK (
        "remindDaysBefore" BETWEEN 0 AND 60
    )
);

CREATE INDEX "RecurringExpense_isActive_nextDueDate_idx" ON "RecurringExpense" ("isActive", "nextDueDate");

ALTER TABLE "Expense" ADD COLUMN "recurringExpenseId" TEXT;

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- One expense per bill and due date.
CREATE UNIQUE INDEX "Expense_recurring_due" ON "Expense" (
    "recurringExpenseId",
    "expenseDate"
)
WHERE
    "recurringExpenseId" IS NOT NULL;

-- Categories for the usual periodic bills.
INSERT INTO "ExpenseCategory" ("id", "slug", "nameEn", "nameAr", "color", "displayOrder", "kind", "isSystem")
VALUES
  (gen_random_uuid()::text, 'rent', 'Rent', 'الإيجار', '#7C6FB0', 30, 'operating', true),
  (gen_random_uuid()::text, 'utilities', 'Electricity and water', 'الكهرباء والماء', '#3B82B6', 31, 'operating', true),
  (gen_random_uuid()::text, 'subscriptions', 'Subscriptions', 'الاشتراكات', '#0E9F8E', 32, 'operating', true)
ON CONFLICT ("slug") DO NOTHING;