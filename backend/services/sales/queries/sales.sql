-- name: GetContactByID :one
SELECT * FROM sales.contact WHERE id = $1 LIMIT 1;

-- name: ListContacts :many
SELECT * FROM sales.contact ORDER BY created_at DESC;

-- name: CreateContact :one
INSERT INTO sales.contact (
    id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()
) RETURNING *;

-- name: UpdateContact :one
UPDATE sales.contact SET
    first_name = $2,
    last_name = $3,
    email = $4,
    phone = $5,
    company = $6,
    contact_type = $7,
    status = $8,
    notes = $9,
    tags = $10,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteContact :exec
DELETE FROM sales.contact WHERE id = $1;

-- name: GetDealByID :one
SELECT * FROM sales.deal WHERE id = $1 LIMIT 1;

-- name: ListDeals :many
SELECT * FROM sales.deal ORDER BY created_at DESC;

-- name: ListDealsByContact :many
SELECT * FROM sales.deal WHERE contact_id = $1 ORDER BY created_at DESC;

-- name: CreateDeal :one
INSERT INTO sales.deal (
    id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now()
) RETURNING *;

-- name: UpdateDeal :one
UPDATE sales.deal SET
    title = $2,
    contact_id = $3,
    stage = $4,
    value = $5,
    currency = $6,
    probability = $7,
    expected_close_date = $8,
    status = $9,
    assigned_to = $10,
    notes = $11,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateDealStage :one
UPDATE sales.deal SET
    stage = $2,
    status = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteDeal :exec
DELETE FROM sales.deal WHERE id = $1;

-- name: GetInquiryByID :one
SELECT * FROM sales.inquiry WHERE id = $1 LIMIT 1;

-- name: ListInquiries :many
SELECT * FROM sales.inquiry ORDER BY created_at DESC;

-- name: CreateInquiry :one
INSERT INTO sales.inquiry (
    id, inquiry_type, subject, message, status, priority, requester_name, requester_email, requester_phone, assignee_id, deal_id, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now()
) RETURNING *;

-- name: UpdateInquiryStatus :one
UPDATE sales.inquiry SET
    status = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: AssignInquiry :one
UPDATE sales.inquiry SET
    assignee_id = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteInquiry :exec
DELETE FROM sales.inquiry WHERE id = $1;

-- name: GetQuotationByID :one
SELECT * FROM sales.quotation WHERE id = $1 LIMIT 1;

-- name: GetQuotationByNumber :one
SELECT * FROM sales.quotation WHERE quotation_number = $1 LIMIT 1;

-- name: ListQuotations :many
SELECT * FROM sales.quotation ORDER BY created_at DESC;

-- name: CreateQuotation :one
INSERT INTO sales.quotation (
    id, quotation_number, deal_id, contact_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now(), now()
) RETURNING *;

-- name: UpdateQuotation :one
UPDATE sales.quotation SET
    deal_id = $2,
    contact_id = $3,
    status = $4,
    subtotal = $5,
    discount = $6,
    vat_rate = $7,
    vat_amount = $8,
    total = $9,
    currency = $10,
    valid_until = $11,
    terms = $12,
    notes = $13,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateQuotationStatus :one
UPDATE sales.quotation SET
    status = $2,
    accepted_at = CASE WHEN $2 = 'accepted' THEN now() ELSE accepted_at END,
    rejected_at = CASE WHEN $2 = 'rejected' THEN now() ELSE rejected_at END,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteQuotation :exec
DELETE FROM sales.quotation WHERE id = $1;

-- name: ListQuotationItems :many
SELECT * FROM sales.quotation_item WHERE quotation_id = $1 ORDER BY sort_order ASC;

-- name: InsertQuotationItem :one
INSERT INTO sales.quotation_item (
    id, quotation_id, description, quantity, unit_price, amount, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: DeleteQuotationItems :exec
DELETE FROM sales.quotation_item WHERE quotation_id = $1;

-- name: GetCampaignByID :one
SELECT * FROM sales.campaign WHERE id = $1 LIMIT 1;

-- name: ListCampaigns :many
SELECT * FROM sales.campaign ORDER BY created_at DESC;

-- name: CreateCampaign :one
INSERT INTO sales.campaign (
    id, name, subject, body, status, sent_at, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now(), now()
) RETURNING *;

-- name: UpdateCampaign :one
UPDATE sales.campaign SET
    name = $2,
    subject = $3,
    body = $4,
    status = $5,
    sent_at = $6,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteCampaign :exec
DELETE FROM sales.campaign WHERE id = $1;
