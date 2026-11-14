package app

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"platform.local/backend/services/system/internal/postgres"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

var ErrNotFound = errors.New("system resource not found")

const (
	EventServiceUpserted = "system.service.upserted"
	EventServiceDeleted  = "system.service.deleted"
	EventProjectUpserted = "system.project.upserted"
	EventProjectDeleted  = "system.project.deleted"
)

func numericToFloat(n pgtype.Numeric) float64 {
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return 0
	}
	return f.Float64
}

func strOrEmpty(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func boolOrTrue(p *bool) bool {
	if p == nil {
		return true
	}
	return *p
}

func serviceEventPayload(item postgres.ServiceCatalogItem) map[string]any {
	return map[string]any{
		"kind":      "service",
		"id":        item.ID,
		"variantId": "",
		"sku":       item.Code,
		"nameEn":    strOrEmpty(item.NameEn),
		"nameAr":    strOrEmpty(item.NameAr),
		"category":  strOrEmpty(item.Category),
		"unit":      strOrEmpty(item.Unit),
		"unitPrice": numericToFloat(item.DefaultRate),
		"currency":  "BHD",
		"taxRate":   0.0,
		"isActive":  boolOrTrue(item.IsActive),
	}
}

func projectEventPayload(item postgres.Project) map[string]any {
	return map[string]any{
		"kind":         "project",
		"id":           item.ID,
		"code":         item.Code,
		"name":         strOrEmpty(item.Name),
		"status":       strOrEmpty(item.Status),
		"departmentId": item.DepartmentID,
	}
}

func (s *Service) ListServices(ctx context.Context, activeOnly bool) ([]postgres.ServiceCatalogItem, error) {
	return s.store.ListServices(ctx, activeOnly)
}

func (s *Service) GetService(ctx context.Context, id string) (postgres.ServiceCatalogItem, error) {
	item, err := s.store.GetServiceByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.ServiceCatalogItem{}, ErrNotFound
		}
		return postgres.ServiceCatalogItem{}, err
	}
	return item, nil
}

func (s *Service) CreateService(ctx context.Context, in sqlcdb.CreateServiceParams) (postgres.ServiceCatalogItem, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.IsActive == nil {
		t := true
		in.IsActive = &t
	}
	if in.IsPublic == nil {
		t := true
		in.IsPublic = &t
	}
	var created postgres.ServiceCatalogItem
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		var txErr error
		created, txErr = st.CreateService(ctx, in)
		if txErr != nil {
			return txErr
		}
		return s.changeInTx(ctx, tx, EventServiceUpserted, serviceEventPayload(created))
	})
	return created, err
}

func (s *Service) UpdateService(ctx context.Context, in sqlcdb.UpdateServiceParams) (postgres.ServiceCatalogItem, error) {
	var updated postgres.ServiceCatalogItem
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		var txErr error
		updated, txErr = st.UpdateService(ctx, in)
		if txErr != nil {
			return txErr
		}
		return s.changeInTx(ctx, tx, EventServiceUpserted, serviceEventPayload(updated))
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return postgres.ServiceCatalogItem{}, ErrNotFound
	}
	return updated, err
}

func (s *Service) DeleteService(ctx context.Context, id string) error {
	return s.change(ctx, EventServiceDeleted, map[string]any{"kind": "service", "id": id}, func(st *postgres.Store) error {
		return st.DeleteService(ctx, id)
	})
}

func (s *Service) ListProjects(ctx context.Context) ([]postgres.Project, error) {
	return s.store.ListProjects(ctx)
}

func (s *Service) GetProject(ctx context.Context, id string) (postgres.Project, error) {
	p, err := s.store.GetProjectByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return postgres.Project{}, ErrNotFound
		}
		return postgres.Project{}, err
	}
	return p, nil
}

func (s *Service) CreateProject(ctx context.Context, in sqlcdb.CreateProjectParams) (postgres.Project, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Status == nil {
		active := "active"
		in.Status = &active
	}
	var created postgres.Project
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		var txErr error
		created, txErr = st.CreateProject(ctx, in)
		if txErr != nil {
			return txErr
		}
		return s.changeInTx(ctx, tx, EventProjectUpserted, projectEventPayload(created))
	})
	return created, err
}

func (s *Service) UpdateProject(ctx context.Context, in sqlcdb.UpdateProjectParams) (postgres.Project, error) {
	var updated postgres.Project
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		var txErr error
		updated, txErr = st.UpdateProject(ctx, in)
		if txErr != nil {
			return txErr
		}
		return s.changeInTx(ctx, tx, EventProjectUpserted, projectEventPayload(updated))
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return postgres.Project{}, ErrNotFound
	}
	return updated, err
}

func (s *Service) DeleteProject(ctx context.Context, id string) error {
	return s.change(ctx, EventProjectDeleted, map[string]any{"kind": "project", "id": id}, func(st *postgres.Store) error {
		return st.DeleteProject(ctx, id)
	})
}
