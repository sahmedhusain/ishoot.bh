-- name: GetInvoiceByID :one
SELECT * FROM finance.invoice WHERE id = $1 LIMIT 1;

-- name: GetInvoiceByNumber :one
SELECT * FROM finance.invoice WHERE invoice_number = $1 LIMIT 1;

-- name: ListInvoices :many
SELECT * FROM finance.invoice ORDER BY created_at DESC;

-- name: ListInvoicesByContact :many
SELECT * FROM finance.invoice WHERE contact_id = $1 OR client_id = $1 ORDER BY created_at DESC;

-- name: ListInvoicesByQuotation :many
SELECT * FROM finance.invoice WHERE quotation_id = $1 ORDER BY created_at DESC;

-- name: CreateInvoice :one
INSERT INTO finance.invoice (
    id, invoice_number, quotation_id, contact_id, deal_id, status,
    issue_date, due_date, subtotal, discount, vat_rate, vat_amount,
    total, amount_paid, balance_due, currency, notes, terms,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12,
    $13, $14, $15, $16, $17, $18,
    now(), now()
) RETURNING *;

-- name: UpdateInvoice :one
UPDATE finance.invoice SET
    quotation_id = $2,
    contact_id = $3,
    deal_id = $4,
    status = $5,
    issue_date = $6,
    due_date = $7,
    subtotal = $8,
    discount = $9,
    vat_rate = $10,
    vat_amount = $11,
    total = $12,
    amount_paid = $13,
    balance_due = $14,
    currency = $15,
    notes = $16,
    terms = $17,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateInvoiceStatus :one
UPDATE finance.invoice SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: RecordPaymentOnInvoice :one
UPDATE finance.invoice SET
    amount_paid = amount_paid + $2,
    balance_due = total - (amount_paid + $2),
    status = CASE WHEN total - (amount_paid + $2) <= 0 THEN 'paid' ELSE 'partially_paid' END,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteInvoice :exec
DELETE FROM finance.invoice WHERE id = $1;

-- name: ListInvoiceItems :many
SELECT * FROM finance.invoice_item WHERE invoice_id = $1 ORDER BY sort_order ASC;

-- name: InsertInvoiceItem :one
INSERT INTO finance.invoice_item (
    id, invoice_id, item_kind, service_id, product_id, variant_id, sku, unit,
    description, description_en, description_ar, quantity, unit_price, tax_rate, amount, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14, $15, $16
) RETURNING *;

-- name: DeleteInvoiceItems :exec
DELETE FROM finance.invoice_item WHERE invoice_id = $1;

-- name: GetPaymentByID :one
SELECT * FROM finance.payment WHERE id = $1 LIMIT 1;

-- name: ListPayments :many
SELECT * FROM finance.payment ORDER BY created_at DESC;

-- name: ListPaymentsByInvoice :many
SELECT DISTINCT p.*
FROM finance.payment p
LEFT JOIN finance.payment_allocation pa ON pa.payment_id = p.id
WHERE p.invoice_id = $1 OR pa.invoice_id = $1
ORDER BY p.created_at DESC;

-- name: ListPaymentsByContact :many
SELECT * FROM finance.payment WHERE contact_id = $1 ORDER BY created_at DESC;

-- name: CreatePayment :one
INSERT INTO finance.payment (
    id, payment_number, invoice_id, contact_id, amount, currency,
    payment_method, payment_date, reference, status, notes, receipt_number, bank_settlement_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12, $13, now()
) RETURNING *;

-- name: LinkPaymentToSettlement :one
UPDATE finance.payment SET
    bank_settlement_id = $2
WHERE id = $1
RETURNING *;

-- name: DeletePayment :exec
DELETE FROM finance.payment WHERE id = $1;

-- name: CreatePaymentAllocation :one
INSERT INTO finance.payment_allocation (
    id, payment_id, invoice_id, allocated_amount, currency, allocated_at
) VALUES (
    $1, $2, $3, $4, $5, now()
) RETURNING *;

-- name: ListPaymentAllocationsByPayment :many
SELECT * FROM finance.payment_allocation WHERE payment_id = $1 ORDER BY allocated_at ASC;

-- name: ListPaymentAllocationsByInvoice :many
SELECT * FROM finance.payment_allocation WHERE invoice_id = $1 ORDER BY allocated_at ASC;

-- name: DeletePaymentAllocationsByPayment :exec
DELETE FROM finance.payment_allocation WHERE payment_id = $1;

-- name: RecalculateInvoicePayments :one
WITH alloc AS (
    SELECT COALESCE(SUM(allocated_amount), 0)::numeric(14, 3) AS total_allocated
    FROM finance.payment_allocation
    WHERE invoice_id = $1
)
UPDATE finance.invoice i SET
    amount_paid = a.total_allocated,
    balance_due = GREATEST(COALESCE(i.total, i.total_amount, 0) - a.total_allocated, 0),
    status = CASE
        WHEN a.total_allocated <= 0 AND i.status IN ('paid', 'partially_paid') THEN 'issued'
        WHEN COALESCE(i.total, i.total_amount, 0) - a.total_allocated <= 0 AND a.total_allocated > 0 THEN 'paid'
        WHEN a.total_allocated > 0 THEN 'partially_paid'
        ELSE i.status
    END,
    updated_at = now()
FROM alloc a
WHERE i.id = $1
RETURNING i.*;

-- name: ListExpenseCategories :many
SELECT * FROM finance.expense_category ORDER BY sort_order ASC, name_en ASC;

-- name: CreateExpenseCategory :one
INSERT INTO finance.expense_category (
    id, name_en, name_ar, code, sort_order
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: UpdateExpenseCategory :one
UPDATE finance.expense_category SET
    name_en = $2,
    name_ar = $3,
    code = $4,
    sort_order = $5
WHERE id = $1
RETURNING *;

-- name: DeleteExpenseCategory :exec
DELETE FROM finance.expense_category WHERE id = $1;

-- name: GetExpenseByID :one
SELECT * FROM finance.expense WHERE id = $1 LIMIT 1;

-- name: ListExpenses :many
SELECT * FROM finance.expense ORDER BY expense_date DESC, created_at DESC;

-- name: CreateExpense :one
INSERT INTO finance.expense (
    id, title, category_id, amount, currency, expense_date, status,
    notes, vendor, receipt_url, created_by, approved_by, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, now(), now()
) RETURNING *;

-- name: UpdateExpense :one
UPDATE finance.expense SET
    title = $2,
    category_id = $3,
    amount = $4,
    currency = $5,
    expense_date = $6,
    status = $7,
    notes = $8,
    vendor = $9,
    receipt_url = $10,
    approved_by = $11,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateExpenseStatus :one
UPDATE finance.expense SET
    status = $2,
    approved_by = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteExpense :exec
DELETE FROM finance.expense WHERE id = $1;

-- name: ListBankSettlements :many
SELECT * FROM finance.bank_settlement ORDER BY settled_at DESC;

-- name: CreateBankSettlement :one
INSERT INTO finance.bank_settlement (
    id, settlement_number, bank_account, amount, currency, settled_at, status, notes, payment_id, settlement_date, bank_reference, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now()
) RETURNING *;

-- name: LinkBankSettlementPayment :one
UPDATE finance.bank_settlement SET
    payment_id = $2
WHERE id = $1
RETURNING *;

-- name: UpsertFinanceContactRef :exec
INSERT INTO finance.contact_ref (
    id, first_name, last_name, company, email, phone, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now()
) ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    company = EXCLUDED.company,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = now();

-- name: ListFinanceContacts :many
SELECT * FROM finance.contact_ref ORDER BY company ASC NULLS LAST, first_name ASC;

-- name: UpsertFinanceQuotationRef :exec
INSERT INTO finance.quotation_ref (
    id, quotation_number, deal_id, contact_id, currency, subtotal, discount, vat_rate, vat_amount, total, status, items, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now()
) ON CONFLICT (id) DO UPDATE SET
    quotation_number = EXCLUDED.quotation_number,
    deal_id = EXCLUDED.deal_id,
    contact_id = EXCLUDED.contact_id,
    currency = EXCLUDED.currency,
    subtotal = EXCLUDED.subtotal,
    discount = EXCLUDED.discount,
    vat_rate = EXCLUDED.vat_rate,
    vat_amount = EXCLUDED.vat_amount,
    total = EXCLUDED.total,
    status = EXCLUDED.status,
    items = EXCLUDED.items,
    updated_at = now();

-- name: DeleteFinanceQuotationRef :exec
DELETE FROM finance.quotation_ref WHERE id = $1;

-- name: GetFinanceQuotationRef :one
SELECT * FROM finance.quotation_ref WHERE id = $1 LIMIT 1;

-- name: ListFinanceQuotationsRef :many
SELECT * FROM finance.quotation_ref ORDER BY updated_at DESC;

-- name: UpsertFinanceCatalogItemRef :exec
INSERT INTO finance.catalog_item_ref (
    kind, id, variant_id, sku, name_en, name_ar, unit, unit_price, currency, tax_rate, is_active, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now()
) ON CONFLICT (kind, id, variant_id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name_en = EXCLUDED.name_en,
    name_ar = EXCLUDED.name_ar,
    unit = EXCLUDED.unit,
    unit_price = EXCLUDED.unit_price,
    currency = EXCLUDED.currency,
    tax_rate = EXCLUDED.tax_rate,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- name: DeleteFinanceCatalogItemRef :exec
DELETE FROM finance.catalog_item_ref WHERE kind = $1 AND id = $2;

-- name: ListFinanceCatalogItems :many
SELECT * FROM finance.catalog_item_ref WHERE is_active = true ORDER BY kind ASC, name_en ASC;
