package app

import (
	"context"
	"encoding/json"

	"platform.local/backend/services/system/internal/postgres"
)

func (s *Service) GetWorkspacePrefs(ctx context.Context, userID string) (postgres.WorkspacePrefs, error) {
	return s.store.GetWorkspacePrefs(ctx, userID)
}

func (s *Service) UpsertWorkspacePrefs(
	ctx context.Context,
	userID string,
	widgets *json.RawMessage,
	scratchpad *json.RawMessage,
	sidebarPrefs *json.RawMessage,
) (postgres.WorkspacePrefs, error) {
	return s.store.UpsertWorkspacePrefs(ctx, userID, widgets, scratchpad, sidebarPrefs)
}

func (s *Service) ResetWorkspaceLayout(ctx context.Context, userID string, nextWidgets json.RawMessage) error {
	return s.store.ResetWorkspaceLayout(ctx, userID, nextWidgets)
}

func (s *Service) ListWorkspaceLayouts(ctx context.Context) ([]postgres.WorkspaceLayoutRow, error) {
	return s.store.ListWorkspaceLayouts(ctx)
}
