package app

import (
	"context"
	"encoding/json"
	"strconv"

	"platform.local/backend/services/delivery/internal/postgres"
)

const DeliveryMeshConsumer = "delivery-mesh-events"

func (s *Service) ListShipmentsEnriched(ctx context.Context, orderID, driverID, status string) ([]postgres.EnrichedShipment, error) {
	return s.store.ListShipmentsEnriched(ctx, orderID, driverID, status)
}

func (s *Service) ListDriverRefs(ctx context.Context) ([]postgres.DriverRef, error) {
	return s.store.ListDriverRefs(ctx)
}

func (s *Service) ListOrderRefs(ctx context.Context) ([]postgres.OrderRef, error) {
	return s.store.ListOrderRefs(ctx)
}

func (s *Service) HandleMeshEvent(ctx context.Context, eventID, subject string, payload []byte) error {
	switch {
	case len(subject) >= 15 && subject[:15] == "commerce.order.":
		var in struct {
			OrderID        string  `json:"order_id"`
			OrderNumber    string  `json:"order_number"`
			CustomerID     *string `json:"customer_id"`
			ContactID      *string `json:"contact_id"`
			RecipientName  string  `json:"recipient_name"`
			RecipientPhone string  `json:"recipient_phone"`
			Status         string  `json:"status"`
			Currency       string  `json:"currency"`
			Total          any     `json:"total"`
		}
		if err := json.Unmarshal(payload, &in); err != nil {
			return nil
		}
		var totalFloat float64
		switch v := in.Total.(type) {
		case float64:
			totalFloat = v
		case string:
			totalFloat, _ = strconv.ParseFloat(v, 64)
		}
		if in.Status == "" {
			if subject == "commerce.order.cancelled" {
				in.Status = "cancelled"
			} else if subject == "commerce.order.placed" {
				in.Status = "placed"
			}
		}
		return s.store.UpsertOrderRef(ctx, DeliveryMeshConsumer, eventID, postgres.OrderRef{
			OrderID:        in.OrderID,
			OrderNumber:    in.OrderNumber,
			CustomerID:     in.CustomerID,
			ContactID:      in.ContactID,
			RecipientName:  in.RecipientName,
			RecipientPhone: in.RecipientPhone,
			Status:         in.Status,
			Total:          totalFloat,
			Currency:       in.Currency,
		})

	case len(subject) >= 12 && subject[:12] == "hr.employee.":
		var in struct {
			ID           string  `json:"id"`
			UserID       *string `json:"userId"`
			NameEn       string  `json:"nameEn"`
			NameAr       string  `json:"nameAr"`
			Phone        *string `json:"phone"`
			DepartmentID *string `json:"departmentId"`
			Status       string  `json:"status"`
		}
		if err := json.Unmarshal(payload, &in); err != nil {
			return nil
		}
		return s.store.UpsertDriverRef(ctx, DeliveryMeshConsumer, eventID, postgres.DriverRef{
			EmployeeID:   in.ID,
			UserID:       in.UserID,
			NameEn:       in.NameEn,
			NameAr:       in.NameAr,
			Phone:        in.Phone,
			DepartmentID: in.DepartmentID,
			Status:       in.Status,
		})
	}
	return nil
}
