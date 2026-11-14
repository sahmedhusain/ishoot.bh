package app

import (
	"context"
	"encoding/json"

	"platform.local/backend/services/itsm/internal/postgres"
)

const (
	HREventsConsumer   = "itsm-hr-events"
	SubjectHREmployees = "hr.employee.>"
)

func (s *Service) GetTicketLinks(ctx context.Context, ticketID string) (postgres.TicketLinks, error) {
	return s.store.GetTicketLinks(ctx, ticketID)
}

func (s *Service) UpdateTicketLinks(ctx context.Context, ticketID string, in postgres.TicketLinks) (postgres.TicketLinks, error) {
	return s.store.UpdateTicketLinks(ctx, ticketID, in)
}

func (s *Service) ListAssets(ctx context.Context, status, categoryID string) ([]postgres.Asset, error) {
	return s.store.ListAssets(ctx, status, categoryID)
}

func (s *Service) SaveAsset(ctx context.Context, in postgres.Asset) (postgres.Asset, error) {
	return s.store.UpsertAsset(ctx, in)
}

func (s *Service) DeleteAsset(ctx context.Context, id string) error {
	return s.store.DeleteAsset(ctx, id)
}

func (s *Service) ListAssetHandovers(ctx context.Context, assetID, employeeID string) ([]postgres.AssetHandover, error) {
	return s.store.ListAssetHandovers(ctx, assetID, employeeID)
}

func (s *Service) SaveAssetHandover(ctx context.Context, in postgres.AssetHandover) (postgres.AssetHandover, error) {
	return s.store.UpsertAssetHandover(ctx, in)
}

func (s *Service) ListStaffRef(ctx context.Context, status string) ([]postgres.StaffRef, error) {
	return s.store.ListStaffRef(ctx, status)
}

func (s *Service) HandleHREmployeeEvent(ctx context.Context, eventID string, payload []byte) error {
	var in struct {
		ID             string  `json:"id"`
		UserID         *string `json:"userId"`
		EmployeeNumber string  `json:"employeeNumber"`
		NameEn         string  `json:"nameEn"`
		NameAr         string  `json:"nameAr"`
		Email          string  `json:"email"`
		DepartmentID   *string `json:"departmentId"`
		Status         string  `json:"status"`
	}
	if err := json.Unmarshal(payload, &in); err != nil {
		return nil
	}
	if in.ID == "" {
		return nil
	}
	return s.store.SyncHREmployee(ctx, HREventsConsumer, eventID, postgres.StaffRef{
		EmployeeID:     in.ID,
		UserID:         in.UserID,
		EmployeeNumber: in.EmployeeNumber,
		NameEn:         in.NameEn,
		NameAr:         in.NameAr,
		Email:          in.Email,
		DepartmentID:   in.DepartmentID,
		Status:         in.Status,
	})
}
