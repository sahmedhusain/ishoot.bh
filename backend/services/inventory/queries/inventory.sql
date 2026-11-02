-- name: ListWarehouses :many
SELECT * FROM inventory.warehouse ORDER BY sort_order ASC, created_at ASC;

-- name: GetWarehouseByID :one
SELECT * FROM inventory.warehouse WHERE id = $1 LIMIT 1;

-- name: GetDefaultWarehouse :one
SELECT * FROM inventory.warehouse WHERE is_default = true LIMIT 1;

-- name: CreateWarehouse :one
INSERT INTO inventory.warehouse (
    id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
) RETURNING *;

-- name: UpdateWarehouse :one
UPDATE inventory.warehouse SET
    name_en = $2,
    name_ar = $3,
    address = $4,
    is_active = $5,
    is_default = $6,
    branch_id = $7,
    sort_order = $8,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListLocationsByWarehouse :many
SELECT * FROM inventory.stock_location WHERE warehouse_id = $1 ORDER BY code ASC;

-- name: GetLocationByID :one
SELECT * FROM inventory.stock_location WHERE id = $1 LIMIT 1;

-- name: CreateLocation :one
INSERT INTO inventory.stock_location (
    id, warehouse_id, code, name, is_active, created_at
) VALUES (
    $1, $2, $3, $4, $5, now()
) RETURNING *;

-- name: ListCategories :many
SELECT * FROM inventory.product_category ORDER BY sort_order ASC, name_en ASC;

-- name: GetCategoryByID :one
SELECT * FROM inventory.product_category WHERE id = $1 LIMIT 1;

-- name: CreateCategory :one
INSERT INTO inventory.product_category (
    id, slug, name_en, name_ar, description_en, description_ar, parent_id, sort_order, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: ListProducts :many
SELECT * FROM inventory.product ORDER BY created_at DESC;

-- name: GetProductByID :one
SELECT * FROM inventory.product WHERE id = $1 LIMIT 1;

-- name: GetProductBySKU :one
SELECT * FROM inventory.product WHERE sku = $1 LIMIT 1;

-- name: CreateProduct :one
INSERT INTO inventory.product (
    id, sku, name_en, name_ar, description_en, description_ar, category_id,
    cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13, $14, $15,
    now(), now()
) RETURNING *;

-- name: UpdateProduct :one
UPDATE inventory.product SET
    name_en = $2,
    name_ar = $3,
    description_en = $4,
    description_ar = $5,
    category_id = $6,
    cost_price = $7,
    selling_price = $8,
    currency = $9,
    tax_rate = $10,
    barcode = $11,
    is_active = $12,
    track_inventory = $13,
    reorder_point = $14,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListVariantsByProduct :many
SELECT * FROM inventory.product_variant WHERE product_id = $1 ORDER BY sku ASC;

-- name: CreateProductVariant :one
INSERT INTO inventory.product_variant (
    id, product_id, sku, name_en, name_ar, barcode, cost_price, selling_price, is_active, attributes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: ListStockLevelsByProduct :many
SELECT * FROM inventory.stock_level WHERE product_id = $1;

-- name: GetStockLevel :one
SELECT * FROM inventory.stock_level
WHERE product_id = $1 AND COALESCE(variant_id, '') = COALESCE($2, '') AND location_id = $3
LIMIT 1;

-- name: UpsertStockLevel :one
INSERT INTO inventory.stock_level (
    id, product_id, variant_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, now()
)
ON CONFLICT (product_id, COALESCE(variant_id, ''), location_id) DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand,
    quantity_reserved = EXCLUDED.quantity_reserved,
    quantity_available = EXCLUDED.quantity_available,
    reorder_point = EXCLUDED.reorder_point,
    updated_at = now()
RETURNING *;

-- name: CreateStockMovement :one
INSERT INTO inventory.stock_movement (
    id, movement_type, product_id, variant_id, location_id, quantity, unit_cost, source_type, source_id, transfer_id, reason, note, created_by_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now()
) RETURNING *;

-- name: ListStockMovementsByProduct :many
SELECT * FROM inventory.stock_movement WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2;

-- name: ListStockCounts :many
SELECT * FROM inventory.stock_count ORDER BY created_at DESC;

-- name: GetStockCountByID :one
SELECT * FROM inventory.stock_count WHERE id = $1 LIMIT 1;

-- name: CreateStockCount :one
INSERT INTO inventory.stock_count (
    id, count_number, warehouse_id, status, notes, counted_by_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now()
) RETURNING *;

-- name: UpdateStockCountStatus :one
UPDATE inventory.stock_count SET
    status = $2,
    approved_by_id = $3,
    approved_at = $4
WHERE id = $1
RETURNING *;

-- name: ListStockCountLines :many
SELECT * FROM inventory.stock_count_line WHERE count_id = $1 ORDER BY id ASC;

-- name: CreateStockCountLine :one
INSERT INTO inventory.stock_count_line (
    id, count_id, product_id, variant_id, system_quantity, counted_quantity, variance, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;