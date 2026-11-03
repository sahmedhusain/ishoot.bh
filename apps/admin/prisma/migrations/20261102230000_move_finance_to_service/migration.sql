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
            i.id,
            i."invoiceNumber",
            q.id,
            i."clientId",
            i."dealId",
            i.status,
            i."issueDate",
            i."dueDate",
            i.subtotal,
            i."discountAmount",
            i."vatPercentage",
            i."vatAmount",
            i."totalAmount",
            0.000,
            i."totalAmount",
            i.currency,
            COALESCE(i."notesEn", i."notesAr"),
            NULL,
            i."createdAt",
            i."updatedAt"
        FROM public."Invoice" i
        LEFT JOIN public."Quotation" q ON q."invoiceId" = i.id
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'InvoiceLineItem') THEN
        INSERT INTO finance.invoice_item (
            id, invoice_id, description, quantity, unit_price, amount, sort_order
        )
        SELECT
            id, "invoiceId", "descriptionEn", quantity, "unitPrice", "lineTotal", "displayOrder"
        FROM public."InvoiceLineItem"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Payment') THEN
        INSERT INTO finance.payment (
            id, payment_number, invoice_id, contact_id, amount, currency,
            payment_method, payment_date, reference, status, notes, created_at
        )
        SELECT
            p.id,
            p."receiptNumber",
            p."invoiceId",
            i."clientId",
            p.amount,
            p.currency,
            p."paymentMethod",
            p."paymentDate",
            p."referenceNumber",
            'completed',
            p.notes,
            p."createdAt"
        FROM public."Payment" p
        LEFT JOIN public."Invoice" i ON i.id = p."invoiceId"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ExpenseCategory') THEN
        INSERT INTO finance.expense_category (
            id, name_en, name_ar, code, sort_order
        )
        SELECT
            id, "nameEn", "nameAr", slug, "displayOrder"
        FROM public."ExpenseCategory"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Expense') THEN
        INSERT INTO finance.expense (
            id, title, category_id, amount, currency, expense_date, status,
            notes, vendor, receipt_url, created_by, approved_by, created_at, updated_at
        )
        SELECT
            id, "descriptionEn", "categoryId", amount, currency, "expenseDate", status,
            notes, "vendorName", "receiptUrl", "createdById", NULL, "createdAt", "createdAt"
        FROM public."Expense"
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BankSettlement') THEN
        INSERT INTO finance.bank_settlement (
            id, settlement_number, bank_account, amount, currency, settled_at, status, notes, created_at
        )
        SELECT
            id, COALESCE("bankReference", id), 'main', "settledAmountBhd", 'BHD', "settlementDate"::timestamp with time zone, status, NULL, "createdAt"
        FROM public."BankSettlement"
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
