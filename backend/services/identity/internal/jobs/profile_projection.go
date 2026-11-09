package jobs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"

	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
)

type ProfileProjectionArgs struct{}

func (ProfileProjectionArgs) Kind() string { return "identity.project_business_profiles" }
func (ProfileProjectionArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

type ProfileProjectionWorker struct {
	river.WorkerDefaults[ProfileProjectionArgs]
	Pool             *pgxpool.Pool
	Transport        http.RoundTripper
	AdminURL, WebURL string
}

func (w *ProfileProjectionWorker) Work(ctx context.Context, _ *river.Job[ProfileProjectionArgs]) error {
	q := sqlcdb.New(w.Pool)
	rows, err := q.PendingProfileProjections(ctx, 50)
	if err != nil {
		return err
	}
	client := &http.Client{Transport: w.Transport, Timeout: 3 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}

	var failures []error
	for _, row := range rows {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := w.deliver(ctx, client, q, row); err != nil {
			failures = append(failures, err)
		}
	}
	return errors.Join(failures...)
}
func (w *ProfileProjectionWorker) deliver(ctx context.Context, client *http.Client, q *sqlcdb.Queries, row sqlcdb.PendingProfileProjectionsRow) error {

	raw, err := json.Marshal(map[string]any{"realm": row.Realm, "subjectId": row.SubjectID, "version": row.Version, "deleted": row.Deleted, "email": row.Email, "roles": row.Roles, "active": row.Active, "displayName": row.DisplayName, "overrides": json.RawMessage(row.PermissionOverrides), "roleNameEn": row.RoleNameEn, "roleNameAr": row.RoleNameAr, "roleSystem": row.RoleSystem, "roleVersion": row.RoleVersion})
	if err != nil {
		return err
	}
	origin := w.AdminURL
	if row.Realm == "customer" {
		origin = w.WebURL
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(origin, "/")+"/api/internal/identity-projection", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	response, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("profile projection delivery failed: %w", err)
	}
	_, readErr := io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	_ = response.Body.Close()
	if readErr != nil {
		return fmt.Errorf("profile projection response failed: %w", readErr)
	}
	if response.StatusCode != http.StatusNoContent {
		return fmt.Errorf("profile projection refused: status %d", response.StatusCode)
	}
	if err := q.DeliveredProfileProjection(ctx, sqlcdb.DeliveredProfileProjectionParams{Realm: row.Realm, SubjectID: row.SubjectID, Version: row.Version}); err != nil {
		return err
	}
	return nil
}
