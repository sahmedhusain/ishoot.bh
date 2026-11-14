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
    id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, pipeline_stage_id, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now()
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
    pipeline_stage_id = $12,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateDealStage :one
UPDATE sales.deal SET
    stage = $2,
    status = $3,
    pipeline_stage_id = COALESCE($4, pipeline_stage_id),
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

-- name: ListQuotationsByContact :many
SELECT * FROM sales.quotation WHERE contact_id = $1 OR client_id = $1 ORDER BY created_at DESC;

-- name: ListQuotationsByDeal :many
SELECT * FROM sales.quotation WHERE deal_id = $1 ORDER BY created_at DESC;

-- name: SetQuotationInvoiceID :one
UPDATE sales.quotation SET
    invoice_id = $2,
    status = CASE WHEN status IN ('draft', 'issued', 'sent', 'pending') THEN 'converted' ELSE status END,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ClearQuotationInvoiceID :exec
UPDATE sales.quotation SET
    invoice_id = NULL,
    updated_at = now()
WHERE invoice_id = $1;

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
    id, quotation_id, item_kind, service_id, product_id, variant_id, sku, unit,
    description, description_en, description_ar, quantity, unit_price, tax_rate, amount, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14, $15, $16
) RETURNING *;

-- name: DeleteQuotationItems :exec
DELETE FROM sales.quotation_item WHERE quotation_id = $1;

-- name: ListDealPipelineStages :many
SELECT * FROM sales.deal_pipeline_stage WHERE is_active IS NOT FALSE ORDER BY sort_order ASC NULLS LAST, name_en ASC;

-- name: UpsertSalesCatalogItemRef :exec
INSERT INTO sales.catalog_item_ref (
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

-- name: DeleteSalesCatalogItemRef :exec
DELETE FROM sales.catalog_item_ref WHERE kind = $1 AND id = $2;

-- name: ListSalesCatalogItems :many
SELECT * FROM sales.catalog_item_ref WHERE is_active = true ORDER BY kind ASC, name_en ASC;

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
