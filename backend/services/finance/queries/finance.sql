SELECT * FROM finance.invoice WHERE id = $1 LIMIT 1;
SELECT * FROM finance.invoice WHERE invoice_number = $1 LIMIT 1;
SELECT * FROM finance.invoice ORDER BY created_at DESC;
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
UPDATE finance.invoice SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;
UPDATE finance.invoice SET
    amount_paid = amount_paid + $2,
    balance_due = total - (amount_paid + $2),
    status = CASE WHEN total - (amount_paid + $2) <= 0 THEN 'paid' ELSE 'partially_paid' END,
    updated_at = now()
WHERE id = $1
RETURNING *;
DELETE FROM finance.invoice WHERE id = $1;
SELECT * FROM finance.invoice_item WHERE invoice_id = $1 ORDER BY sort_order ASC;
INSERT INTO finance.invoice_item (
    id, invoice_id, description, quantity, unit_price, amount, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;
DELETE FROM finance.invoice_item WHERE invoice_id = $1;
SELECT * FROM finance.payment WHERE id = $1 LIMIT 1;
SELECT * FROM finance.payment ORDER BY created_at DESC;
SELECT * FROM finance.payment WHERE invoice_id = $1 ORDER BY created_at DESC;
INSERT INTO finance.payment (
    id, payment_number, invoice_id, contact_id, amount, currency,
    payment_method, payment_date, reference, status, notes, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, now()
) RETURNING *;
DELETE FROM finance.payment WHERE id = $1;
SELECT * FROM finance.expense_category ORDER BY sort_order ASC, name_en ASC;
INSERT INTO finance.expense_category (
    id, name_en, name_ar, code, sort_order
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;
UPDATE finance.expense_category SET
    name_en = $2,
    name_ar = $3,
    code = $4,
    sort_order = $5
WHERE id = $1
RETURNING *;
DELETE FROM finance.expense_category WHERE id = $1;
SELECT * FROM finance.expense WHERE id = $1 LIMIT 1;
SELECT * FROM finance.expense ORDER BY expense_date DESC, created_at DESC;
INSERT INTO finance.expense (
    id, title, category_id, amount, currency, expense_date, status,
    notes, vendor, receipt_url, created_by, approved_by, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, now(), now()
) RETURNING *;
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
UPDATE finance.expense SET
    status = $2,
    approved_by = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;
DELETE FROM finance.expense WHERE id = $1;
SELECT * FROM finance.bank_settlement ORDER BY settled_at DESC;
INSERT INTO finance.bank_settlement (
    id, settlement_number, bank_account, amount, currency, settled_at, status, notes, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
) RETURNING *;
