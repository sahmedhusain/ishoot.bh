package postgres

import (
	"context"

	"platform.local/backend/services/system/internal/postgres/sqlcdb"
)

type ServiceCatalogItem = sqlcdb.SystemService
type Project = sqlcdb.SystemProject

func (s *Store) ListServices(ctx context.Context, activeOnly bool) ([]ServiceCatalogItem, error) {
	if activeOnly {
		return s.q.ListActiveServices(ctx)
	}
	return s.q.ListServices(ctx)
}

func (s *Store) GetServiceByID(ctx context.Context, id string) (ServiceCatalogItem, error) {
	return s.q.GetServiceByID(ctx, id)
}

func (s *Store) CreateService(ctx context.Context, p sqlcdb.CreateServiceParams) (ServiceCatalogItem, error) {
	return s.q.CreateService(ctx, p)
}

func (s *Store) UpdateService(ctx context.Context, p sqlcdb.UpdateServiceParams) (ServiceCatalogItem, error) {
	return s.q.UpdateService(ctx, p)
}

func (s *Store) DeleteService(ctx context.Context, id string) error {
	return s.q.DeleteService(ctx, id)
}

func (s *Store) ListProjects(ctx context.Context) ([]Project, error) {
	return s.q.ListProjects(ctx)
}

func (s *Store) GetProjectByID(ctx context.Context, id string) (Project, error) {
	return s.q.GetProjectByID(ctx, id)
}

func (s *Store) CreateProject(ctx context.Context, p sqlcdb.CreateProjectParams) (Project, error) {
	return s.q.CreateProject(ctx, p)
}

func (s *Store) UpdateProject(ctx context.Context, p sqlcdb.UpdateProjectParams) (Project, error) {
	return s.q.UpdateProject(ctx, p)
}

func (s *Store) DeleteProject(ctx context.Context, id string) error {
	return s.q.DeleteProject(ctx, id)
}
