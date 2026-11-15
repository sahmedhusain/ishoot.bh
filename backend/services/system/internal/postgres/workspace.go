package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

type WorkspacePrefs struct {
	UserID       string          `json:"userId"`
	Widgets      json.RawMessage `json:"widgets"`
	Scratchpad   json.RawMessage `json:"scratchpad"`
	SidebarPrefs json.RawMessage `json:"sidebarPrefs"`
	UpdatedAt    *time.Time      `json:"updatedAt,omitempty"`
}

type WorkspaceLayoutRow struct {
	UserID  string          `json:"userId"`
	Widgets json.RawMessage `json:"widgets"`
}

func normalizeJSON(raw json.RawMessage, fallback string) json.RawMessage {
	if len(raw) == 0 {
		return json.RawMessage(fallback)
	}
	return raw
}

func (s *Store) GetWorkspacePrefs(ctx context.Context, userID string) (WorkspacePrefs, error) {
	var out WorkspacePrefs
	var widgets, scratchpad, sidebarPrefs []byte
	var updatedAt *time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT user_id, widgets, scratchpad, sidebar_prefs, updated_at
		FROM system.dashboard_layout
		WHERE user_id = $1
	`, userID).Scan(&out.UserID, &widgets, &scratchpad, &sidebarPrefs, &updatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return WorkspacePrefs{
			UserID:       userID,
			Widgets:      json.RawMessage(`[]`),
			Scratchpad:   json.RawMessage(`{}`),
			SidebarPrefs: json.RawMessage(`{}`),
		}, nil
	}
	if err != nil {
		return WorkspacePrefs{}, err
	}
	out.Widgets = normalizeJSON(widgets, `[]`)
	out.Scratchpad = normalizeJSON(scratchpad, `{}`)
	out.SidebarPrefs = normalizeJSON(sidebarPrefs, `{}`)
	out.UpdatedAt = updatedAt
	return out, nil
}

func (s *Store) UpsertWorkspacePrefs(
	ctx context.Context,
	userID string,
	widgets *json.RawMessage,
	scratchpad *json.RawMessage,
	sidebarPrefs *json.RawMessage,
) (WorkspacePrefs, error) {
	existing, err := s.GetWorkspacePrefs(ctx, userID)
	if err != nil {
		return WorkspacePrefs{}, err
	}
	nextWidgets := existing.Widgets
	if widgets != nil && len(*widgets) > 0 {
		nextWidgets = *widgets
	}
	nextScratchpad := existing.Scratchpad
	if scratchpad != nil && len(*scratchpad) > 0 {
		nextScratchpad = *scratchpad
	}
	nextSidebar := existing.SidebarPrefs
	if sidebarPrefs != nil && len(*sidebarPrefs) > 0 {
		nextSidebar = *sidebarPrefs
	}

	var out WorkspacePrefs
	var w, sp, sb []byte
	var updatedAt *time.Time
	err = s.pool.QueryRow(ctx, `
		INSERT INTO system.dashboard_layout (user_id, widgets, scratchpad, sidebar_prefs, updated_at)
		VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, now())
		ON CONFLICT (user_id) DO UPDATE SET
			widgets = EXCLUDED.widgets,
			scratchpad = EXCLUDED.scratchpad,
			sidebar_prefs = EXCLUDED.sidebar_prefs,
			updated_at = now()
		RETURNING user_id, widgets, scratchpad, sidebar_prefs, updated_at
	`, userID, []byte(nextWidgets), []byte(nextScratchpad), []byte(nextSidebar)).
		Scan(&out.UserID, &w, &sp, &sb, &updatedAt)
	if err != nil {
		return WorkspacePrefs{}, err
	}
	out.Widgets = normalizeJSON(w, `[]`)
	out.Scratchpad = normalizeJSON(sp, `{}`)
	out.SidebarPrefs = normalizeJSON(sb, `{}`)
	out.UpdatedAt = updatedAt
	return out, nil
}

func (s *Store) ResetWorkspaceLayout(ctx context.Context, userID string, nextWidgets json.RawMessage) error {
	if len(nextWidgets) == 0 {
		nextWidgets = json.RawMessage(`[]`)
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE system.dashboard_layout
		SET widgets = $2::jsonb, updated_at = now()
		WHERE user_id = $1
	`, userID, []byte(nextWidgets))
	return err
}

func (s *Store) ListWorkspaceLayouts(ctx context.Context) ([]WorkspaceLayoutRow, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT user_id, widgets
		FROM system.dashboard_layout
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []WorkspaceLayoutRow
	for rows.Next() {
		var row WorkspaceLayoutRow
		var w []byte
		if err := rows.Scan(&row.UserID, &w); err != nil {
			return nil, err
		}
		row.Widgets = normalizeJSON(w, `[]`)
		out = append(out, row)
	}
	return out, rows.Err()
}
