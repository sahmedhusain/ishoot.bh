package app_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/workflow/internal/app"
	"platform.local/backend/services/workflow/internal/postgres"
	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
	"platform.local/backend/services/workflow/migrations"
)

func setupWorkflowPostgres(t *testing.T) (*app.Service, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	return app.New(postgres.New(pool)), pool
}

func wfPtr(s string) *string { return &s }

func TestWorkflowMomRelationsAndDirectorySyncIntegration(t *testing.T) {
	ctx := context.Background()
	svc, pool := setupWorkflowPostgres(t)

	// 1. Sync cross-service directory refs (client, deal, project, department, employee) idempotently.
	contactEv := []byte(`{"id":"client-1","firstName":"Sara","lastName":"Noor","company":"Bahrain Media","email":"sara@media.test"}`)
	require.NoError(t, svc.HandleDomainEvent(ctx, "22222222-2222-4222-8222-222222222201", "sales.contact.upserted", contactEv))
	require.NoError(t, svc.HandleDomainEvent(ctx, "22222222-2222-4222-8222-222222222201", "sales.contact.upserted", contactEv), "duplicate event id must be ignored")
	require.NoError(t, svc.HandleDomainEvent(ctx, "22222222-2222-4222-8222-222222222202", "sales.deal.upserted", []byte(`{"id":"deal-1","title":"National Day Campaign","contactId":"client-1"}`)))
	require.NoError(t, svc.HandleDomainEvent(ctx, "22222222-2222-4222-8222-222222222203", "system.project.upserted", []byte(`{"id":"proj-1","name":"Studio Shoot Q4","departmentId":"dept-1"}`)))
	require.NoError(t, svc.HandleDomainEvent(ctx, "22222222-2222-4222-8222-222222222204", "hr.department.upserted", []byte(`{"id":"dept-1","name":"Production"}`)))
	require.NoError(t, svc.HandleDomainEvent(ctx, "22222222-2222-4222-8222-222222222205", "hr.employee.upserted", []byte(`{"id":"emp-1","name":"Khalid Ali","email":"khalid@studio.test","departmentId":"dept-1"}`)))

	allRefs, err := svc.ListDirectoryRefs(ctx, nil)
	require.NoError(t, err)
	require.Len(t, allRefs, 5)
	projRefs, err := svc.ListDirectoryRefs(ctx, wfPtr("project"))
	require.NoError(t, err)
	require.Len(t, projRefs, 1)
	require.Equal(t, "Studio Shoot Q4", projRefs[0].Name)

	// 2. Create relational MOM with attendees and action items that auto-create workflow.task rows.
	due := time.Now().UTC().AddDate(0, 0, 7)
	created, err := svc.CreateMOMWithRelations(ctx, app.CreateMOMInput{
		CreateMOMParams: sqlcdb.CreateMOMParams{
			MomNumber:    "MOM-2026-0001",
			Title:        "Kickoff Production Alignment",
			MeetingDate:  pgtype.Date{Time: time.Now().UTC(), Valid: true},
			ClientID:     wfPtr("client-1"),
			DealID:       wfPtr("deal-1"),
			ProjectID:    wfPtr("proj-1"),
			DepartmentID: wfPtr("dept-1"),
			Agenda:       "Finalize shoot schedule and equipment checklist",
			Discussion:   "[]",
			Status:       "draft",
		},
		AttendeeRecords: []sqlcdb.InsertMomAttendeeParams{
			{
				AttendeeType: "employee",
				EmployeeID:   wfPtr("emp-1"),
				DepartmentID: wfPtr("dept-1"),
				DisplayName:  "Khalid Ali",
				RoleTitle:    wfPtr("Producer"),
				Attended:     true,
			},
			{
				AttendeeType: "client",
				ContactID:    wfPtr("client-1"),
				DisplayName:  "Sara Noor",
				RoleTitle:    wfPtr("Client Lead"),
				Attended:     true,
			},
		},
		ActionItemRecords: []app.MomActionItemInput{
			{
				Title:              "Send lighting rig list",
				AssigneeEmployeeID: wfPtr("emp-1"),
				DueDate:            &due,
				Status:             "pending",
			},
		},
	})
	require.NoError(t, err)
	require.Equal(t, []string{"Khalid Ali", "Sara Noor"}, created.Attendees)
	require.Len(t, created.AttendeeRecords, 2)
	require.Len(t, created.ActionItemRecords, 1)
	require.NotNil(t, created.ActionItemRecords[0].TaskID)

	// 3. Verify filtered MOM & Task queries resolve relations end-to-end.
	momsByClient, err := svc.ListMOMsFiltered(ctx, sqlcdb.ListMOMsFilteredParams{ClientID: wfPtr("client-1")})
	require.NoError(t, err)
	require.Len(t, momsByClient, 1)
	require.Equal(t, created.ID, momsByClient[0].ID)

	tasksByMom, err := svc.ListTasksFiltered(ctx, sqlcdb.ListTasksFilteredParams{
		MomID:     &created.ID,
		ProjectID: wfPtr("proj-1"),
	})
	require.NoError(t, err)
	require.Len(t, tasksByMom, 1)
	require.Equal(t, *created.ActionItemRecords[0].TaskID, tasksByMom[0].ID)
	require.Equal(t, "dept-1", *tasksByMom[0].DepartmentID)
	require.Equal(t, "client-1", *tasksByMom[0].ClientID)

	// Outbox emitted workflow.mom.created once
	var outboxCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM workflow.outbox WHERE subject = 'workflow.mom.created'`).Scan(&outboxCount))
	require.Equal(t, 1, outboxCount)
}
