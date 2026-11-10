package app_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/workflow/internal/app"
	"platform.local/backend/services/workflow/internal/postgres"
	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
	"platform.local/backend/services/workflow/migrations"
)

func setup(t *testing.T) (*app.Service, *pgxpool.Pool) {
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

func date(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}

func TestApprovalRequests(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	// Create Approval Request
	req, err := svc.CreateApprovalRequest(ctx, sqlcdb.CreateApprovalRequestParams{
		Kind:        "leave_approval",
		EntityID:    "leave-123",
		RequesterID: "user-1",
		Status:      "pending",
		Priority:    "normal",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, req.ID)

	// Get & List
	withDec, err := svc.GetApprovalRequest(ctx, req.ID)
	require.NoError(t, err)
	assert.Equal(t, req.ID, withDec.ApprovalRequest.ID)
	assert.Empty(t, withDec.Decisions)

	_, err = svc.GetApprovalRequest(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	list, err := svc.ListApprovalRequests(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	// Decide Approval (Approve)
	cmt := "Approved by manager"
	dec, err := svc.DecideApproval(ctx, req.ID, "manager-1", "approve", &cmt)
	require.NoError(t, err)
	assert.NotEmpty(t, dec.ID)
	assert.Equal(t, "approve", dec.Decision)

	// Re-get to check updated status
	afterDec, err := svc.GetApprovalRequest(ctx, req.ID)
	require.NoError(t, err)
	assert.Equal(t, "approved", afterDec.Status)
	assert.Len(t, afterDec.Decisions, 1)
}

func TestSignatureRequests(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	sr, err := svc.CreateSignatureRequest(ctx, sqlcdb.CreateSignatureRequestParams{
		Title:         "Employment Contract",
		DocumentType:  "contract",
		DocumentID:    "doc-100",
		RequestedFrom: "user-2",
		Status:        "pending",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, sr.ID)

	fetched, err := svc.GetSignatureRequest(ctx, sr.ID)
	require.NoError(t, err)
	assert.Equal(t, "Employment Contract", fetched.Title)

	_, err = svc.GetSignatureRequest(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	list, err := svc.ListSignatureRequests(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	// Record Signature
	sigURL := "https://files.local/signatures/sig.png"
	signed, err := svc.RecordSignature(ctx, sr.ID, &sigURL)
	require.NoError(t, err)
	assert.Equal(t, &sigURL, signed.SignatureUrl)
}

func TestLettersAndTemplates(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	// Template
	tpl, err := svc.CreateLetterTemplate(ctx, sqlcdb.CreateLetterTemplateParams{
		NameEn:       "Salary Certificate",
		NameAr:       "شهادة راتب",
		TemplateBody: "To whom it may concern...",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, tpl.ID)

	templates, err := svc.ListLetterTemplates(ctx)
	require.NoError(t, err)
	assert.Len(t, templates, 1)

	// Official Letter
	letter, err := svc.CreateOfficialLetter(ctx, sqlcdb.CreateOfficialLetterParams{
		LetterNumber:  "LET-001",
		TemplateID:    &tpl.ID,
		RecipientName: "Bank of Bahrain",
		Subject:       "Salary Certificate for User",
		Body:          "This is to certify...",
		Status:        "draft",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, letter.ID)

	fetched, err := svc.GetOfficialLetter(ctx, letter.ID)
	require.NoError(t, err)
	assert.Equal(t, "LET-001", fetched.LetterNumber)

	_, err = svc.GetOfficialLetter(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	letters, err := svc.ListOfficialLetters(ctx)
	require.NoError(t, err)
	assert.Len(t, letters, 1)

	// Issue Official Letter
	issued, err := svc.IssueOfficialLetter(ctx, letter.ID)
	require.NoError(t, err)
	assert.Equal(t, "issued", issued.Status)
}

func TestMOMs(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	now := time.Now().UTC()
	mom, err := svc.CreateMOM(ctx, sqlcdb.CreateMOMParams{
		MomNumber:   "MOM-2026-01",
		Title:       "Q4 Planning Meeting",
		MeetingDate: date(now),
		Attendees:   []string{"Alice", "Bob"},
		Discussion:  "Discussed Q4 roadmap.",
		Status:      "draft",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, mom.ID)

	fetched, err := svc.GetMOM(ctx, mom.ID)
	require.NoError(t, err)
	assert.Equal(t, "MOM-2026-01", fetched.MomNumber)

	_, err = svc.GetMOM(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	moms, err := svc.ListMOMs(ctx)
	require.NoError(t, err)
	assert.Len(t, moms, 1)

	updated, err := svc.UpdateMOM(ctx, sqlcdb.UpdateMOMParams{
		ID:          mom.ID,
		Title:       "Q4 Planning Meeting (Final)",
		MeetingDate: date(now),
		Attendees:   []string{"Alice", "Bob", "Charlie"},
		Discussion:  "Discussed Q4 roadmap and budget.",
		Status:      "published",
	})
	require.NoError(t, err)
	assert.Equal(t, "published", updated.Status)
}

func TestTasks(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	desc := "Prepare slides for meeting."
	task, err := svc.CreateTask(ctx, sqlcdb.CreateTaskParams{
		Title:       "Prepare Slides",
		Description: &desc,
		Status:      "todo",
		Priority:    "medium",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, task.ID)

	fetched, err := svc.GetTask(ctx, task.ID)
	require.NoError(t, err)
	assert.Equal(t, "Prepare Slides", fetched.Title)

	_, err = svc.GetTask(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	tasks, err := svc.ListTasks(ctx)
	require.NoError(t, err)
	assert.Len(t, tasks, 1)

	newDesc := "Prepare slides for meeting and review with manager."
	updated, err := svc.UpdateTask(ctx, sqlcdb.UpdateTaskParams{
		ID:          task.ID,
		Title:       "Prepare & Review Slides",
		Description: &newDesc,
		Status:      "in_progress",
		Priority:    "high",
	})
	require.NoError(t, err)
	assert.Equal(t, "in_progress", updated.Status)

	statusUpdated, err := svc.UpdateTaskStatus(ctx, task.ID, "completed")
	require.NoError(t, err)
	assert.Equal(t, "completed", statusUpdated.Status)

	err = svc.DeleteTask(ctx, task.ID)
	require.NoError(t, err)

	_, err = svc.GetTask(ctx, task.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
}

func TestCalendarEvents(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	now := time.Now().UTC()
	ce, err := svc.CreateCalendarEvent(ctx, sqlcdb.CreateCalendarEventParams{
		Title:       "Team Sync",
		StartTime:   now,
		EndTime:     now.Add(time.Hour),
		OrganizerID: "user-1",
		EventType:   "meeting",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, ce.ID)

	fetched, err := svc.GetCalendarEvent(ctx, ce.ID)
	require.NoError(t, err)
	assert.Equal(t, "Team Sync", fetched.Title)

	_, err = svc.GetCalendarEvent(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	events, err := svc.ListCalendarEvents(ctx)
	require.NoError(t, err)
	assert.Len(t, events, 1)

	err = svc.DeleteCalendarEvent(ctx, ce.ID)
	require.NoError(t, err)

	_, err = svc.GetCalendarEvent(ctx, ce.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
}
