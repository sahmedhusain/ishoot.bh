package sqlcdb

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5/pgtype"
	"time"
)

const createCategory = `-- name: CreateCategory :one
INSERT INTO inventory.product_category (
    id, slug, name_en, name_ar, description_en, description_ar, parent_id, sort_order, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING id, slug, name_en, name_ar, description_en, description_ar, parent_id, sort_order, is_active
`

type CreateCategoryParams struct {
	ID            string  `json:"id"`
	Slug          string  `json:"slug"`
	NameEn        string  `json:"nameEn"`
	NameAr        string  `json:"nameAr"`
	DescriptionEn string  `json:"descriptionEn"`
	DescriptionAr string  `json:"descriptionAr"`
	ParentID      *string `json:"parentId"`
	SortOrder     int32   `json:"sortOrder"`
	IsActive      bool    `json:"isActive"`
}

func (q *Queries) CreateCategory(ctx context.Context, arg CreateCategoryParams) (InventoryProductCategory, error) {
	row := q.db.QueryRow(ctx, createCategory,
		arg.ID,
		arg.Slug,
		arg.NameEn,
		arg.NameAr,
		arg.DescriptionEn,
		arg.DescriptionAr,
		arg.ParentID,
		arg.SortOrder,
		arg.IsActive,
	)
	var i InventoryProductCategory
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.NameEn,
		&i.NameAr,
		&i.DescriptionEn,
		&i.DescriptionAr,
		&i.ParentID,
		&i.SortOrder,
		&i.IsActive,
	)
	return i, err
}

const createLocation = `-- name: CreateLocation :one
INSERT INTO inventory.stock_location (
    id, warehouse_id, code, name, is_active, created_at
) VALUES (
    $1, $2, $3, $4, $5, now()
) RETURNING id, warehouse_id, code, name, is_active, created_at
`

type CreateLocationParams struct {
	ID          string `json:"id"`
	WarehouseID string `json:"warehouseId"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	IsActive    bool   `json:"isActive"`
}

func (q *Queries) CreateLocation(ctx context.Context, arg CreateLocationParams) (InventoryStockLocation, error) {
	row := q.db.QueryRow(ctx, createLocation,
		arg.ID,
		arg.WarehouseID,
		arg.Code,
		arg.Name,
		arg.IsActive,
	)
	var i InventoryStockLocation
	err := row.Scan(
		&i.ID,
		&i.WarehouseID,
		&i.Code,
		&i.Name,
		&i.IsActive,
		&i.CreatedAt,
	)
	return i, err
}

const createProduct = `-- name: CreateProduct :one
INSERT INTO inventory.product (
    id, sku, name_en, name_ar, description_en, description_ar, category_id,
    cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13, $14, $15,
    now(), now()
) RETURNING id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point, created_at, updated_at
`

type CreateProductParams struct {
	ID             string         `json:"id"`
	Sku            string         `json:"sku"`
	NameEn         string         `json:"nameEn"`
	NameAr         string         `json:"nameAr"`
	DescriptionEn  string         `json:"descriptionEn"`
	DescriptionAr  string         `json:"descriptionAr"`
	CategoryID     *string        `json:"categoryId"`
	CostPrice      pgtype.Numeric `json:"costPrice"`
	SellingPrice   pgtype.Numeric `json:"sellingPrice"`
	Currency       string         `json:"currency"`
	TaxRate        pgtype.Numeric `json:"taxRate"`
	Barcode        *string        `json:"barcode"`
	IsActive       bool           `json:"isActive"`
	TrackInventory bool           `json:"trackInventory"`
	ReorderPoint   pgtype.Numeric `json:"reorderPoint"`
}

func (q *Queries) CreateProduct(ctx context.Context, arg CreateProductParams) (InventoryProduct, error) {
	row := q.db.QueryRow(ctx, createProduct,
		arg.ID,
		arg.Sku,
		arg.NameEn,
		arg.NameAr,
		arg.DescriptionEn,
		arg.DescriptionAr,
		arg.CategoryID,
		arg.CostPrice,
		arg.SellingPrice,
		arg.Currency,
		arg.TaxRate,
		arg.Barcode,
		arg.IsActive,
		arg.TrackInventory,
		arg.ReorderPoint,
	)
	var i InventoryProduct
	err := row.Scan(
		&i.ID,
		&i.Sku,
		&i.NameEn,
		&i.NameAr,
		&i.DescriptionEn,
		&i.DescriptionAr,
		&i.CategoryID,
		&i.CostPrice,
		&i.SellingPrice,
		&i.Currency,
		&i.TaxRate,
		&i.Barcode,
		&i.IsActive,
		&i.TrackInventory,
		&i.ReorderPoint,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const createProductVariant = `-- name: CreateProductVariant :one
INSERT INTO inventory.product_variant (
    id, product_id, sku, name_en, name_ar, barcode, cost_price, selling_price, is_active, attributes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING id, product_id, sku, name_en, name_ar, barcode, cost_price, selling_price, is_active, attributes
`

type CreateProductVariantParams struct {
	ID           string          `json:"id"`
	ProductID    string          `json:"productId"`
	Sku          string          `json:"sku"`
	NameEn       string          `json:"nameEn"`
	NameAr       string          `json:"nameAr"`
	Barcode      *string         `json:"barcode"`
	CostPrice    pgtype.Numeric  `json:"costPrice"`
	SellingPrice pgtype.Numeric  `json:"sellingPrice"`
	IsActive     bool            `json:"isActive"`
	Attributes   json.RawMessage `json:"attributes"`
}

func (q *Queries) CreateProductVariant(ctx context.Context, arg CreateProductVariantParams) (InventoryProductVariant, error) {
	row := q.db.QueryRow(ctx, createProductVariant,
		arg.ID,
		arg.ProductID,
		arg.Sku,
		arg.NameEn,
		arg.NameAr,
		arg.Barcode,
		arg.CostPrice,
		arg.SellingPrice,
		arg.IsActive,
		arg.Attributes,
	)
	var i InventoryProductVariant
	err := row.Scan(
		&i.ID,
		&i.ProductID,
		&i.Sku,
		&i.NameEn,
		&i.NameAr,
		&i.Barcode,
		&i.CostPrice,
		&i.SellingPrice,
		&i.IsActive,
		&i.Attributes,
	)
	return i, err
}

const createStockCount = `-- name: CreateStockCount :one
INSERT INTO inventory.stock_count (
    id, count_number, warehouse_id, status, notes, counted_by_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now()
) RETURNING id, count_number, warehouse_id, status, notes, counted_by_id, approved_by_id, counted_at, approved_at, created_at
`

type CreateStockCountParams struct {
	ID          string  `json:"id"`
	CountNumber string  `json:"countNumber"`
	WarehouseID string  `json:"warehouseId"`
	Status      string  `json:"status"`
	Notes       *string `json:"notes"`
	CountedByID *string `json:"countedById"`
}

func (q *Queries) CreateStockCount(ctx context.Context, arg CreateStockCountParams) (InventoryStockCount, error) {
	row := q.db.QueryRow(ctx, createStockCount,
		arg.ID,
		arg.CountNumber,
		arg.WarehouseID,
		arg.Status,
		arg.Notes,
		arg.CountedByID,
	)
	var i InventoryStockCount
	err := row.Scan(
		&i.ID,
		&i.CountNumber,
		&i.WarehouseID,
		&i.Status,
		&i.Notes,
		&i.CountedByID,
		&i.ApprovedByID,
		&i.CountedAt,
		&i.ApprovedAt,
		&i.CreatedAt,
	)
	return i, err
}

const createStockCountLine = `-- name: CreateStockCountLine :one
INSERT INTO inventory.stock_count_line (
    id, count_id, product_id, variant_id, system_quantity, counted_quantity, variance, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING id, count_id, product_id, variant_id, system_quantity, counted_quantity, variance, notes
`

type CreateStockCountLineParams struct {
	ID              string         `json:"id"`
	CountID         string         `json:"countId"`
	ProductID       string         `json:"productId"`
	VariantID       *string        `json:"variantId"`
	SystemQuantity  pgtype.Numeric `json:"systemQuantity"`
	CountedQuantity pgtype.Numeric `json:"countedQuantity"`
	Variance        pgtype.Numeric `json:"variance"`
	Notes           *string        `json:"notes"`
}

func (q *Queries) CreateStockCountLine(ctx context.Context, arg CreateStockCountLineParams) (InventoryStockCountLine, error) {
	row := q.db.QueryRow(ctx, createStockCountLine,
		arg.ID,
		arg.CountID,
		arg.ProductID,
		arg.VariantID,
		arg.SystemQuantity,
		arg.CountedQuantity,
		arg.Variance,
		arg.Notes,
	)
	var i InventoryStockCountLine
	err := row.Scan(
		&i.ID,
		&i.CountID,
		&i.ProductID,
		&i.VariantID,
		&i.SystemQuantity,
		&i.CountedQuantity,
		&i.Variance,
		&i.Notes,
	)
	return i, err
}

const createStockMovement = `-- name: CreateStockMovement :one
INSERT INTO inventory.stock_movement (
    id, movement_type, product_id, variant_id, location_id, quantity, unit_cost, source_type, source_id, transfer_id, reason, note, created_by_id, created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now()
) RETURNING id, movement_type, product_id, variant_id, location_id, quantity, unit_cost, source_type, source_id, transfer_id, reason, note, created_by_id, created_at
`

type CreateStockMovementParams struct {
	ID           string         `json:"id"`
	MovementType string         `json:"movementType"`
	ProductID    string         `json:"productId"`
	VariantID    *string        `json:"variantId"`
	LocationID   string         `json:"locationId"`
	Quantity     pgtype.Numeric `json:"quantity"`
	UnitCost     pgtype.Numeric `json:"unitCost"`
	SourceType   string         `json:"sourceType"`
	SourceID     *string        `json:"sourceId"`
	TransferID   *string        `json:"transferId"`
	Reason       *string        `json:"reason"`
	Note         *string        `json:"note"`
	CreatedByID  *string        `json:"createdById"`
}

func (q *Queries) CreateStockMovement(ctx context.Context, arg CreateStockMovementParams) (InventoryStockMovement, error) {
	row := q.db.QueryRow(ctx, createStockMovement,
		arg.ID,
		arg.MovementType,
		arg.ProductID,
		arg.VariantID,
		arg.LocationID,
		arg.Quantity,
		arg.UnitCost,
		arg.SourceType,
		arg.SourceID,
		arg.TransferID,
		arg.Reason,
		arg.Note,
		arg.CreatedByID,
	)
	var i InventoryStockMovement
	err := row.Scan(
		&i.ID,
		&i.MovementType,
		&i.ProductID,
		&i.VariantID,
		&i.LocationID,
		&i.Quantity,
		&i.UnitCost,
		&i.SourceType,
		&i.SourceID,
		&i.TransferID,
		&i.Reason,
		&i.Note,
		&i.CreatedByID,
		&i.CreatedAt,
	)
	return i, err
}

const createWarehouse = `-- name: CreateWarehouse :one
INSERT INTO inventory.warehouse (
    id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
) RETURNING id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at
`

type CreateWarehouseParams struct {
	ID        string  `json:"id"`
	Code      string  `json:"code"`
	NameEn    string  `json:"nameEn"`
	NameAr    string  `json:"nameAr"`
	Address   *string `json:"address"`
	IsActive  bool    `json:"isActive"`
	IsDefault bool    `json:"isDefault"`
	BranchID  *string `json:"branchId"`
	SortOrder int32   `json:"sortOrder"`
}

func (q *Queries) CreateWarehouse(ctx context.Context, arg CreateWarehouseParams) (InventoryWarehouse, error) {
	row := q.db.QueryRow(ctx, createWarehouse,
		arg.ID,
		arg.Code,
		arg.NameEn,
		arg.NameAr,
		arg.Address,
		arg.IsActive,
		arg.IsDefault,
		arg.BranchID,
		arg.SortOrder,
	)
	var i InventoryWarehouse
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.NameEn,
		&i.NameAr,
		&i.Address,
		&i.IsActive,
		&i.IsDefault,
		&i.BranchID,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getCategoryByID = `-- name: GetCategoryByID :one
SELECT id, slug, name_en, name_ar, description_en, description_ar, parent_id, sort_order, is_active FROM inventory.product_category WHERE id = $1 LIMIT 1
`

func (q *Queries) GetCategoryByID(ctx context.Context, id string) (InventoryProductCategory, error) {
	row := q.db.QueryRow(ctx, getCategoryByID, id)
	var i InventoryProductCategory
	err := row.Scan(
		&i.ID,
		&i.Slug,
		&i.NameEn,
		&i.NameAr,
		&i.DescriptionEn,
		&i.DescriptionAr,
		&i.ParentID,
		&i.SortOrder,
		&i.IsActive,
	)
	return i, err
}

const getDefaultWarehouse = `-- name: GetDefaultWarehouse :one
SELECT id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at FROM inventory.warehouse WHERE is_default = true LIMIT 1
`

func (q *Queries) GetDefaultWarehouse(ctx context.Context) (InventoryWarehouse, error) {
	row := q.db.QueryRow(ctx, getDefaultWarehouse)
	var i InventoryWarehouse
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.NameEn,
		&i.NameAr,
		&i.Address,
		&i.IsActive,
		&i.IsDefault,
		&i.BranchID,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getLocationByID = `-- name: GetLocationByID :one
SELECT id, warehouse_id, code, name, is_active, created_at FROM inventory.stock_location WHERE id = $1 LIMIT 1
`

func (q *Queries) GetLocationByID(ctx context.Context, id string) (InventoryStockLocation, error) {
	row := q.db.QueryRow(ctx, getLocationByID, id)
	var i InventoryStockLocation
	err := row.Scan(
		&i.ID,
		&i.WarehouseID,
		&i.Code,
		&i.Name,
		&i.IsActive,
		&i.CreatedAt,
	)
	return i, err
}

const getProductByID = `-- name: GetProductByID :one
SELECT id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point, created_at, updated_at FROM inventory.product WHERE id = $1 LIMIT 1
`

func (q *Queries) GetProductByID(ctx context.Context, id string) (InventoryProduct, error) {
	row := q.db.QueryRow(ctx, getProductByID, id)
	var i InventoryProduct
	err := row.Scan(
		&i.ID,
		&i.Sku,
		&i.NameEn,
		&i.NameAr,
		&i.DescriptionEn,
		&i.DescriptionAr,
		&i.CategoryID,
		&i.CostPrice,
		&i.SellingPrice,
		&i.Currency,
		&i.TaxRate,
		&i.Barcode,
		&i.IsActive,
		&i.TrackInventory,
		&i.ReorderPoint,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getProductBySKU = `-- name: GetProductBySKU :one
SELECT id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point, created_at, updated_at FROM inventory.product WHERE sku = $1 LIMIT 1
`

func (q *Queries) GetProductBySKU(ctx context.Context, sku string) (InventoryProduct, error) {
	row := q.db.QueryRow(ctx, getProductBySKU, sku)
	var i InventoryProduct
	err := row.Scan(
		&i.ID,
		&i.Sku,
		&i.NameEn,
		&i.NameAr,
		&i.DescriptionEn,
		&i.DescriptionAr,
		&i.CategoryID,
		&i.CostPrice,
		&i.SellingPrice,
		&i.Currency,
		&i.TaxRate,
		&i.Barcode,
		&i.IsActive,
		&i.TrackInventory,
		&i.ReorderPoint,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getStockCountByID = `-- name: GetStockCountByID :one
SELECT id, count_number, warehouse_id, status, notes, counted_by_id, approved_by_id, counted_at, approved_at, created_at FROM inventory.stock_count WHERE id = $1 LIMIT 1
`

func (q *Queries) GetStockCountByID(ctx context.Context, id string) (InventoryStockCount, error) {
	row := q.db.QueryRow(ctx, getStockCountByID, id)
	var i InventoryStockCount
	err := row.Scan(
		&i.ID,
		&i.CountNumber,
		&i.WarehouseID,
		&i.Status,
		&i.Notes,
		&i.CountedByID,
		&i.ApprovedByID,
		&i.CountedAt,
		&i.ApprovedAt,
		&i.CreatedAt,
	)
	return i, err
}

const getStockLevel = `-- name: GetStockLevel :one
SELECT id, product_id, variant_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at FROM inventory.stock_level
WHERE product_id = $1 AND COALESCE(variant_id, '') = COALESCE($2, '') AND location_id = $3
LIMIT 1
`

type GetStockLevelParams struct {
	ProductID  string  `json:"productId"`
	VariantID  *string `json:"variantId"`
	LocationID string  `json:"locationId"`
}

func (q *Queries) GetStockLevel(ctx context.Context, arg GetStockLevelParams) (InventoryStockLevel, error) {
	row := q.db.QueryRow(ctx, getStockLevel, arg.ProductID, arg.VariantID, arg.LocationID)
	var i InventoryStockLevel
	err := row.Scan(
		&i.ID,
		&i.ProductID,
		&i.VariantID,
		&i.LocationID,
		&i.QuantityOnHand,
		&i.QuantityReserved,
		&i.QuantityAvailable,
		&i.ReorderPoint,
		&i.UpdatedAt,
	)
	return i, err
}

const getWarehouseByID = `-- name: GetWarehouseByID :one
SELECT id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at FROM inventory.warehouse WHERE id = $1 LIMIT 1
`

func (q *Queries) GetWarehouseByID(ctx context.Context, id string) (InventoryWarehouse, error) {
	row := q.db.QueryRow(ctx, getWarehouseByID, id)
	var i InventoryWarehouse
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.NameEn,
		&i.NameAr,
		&i.Address,
		&i.IsActive,
		&i.IsDefault,
		&i.BranchID,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const listCategories = `-- name: ListCategories :many
SELECT id, slug, name_en, name_ar, description_en, description_ar, parent_id, sort_order, is_active FROM inventory.product_category ORDER BY sort_order ASC, name_en ASC
`

func (q *Queries) ListCategories(ctx context.Context) ([]InventoryProductCategory, error) {
	rows, err := q.db.Query(ctx, listCategories)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryProductCategory
	for rows.Next() {
		var i InventoryProductCategory
		if err := rows.Scan(
			&i.ID,
			&i.Slug,
			&i.NameEn,
			&i.NameAr,
			&i.DescriptionEn,
			&i.DescriptionAr,
			&i.ParentID,
			&i.SortOrder,
			&i.IsActive,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listLocationsByWarehouse = `-- name: ListLocationsByWarehouse :many
SELECT id, warehouse_id, code, name, is_active, created_at FROM inventory.stock_location WHERE warehouse_id = $1 ORDER BY code ASC
`

func (q *Queries) ListLocationsByWarehouse(ctx context.Context, warehouseID string) ([]InventoryStockLocation, error) {
	rows, err := q.db.Query(ctx, listLocationsByWarehouse, warehouseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryStockLocation
	for rows.Next() {
		var i InventoryStockLocation
		if err := rows.Scan(
			&i.ID,
			&i.WarehouseID,
			&i.Code,
			&i.Name,
			&i.IsActive,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listProducts = `-- name: ListProducts :many
SELECT id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point, created_at, updated_at FROM inventory.product ORDER BY created_at DESC
`

func (q *Queries) ListProducts(ctx context.Context) ([]InventoryProduct, error) {
	rows, err := q.db.Query(ctx, listProducts)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryProduct
	for rows.Next() {
		var i InventoryProduct
		if err := rows.Scan(
			&i.ID,
			&i.Sku,
			&i.NameEn,
			&i.NameAr,
			&i.DescriptionEn,
			&i.DescriptionAr,
			&i.CategoryID,
			&i.CostPrice,
			&i.SellingPrice,
			&i.Currency,
			&i.TaxRate,
			&i.Barcode,
			&i.IsActive,
			&i.TrackInventory,
			&i.ReorderPoint,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listStockCountLines = `-- name: ListStockCountLines :many
SELECT id, count_id, product_id, variant_id, system_quantity, counted_quantity, variance, notes FROM inventory.stock_count_line WHERE count_id = $1 ORDER BY id ASC
`

func (q *Queries) ListStockCountLines(ctx context.Context, countID string) ([]InventoryStockCountLine, error) {
	rows, err := q.db.Query(ctx, listStockCountLines, countID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryStockCountLine
	for rows.Next() {
		var i InventoryStockCountLine
		if err := rows.Scan(
			&i.ID,
			&i.CountID,
			&i.ProductID,
			&i.VariantID,
			&i.SystemQuantity,
			&i.CountedQuantity,
			&i.Variance,
			&i.Notes,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listStockCounts = `-- name: ListStockCounts :many
SELECT id, count_number, warehouse_id, status, notes, counted_by_id, approved_by_id, counted_at, approved_at, created_at FROM inventory.stock_count ORDER BY created_at DESC
`

func (q *Queries) ListStockCounts(ctx context.Context) ([]InventoryStockCount, error) {
	rows, err := q.db.Query(ctx, listStockCounts)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryStockCount
	for rows.Next() {
		var i InventoryStockCount
		if err := rows.Scan(
			&i.ID,
			&i.CountNumber,
			&i.WarehouseID,
			&i.Status,
			&i.Notes,
			&i.CountedByID,
			&i.ApprovedByID,
			&i.CountedAt,
			&i.ApprovedAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listStockLevelsByProduct = `-- name: ListStockLevelsByProduct :many
SELECT id, product_id, variant_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at FROM inventory.stock_level WHERE product_id = $1
`

func (q *Queries) ListStockLevelsByProduct(ctx context.Context, productID string) ([]InventoryStockLevel, error) {
	rows, err := q.db.Query(ctx, listStockLevelsByProduct, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryStockLevel
	for rows.Next() {
		var i InventoryStockLevel
		if err := rows.Scan(
			&i.ID,
			&i.ProductID,
			&i.VariantID,
			&i.LocationID,
			&i.QuantityOnHand,
			&i.QuantityReserved,
			&i.QuantityAvailable,
			&i.ReorderPoint,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listStockMovementsByProduct = `-- name: ListStockMovementsByProduct :many
SELECT id, movement_type, product_id, variant_id, location_id, quantity, unit_cost, source_type, source_id, transfer_id, reason, note, created_by_id, created_at FROM inventory.stock_movement WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2
`

type ListStockMovementsByProductParams struct {
	ProductID string `json:"productId"`
	Limit     int32  `json:"limit"`
}

func (q *Queries) ListStockMovementsByProduct(ctx context.Context, arg ListStockMovementsByProductParams) ([]InventoryStockMovement, error) {
	rows, err := q.db.Query(ctx, listStockMovementsByProduct, arg.ProductID, arg.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryStockMovement
	for rows.Next() {
		var i InventoryStockMovement
		if err := rows.Scan(
			&i.ID,
			&i.MovementType,
			&i.ProductID,
			&i.VariantID,
			&i.LocationID,
			&i.Quantity,
			&i.UnitCost,
			&i.SourceType,
			&i.SourceID,
			&i.TransferID,
			&i.Reason,
			&i.Note,
			&i.CreatedByID,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listVariantsByProduct = `-- name: ListVariantsByProduct :many
SELECT id, product_id, sku, name_en, name_ar, barcode, cost_price, selling_price, is_active, attributes FROM inventory.product_variant WHERE product_id = $1 ORDER BY sku ASC
`

func (q *Queries) ListVariantsByProduct(ctx context.Context, productID string) ([]InventoryProductVariant, error) {
	rows, err := q.db.Query(ctx, listVariantsByProduct, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryProductVariant
	for rows.Next() {
		var i InventoryProductVariant
		if err := rows.Scan(
			&i.ID,
			&i.ProductID,
			&i.Sku,
			&i.NameEn,
			&i.NameAr,
			&i.Barcode,
			&i.CostPrice,
			&i.SellingPrice,
			&i.IsActive,
			&i.Attributes,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listWarehouses = `-- name: ListWarehouses :many
SELECT id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at FROM inventory.warehouse ORDER BY sort_order ASC, created_at ASC
`

func (q *Queries) ListWarehouses(ctx context.Context) ([]InventoryWarehouse, error) {
	rows, err := q.db.Query(ctx, listWarehouses)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []InventoryWarehouse
	for rows.Next() {
		var i InventoryWarehouse
		if err := rows.Scan(
			&i.ID,
			&i.Code,
			&i.NameEn,
			&i.NameAr,
			&i.Address,
			&i.IsActive,
			&i.IsDefault,
			&i.BranchID,
			&i.SortOrder,
			&i.CreatedAt,
			&i.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateProduct = `-- name: UpdateProduct :one
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
RETURNING id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, barcode, is_active, track_inventory, reorder_point, created_at, updated_at
`

type UpdateProductParams struct {
	ID             string         `json:"id"`
	NameEn         string         `json:"nameEn"`
	NameAr         string         `json:"nameAr"`
	DescriptionEn  string         `json:"descriptionEn"`
	DescriptionAr  string         `json:"descriptionAr"`
	CategoryID     *string        `json:"categoryId"`
	CostPrice      pgtype.Numeric `json:"costPrice"`
	SellingPrice   pgtype.Numeric `json:"sellingPrice"`
	Currency       string         `json:"currency"`
	TaxRate        pgtype.Numeric `json:"taxRate"`
	Barcode        *string        `json:"barcode"`
	IsActive       bool           `json:"isActive"`
	TrackInventory bool           `json:"trackInventory"`
	ReorderPoint   pgtype.Numeric `json:"reorderPoint"`
}

func (q *Queries) UpdateProduct(ctx context.Context, arg UpdateProductParams) (InventoryProduct, error) {
	row := q.db.QueryRow(ctx, updateProduct,
		arg.ID,
		arg.NameEn,
		arg.NameAr,
		arg.DescriptionEn,
		arg.DescriptionAr,
		arg.CategoryID,
		arg.CostPrice,
		arg.SellingPrice,
		arg.Currency,
		arg.TaxRate,
		arg.Barcode,
		arg.IsActive,
		arg.TrackInventory,
		arg.ReorderPoint,
	)
	var i InventoryProduct
	err := row.Scan(
		&i.ID,
		&i.Sku,
		&i.NameEn,
		&i.NameAr,
		&i.DescriptionEn,
		&i.DescriptionAr,
		&i.CategoryID,
		&i.CostPrice,
		&i.SellingPrice,
		&i.Currency,
		&i.TaxRate,
		&i.Barcode,
		&i.IsActive,
		&i.TrackInventory,
		&i.ReorderPoint,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const updateStockCountStatus = `-- name: UpdateStockCountStatus :one
UPDATE inventory.stock_count SET
    status = $2,
    approved_by_id = $3,
    approved_at = $4
WHERE id = $1
RETURNING id, count_number, warehouse_id, status, notes, counted_by_id, approved_by_id, counted_at, approved_at, created_at
`

type UpdateStockCountStatusParams struct {
	ID           string     `json:"id"`
	Status       string     `json:"status"`
	ApprovedByID *string    `json:"approvedById"`
	ApprovedAt   *time.Time `json:"approvedAt"`
}

func (q *Queries) UpdateStockCountStatus(ctx context.Context, arg UpdateStockCountStatusParams) (InventoryStockCount, error) {
	row := q.db.QueryRow(ctx, updateStockCountStatus,
		arg.ID,
		arg.Status,
		arg.ApprovedByID,
		arg.ApprovedAt,
	)
	var i InventoryStockCount
	err := row.Scan(
		&i.ID,
		&i.CountNumber,
		&i.WarehouseID,
		&i.Status,
		&i.Notes,
		&i.CountedByID,
		&i.ApprovedByID,
		&i.CountedAt,
		&i.ApprovedAt,
		&i.CreatedAt,
	)
	return i, err
}

const updateWarehouse = `-- name: UpdateWarehouse :one
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
RETURNING id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at
`

type UpdateWarehouseParams struct {
	ID        string  `json:"id"`
	NameEn    string  `json:"nameEn"`
	NameAr    string  `json:"nameAr"`
	Address   *string `json:"address"`
	IsActive  bool    `json:"isActive"`
	IsDefault bool    `json:"isDefault"`
	BranchID  *string `json:"branchId"`
	SortOrder int32   `json:"sortOrder"`
}

func (q *Queries) UpdateWarehouse(ctx context.Context, arg UpdateWarehouseParams) (InventoryWarehouse, error) {
	row := q.db.QueryRow(ctx, updateWarehouse,
		arg.ID,
		arg.NameEn,
		arg.NameAr,
		arg.Address,
		arg.IsActive,
		arg.IsDefault,
		arg.BranchID,
		arg.SortOrder,
	)
	var i InventoryWarehouse
	err := row.Scan(
		&i.ID,
		&i.Code,
		&i.NameEn,
		&i.NameAr,
		&i.Address,
		&i.IsActive,
		&i.IsDefault,
		&i.BranchID,
		&i.SortOrder,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const upsertStockLevel = `-- name: UpsertStockLevel :one
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
RETURNING id, product_id, variant_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at
`

type UpsertStockLevelParams struct {
	ID                string         `json:"id"`
	ProductID         string         `json:"productId"`
	VariantID         *string        `json:"variantId"`
	LocationID        string         `json:"locationId"`
	QuantityOnHand    pgtype.Numeric `json:"quantityOnHand"`
	QuantityReserved  pgtype.Numeric `json:"quantityReserved"`
	QuantityAvailable pgtype.Numeric `json:"quantityAvailable"`
	ReorderPoint      pgtype.Numeric `json:"reorderPoint"`
}

func (q *Queries) UpsertStockLevel(ctx context.Context, arg UpsertStockLevelParams) (InventoryStockLevel, error) {
	row := q.db.QueryRow(ctx, upsertStockLevel,
		arg.ID,
		arg.ProductID,
		arg.VariantID,
		arg.LocationID,
		arg.QuantityOnHand,
		arg.QuantityReserved,
		arg.QuantityAvailable,
		arg.ReorderPoint,
	)
	var i InventoryStockLevel
	err := row.Scan(
		&i.ID,
		&i.ProductID,
		&i.VariantID,
		&i.LocationID,
		&i.QuantityOnHand,
		&i.QuantityReserved,
		&i.QuantityAvailable,
		&i.ReorderPoint,
		&i.UpdatedAt,
	)
	return i, err
}
