// Package app holds the commerce service's use cases.
package app

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/commerce/internal/postgres"
	"platform.local/backend/services/commerce/internal/postgres/sqlcdb"
)

var (
	ErrNotFound = errors.New("commerce resource not found")
	ErrConflict = errors.New("commerce resource conflict")
)

const (
	EventOrderPlaced    = "commerce.order.placed"
	EventOrderPaid      = "commerce.order.paid"
	EventOrderFulfilled = "commerce.order.fulfilled"
	EventOrderCancelled = "commerce.order.cancelled"
)

type Service struct {
	store *postgres.Store
	now   func() time.Time
}

func New(store *postgres.Store) *Service {
	return &Service{
		store: store,
		now:   time.Now,
	}
}

func (s *Service) change(ctx context.Context, subject string, payload any, write func(*postgres.Store) error) error {
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		if err := write(st); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: subject, Payload: payload})
	})
}

// Customers & Addresses
func (s *Service) ListCustomers(ctx context.Context) ([]postgres.Customer, error) {
	return s.store.ListCustomers(ctx)
}

func (s *Service) GetCustomer(ctx context.Context, id string) (postgres.Customer, error) {
	c, err := s.store.GetCustomerByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Customer{}, ErrNotFound
		}
		return postgres.Customer{}, err
	}
	return c, nil
}

func (s *Service) CreateCustomer(ctx context.Context, in sqlcdb.CreateCustomerParams) (postgres.Customer, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateCustomer(ctx, in)
}

func (s *Service) UpdateCustomer(ctx context.Context, in sqlcdb.UpdateCustomerParams) (postgres.Customer, error) {
	return s.store.UpdateCustomer(ctx, in)
}

func (s *Service) ListCustomerAddresses(ctx context.Context, customerID string) ([]postgres.CustomerAddress, error) {
	return s.store.ListCustomerAddresses(ctx, customerID)
}

func (s *Service) CreateCustomerAddress(ctx context.Context, in sqlcdb.CreateCustomerAddressParams) (postgres.CustomerAddress, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateCustomerAddress(ctx, in)
}

// Store Settings
func (s *Service) GetStoreSettings(ctx context.Context) (postgres.StoreSettings, error) {
	return s.store.GetStoreSettings(ctx)
}

func (s *Service) UpsertStoreSettings(ctx context.Context, in sqlcdb.UpsertStoreSettingsParams) (postgres.StoreSettings, error) {
	return s.store.UpsertStoreSettings(ctx, in)
}

// Coupons
func (s *Service) ListCoupons(ctx context.Context) ([]postgres.Coupon, error) {
	return s.store.ListCoupons(ctx)
}

func (s *Service) GetCoupon(ctx context.Context, code string) (postgres.Coupon, error) {
	c, err := s.store.GetCouponByCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Coupon{}, ErrNotFound
		}
		return postgres.Coupon{}, err
	}
	return c, nil
}

func (s *Service) CreateCoupon(ctx context.Context, in sqlcdb.CreateCouponParams) (postgres.Coupon, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateCoupon(ctx, in)
}

// Orders
func (s *Service) ListOrders(ctx context.Context) ([]postgres.SalesOrder, error) {
	return s.store.ListOrders(ctx)
}

func (s *Service) GetOrder(ctx context.Context, id string) (postgres.SalesOrder, error) {
	o, err := s.store.GetOrderByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.SalesOrder{}, ErrNotFound
		}
		return postgres.SalesOrder{}, err
	}
	return o, nil
}

func (s *Service) PlaceOrder(ctx context.Context, in sqlcdb.CreateOrderParams, lines []sqlcdb.CreateOrderLineParams) (postgres.SalesOrder, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	var created postgres.SalesOrder
	err := s.change(ctx, EventOrderPlaced, map[string]any{
		"order_id":     in.ID,
		"order_number": in.Number,
		"total":        in.Total,
		"currency":     in.Currency,
		"placed_at":    s.now().Format(time.RFC3339),
	}, func(st *postgres.Store) error {
		var oErr error
		created, oErr = st.CreateOrder(ctx, in)
		if oErr != nil {
			return oErr
		}
		for _, line := range lines {
			if line.ID == "" {
				line.ID = uuid.NewString()
			}
			line.OrderID = in.ID
			if _, lErr := st.CreateOrderLine(ctx, line); lErr != nil {
				return lErr
			}
		}
		_, evErr := st.CreateOrderEvent(ctx, sqlcdb.CreateOrderEventParams{
			ID:      uuid.NewString(),
			OrderID: in.ID,
			Kind:    "status",
			Status:  &in.Status,
		})
		return evErr
	})
	return created, err
}

func (s *Service) RecordOrderPayment(ctx context.Context, in sqlcdb.UpdateOrderPaymentStatusParams) (postgres.SalesOrder, error) {
	var updated postgres.SalesOrder
	err := s.change(ctx, EventOrderPaid, map[string]any{
		"order_id":       in.ID,
		"payment_status": in.PaymentStatus,
		"amount_paid":    in.AmountPaid,
		"paid_at":        s.now().Format(time.RFC3339),
	}, func(st *postgres.Store) error {
		var uErr error
		updated, uErr = st.UpdateOrderPaymentStatus(ctx, in)
		if uErr != nil {
			return uErr
		}
		_, evErr := st.CreateOrderEvent(ctx, sqlcdb.CreateOrderEventParams{
			ID:      uuid.NewString(),
			OrderID: in.ID,
			Kind:    "payment",
			Status:  &in.PaymentStatus,
		})
		return evErr
	})
	return updated, err
}

func (s *Service) UpdateOrderStatus(ctx context.Context, in sqlcdb.UpdateOrderStatusParams) (postgres.SalesOrder, error) {
	event := EventOrderFulfilled
	if in.Status == "cancelled" {
		event = EventOrderCancelled
	}
	var updated postgres.SalesOrder
	err := s.change(ctx, event, map[string]any{
		"order_id": in.ID,
		"status":   in.Status,
		"at":       s.now().Format(time.RFC3339),
	}, func(st *postgres.Store) error {
		var uErr error
		updated, uErr = st.UpdateOrderStatus(ctx, in)
		if uErr != nil {
			return uErr
		}
		_, evErr := st.CreateOrderEvent(ctx, sqlcdb.CreateOrderEventParams{
			ID:      uuid.NewString(),
			OrderID: in.ID,
			Kind:    "status",
			Status:  &in.Status,
		})
		return evErr
	})
	return updated, err
}

func (s *Service) ListOrderLines(ctx context.Context, orderID string) ([]postgres.SalesOrderLine, error) {
	return s.store.ListOrderLines(ctx, orderID)
}

func (s *Service) ListOrderEvents(ctx context.Context, orderID string) ([]postgres.SalesOrderEvent, error) {
	return s.store.ListOrderEvents(ctx, orderID)
}

// Retail POS
func (s *Service) ListRetailRegisters(ctx context.Context) ([]postgres.RetailRegister, error) {
	return s.store.ListRetailRegisters(ctx)
}

func (s *Service) CreateRetailRegister(ctx context.Context, in sqlcdb.CreateRetailRegisterParams) (postgres.RetailRegister, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateRetailRegister(ctx, in)
}

func (s *Service) ListRetailShifts(ctx context.Context) ([]postgres.RetailShift, error) {
	return s.store.ListRetailShifts(ctx)
}

func (s *Service) CreateRetailShift(ctx context.Context, in sqlcdb.CreateRetailShiftParams) (postgres.RetailShift, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	return s.store.CreateRetailShift(ctx, in)
}

func (s *Service) CloseRetailShift(ctx context.Context, in sqlcdb.CloseRetailShiftParams) (postgres.RetailShift, error) {
	return s.store.CloseRetailShift(ctx, in)
}