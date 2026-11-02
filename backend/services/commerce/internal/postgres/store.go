// Package postgres stores commerce entities in the commerce schema.
package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/db"
	"platform.local/backend/services/commerce/internal/postgres/sqlcdb"
)

const Schema = "commerce"

type Customer = sqlcdb.CommerceCustomer
type CustomerAddress = sqlcdb.CommerceCustomerAddress
type StoreSettings = sqlcdb.CommerceStoreSetting
type Coupon = sqlcdb.CommerceCoupon
type SalesOrder = sqlcdb.CommerceSalesOrder
type SalesOrderLine = sqlcdb.CommerceSalesOrderLine
type SalesOrderEvent = sqlcdb.CommerceSalesOrderEvent
type RetailRegister = sqlcdb.CommerceRetailRegister
type RetailShift = sqlcdb.CommerceRetailShift

type Store struct {
	pool *pgxpool.Pool
	q    *sqlcdb.Queries
}

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool, q: sqlcdb.New(pool)} }

func (s *Store) Tx(ctx context.Context, fn func(*Store, pgx.Tx) error) error {
	return db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return fn(&Store{q: s.q.WithTx(tx)}, tx)
	})
}

// Customers & Addresses
func (s *Store) ListCustomers(ctx context.Context) ([]Customer, error) {
	return s.q.ListCustomers(ctx)
}
func (s *Store) GetCustomerByID(ctx context.Context, id string) (Customer, error) {
	return s.q.GetCustomerByID(ctx, id)
}
func (s *Store) GetCustomerByEmail(ctx context.Context, email *string) (Customer, error) {
	return s.q.GetCustomerByEmail(ctx, email)
}
func (s *Store) CreateCustomer(ctx context.Context, p sqlcdb.CreateCustomerParams) (Customer, error) {
	return s.q.CreateCustomer(ctx, p)
}
func (s *Store) UpdateCustomer(ctx context.Context, p sqlcdb.UpdateCustomerParams) (Customer, error) {
	return s.q.UpdateCustomer(ctx, p)
}
func (s *Store) ListCustomerAddresses(ctx context.Context, customerID string) ([]CustomerAddress, error) {
	return s.q.ListCustomerAddresses(ctx, customerID)
}
func (s *Store) CreateCustomerAddress(ctx context.Context, p sqlcdb.CreateCustomerAddressParams) (CustomerAddress, error) {
	return s.q.CreateCustomerAddress(ctx, p)
}

// Store Settings
func (s *Store) GetStoreSettings(ctx context.Context) (StoreSettings, error) {
	return s.q.GetStoreSettings(ctx)
}
func (s *Store) UpsertStoreSettings(ctx context.Context, p sqlcdb.UpsertStoreSettingsParams) (StoreSettings, error) {
	return s.q.UpsertStoreSettings(ctx, p)
}

// Coupons
func (s *Store) ListCoupons(ctx context.Context) ([]Coupon, error) {
	return s.q.ListCoupons(ctx)
}
func (s *Store) GetCouponByCode(ctx context.Context, code string) (Coupon, error) {
	return s.q.GetCouponByCode(ctx, code)
}
func (s *Store) CreateCoupon(ctx context.Context, p sqlcdb.CreateCouponParams) (Coupon, error) {
	return s.q.CreateCoupon(ctx, p)
}

// Orders, Lines & Events
func (s *Store) ListOrders(ctx context.Context) ([]SalesOrder, error) {
	return s.q.ListOrders(ctx)
}
func (s *Store) GetOrderByID(ctx context.Context, id string) (SalesOrder, error) {
	return s.q.GetOrderByID(ctx, id)
}
func (s *Store) GetOrderByNumber(ctx context.Context, number string) (SalesOrder, error) {
	return s.q.GetOrderByNumber(ctx, number)
}
func (s *Store) ListOrdersByCustomer(ctx context.Context, customerID *string) ([]SalesOrder, error) {
	return s.q.ListOrdersByCustomer(ctx, customerID)
}
func (s *Store) CreateOrder(ctx context.Context, p sqlcdb.CreateOrderParams) (SalesOrder, error) {
	return s.q.CreateOrder(ctx, p)
}
func (s *Store) UpdateOrderStatus(ctx context.Context, p sqlcdb.UpdateOrderStatusParams) (SalesOrder, error) {
	return s.q.UpdateOrderStatus(ctx, p)
}
func (s *Store) UpdateOrderPaymentStatus(ctx context.Context, p sqlcdb.UpdateOrderPaymentStatusParams) (SalesOrder, error) {
	return s.q.UpdateOrderPaymentStatus(ctx, p)
}
func (s *Store) ListOrderLines(ctx context.Context, orderID string) ([]SalesOrderLine, error) {
	return s.q.ListOrderLines(ctx, orderID)
}
func (s *Store) CreateOrderLine(ctx context.Context, p sqlcdb.CreateOrderLineParams) (SalesOrderLine, error) {
	return s.q.CreateOrderLine(ctx, p)
}
func (s *Store) ListOrderEvents(ctx context.Context, orderID string) ([]SalesOrderEvent, error) {
	return s.q.ListOrderEvents(ctx, orderID)
}
func (s *Store) CreateOrderEvent(ctx context.Context, p sqlcdb.CreateOrderEventParams) (SalesOrderEvent, error) {
	return s.q.CreateOrderEvent(ctx, p)
}

// Retail POS
func (s *Store) ListRetailRegisters(ctx context.Context) ([]RetailRegister, error) {
	return s.q.ListRetailRegisters(ctx)
}
func (s *Store) CreateRetailRegister(ctx context.Context, p sqlcdb.CreateRetailRegisterParams) (RetailRegister, error) {
	return s.q.CreateRetailRegister(ctx, p)
}
func (s *Store) ListRetailShifts(ctx context.Context) ([]RetailShift, error) {
	return s.q.ListRetailShifts(ctx)
}
func (s *Store) CreateRetailShift(ctx context.Context, p sqlcdb.CreateRetailShiftParams) (RetailShift, error) {
	return s.q.CreateRetailShift(ctx, p)
}
func (s *Store) CloseRetailShift(ctx context.Context, p sqlcdb.CloseRetailShiftParams) (RetailShift, error) {
	return s.q.CloseRetailShift(ctx, p)
}