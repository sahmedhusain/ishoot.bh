-- Migration: move finance entities to finance schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Invoice') THEN
        INSERT INTO finance.invoice (
            id, invoice_number, quotation_id, contact_id, deal_id, status,
            issue_date, due_date, subtotal, discount, vat_rate, vat_amount,
            total, amount_paid, balance_due, currency, notes, terms,
            created_at, updated_at
        )
        SELECT
            id, "invoiceNumber", "quotationId", "clientId", "dealId", status,
            "issueDate", "dueDate", subtotal, discount, "vatRate", "vatAmount",
            total, "amountPaid", "balanceDue", currency, notes, terms,
            "createdAt", "updatedAt"
        FROM public."Invoice"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'InvoiceLineItem') THEN
        INSERT INTO finance.invoice_item (
            id, invoice_id, description, quantity, unit_price, amount, sort_order
        )
        SELECT
            id, "invoiceId", description, quantity, "unitPrice", amount, "sortOrder"
        FROM public."InvoiceLineItem"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
        INSERT INTO finance.payment (
            id, payment_number, invoice_id, contact_id, amount, currency,
            payment_method, payment_date, reference, status, notes, created_at
        )
        SELECT
            id, "paymentNumber", "invoiceId", "clientId", amount, currency,
            "paymentMethod", "paymentDate", reference, status, notes, "createdAt"
        FROM public."Payment"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ExpenseCategory') THEN
        INSERT INTO finance.expense_category (
            id, name_en, name_ar, code, sort_order
        )
        SELECT
            id, "nameEn", "nameAr", code, "sortOrder"
        FROM public."ExpenseCategory"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Expense') THEN
        INSERT INTO finance.expense (
            id, title, category_id, amount, currency, expense_date, status,
            notes, vendor, receipt_url, created_by, approved_by, created_at, updated_at
        )
        SELECT
            id, title, "categoryId", amount, currency, "expenseDate", status,
            notes, vendor, "receiptUrl", "createdBy", "approvedBy", "createdAt", "updatedAt"
        FROM public."Expense"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BankSettlement') THEN
        INSERT INTO finance.bank_settlement (
            id, settlement_number, bank_account, amount, currency, settled_at, status, notes, created_at
        )
        SELECT
            id, "settlementNumber", "bankAccount", amount, currency, "settledAt", status, notes, "createdAt"
        FROM public."BankSettlement"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
