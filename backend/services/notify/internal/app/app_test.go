package app_test
import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/notify/internal/app"
	"platform.local/backend/services/notify/internal/jobs"
	"platform.local/backend/services/notify/internal/postgres"
	"platform.local/backend/services/notify/internal/providers"
	"platform.local/backend/services/notify/migrations"
)
type fakeSender struct {
	mu	sync.Mutex
	err	error
	sent	[]providers.Message
}
func (f *fakeSender) Send(_ context.Context, msg providers.Message) (providers.Result, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.err != nil {
		return providers.Result{Provider: "fake"}, f.err
	}
	f.sent = append(f.sent, msg)
	return providers.Result{Provider: "fake", ProviderID: "p-" + msg.ID}, nil
}
func (f *fakeSender) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.sent)
}
func setup(t *testing.T) (*pgxpool.Pool, *fakeSender, *app.Service, jobs.Options) {
	t.Helper()
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, WithRiver: true, Logger: logger}))
	sender := &fakeSender{}
	svc := app.New(postgres.New(pool), nil, app.Options{
		Senders:	map[string]providers.Sender{app.Email: sender, app.WhatsApp: sender}, MaxAttempts: 3, MaxAttachmentBytes: 1024,
	})
	opts := jobs.Options{Schema: postgres.Schema, Workers: 2, MaxAttempts: 3, SendTimeout: 5 * time.Second, Logger: logger}
	inserter, err := jobs.NewClient(pool, nil, opts)
	require.NoError(t, err)
	svc.SetJobs(inserter)
	return pool, sender, svc, opts
}
func events(t *testing.T, pool *pgxpool.Pool) []string {
	t.Helper()
	rows, err := pool.Query(context.Background(), `SELECT subject FROM notify.outbox ORDER BY created_at, id`)
	require.NoError(t, err)
	defer rows.Close()
	var out []string
	for rows.Next() {
		var s string
		require.NoError(t, rows.Scan(&s))
		out = append(out, s)
	}
	return out
}
func TestQueueAndDeliver(t *testing.T) {
	ctx := context.Background()
	pool, sender, svc, _ := setup(t)
	email := app.Input{Channel: app.Email, To: "Client <client@example.com>", Subject: "Quotation", HTML: "<p>Hi</p>",
		IdempotencyKey:	"quote-1", ActorID: "staff-7",
		Attachments:	[]app.Attachment{{Filename: "quote.pdf", ContentType: "application/pdf", Content: []byte("pdf")}}}
	m, duplicate, err := svc.Queue(ctx, "admin", email)
	require.NoError(t, err)
	assert.False(t, duplicate)
	assert.Equal(t, "queued", m.Status)
	assert.Equal(t, "client@example.com", m.Recipient)
	again, duplicate, err := svc.Queue(ctx, "admin", email)
	require.NoError(t, err)
	assert.True(t, duplicate, "the same key is the same message")
	assert.Equal(t, m.ID, again.ID)
	other, duplicate, err := svc.Queue(ctx, "web", email)
	require.NoError(t, err)
	assert.False(t, duplicate, "keys belong to their caller")
	assert.NotEqual(t, m.ID, other.ID)
	var jobsQueued int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM notify.river_job WHERE kind = 'notify.deliver'`).Scan(&jobsQueued))
	assert.Equal(t, 2, jobsQueued, "one delivery per message, queued with it")
	require.NoError(t, svc.Deliver(ctx, m.ID, 1))
	sent, err := svc.Detail(ctx, m.ID)
	require.NoError(t, err)
	assert.Equal(t, "sent", sent.Status)
	assert.Equal(t, "p-"+m.ID, *sent.ProviderID)
	require.Len(t, sent.Attachments, 1)
	assert.Equal(t, int64(3), sent.Attachments[0].Size)
	require.Len(t, sender.sent, 1)
	assert.Equal(t, "quote.pdf", sender.sent[0].Attachments[0].Filename)
	require.NoError(t, svc.Deliver(ctx, m.ID, 1))
	assert.Len(t, sender.sent, 1, "a sent message is never sent again")
	assert.Equal(t, []string{app.EventSent}, events(t, pool))
	wa, _, err := svc.Queue(ctx, "admin", app.Input{Channel: app.WhatsApp, To: "+973 3300-0001", Text: "Hi", IdempotencyKey: "wa-1"})
	require.NoError(t, err)
	assert.Equal(t, "97333000001", wa.Recipient)
	sender.err = errors.New("timeout")
	require.Error(t, svc.Deliver(ctx, wa.ID, 1))
	state, err := svc.Detail(ctx, wa.ID)
	require.NoError(t, err)
	assert.Equal(t, "queued", state.Status)
	assert.Equal(t, "timeout", *state.LastError)
	require.NoError(t, svc.Deliver(ctx, wa.ID, 3), "the last attempt fails the message instead of retrying")
	state, err = svc.Detail(ctx, wa.ID)
	require.NoError(t, err)
	assert.Equal(t, "failed", state.Status)
	assert.Equal(t, int32(2), state.Attempts)
	sender.err = providers.Permanent("recipient refused")
	refused, _, err := svc.Queue(ctx, "admin", app.Input{Channel: app.WhatsApp, To: "97333000400", Text: "Hi", IdempotencyKey: "wa-2"})
	require.NoError(t, err)
	require.NoError(t, svc.Deliver(ctx, refused.ID, 1))
	state, err = svc.Detail(ctx, refused.ID)
	require.NoError(t, err)
	assert.Equal(t, "failed", state.Status)
	sender.err = nil
	retried, err := svc.Retry(ctx, refused.ID, "it:alice")
	require.NoError(t, err)
	assert.Equal(t, "queued", retried.Status)
	_, err = svc.Retry(ctx, refused.ID, "it:alice")
	assert.ErrorIs(t, err, app.ErrNotFailed)
	require.NoError(t, svc.Deliver(ctx, refused.ID, 1))
	state, err = svc.Detail(ctx, refused.ID)
	require.NoError(t, err)
	assert.Equal(t, "sent", state.Status)
	assert.Equal(t, []string{app.EventSent, app.EventFailed, app.EventFailed, app.EventRetried, app.EventSent}, events(t, pool))
	_, err = svc.ForCaller(ctx, "web", m.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
	for name, in := range map[string]app.Input{
		"no key":		{Channel: app.Email, To: "a@example.com", Subject: "s", Text: "t"},
		"bad address":		{Channel: app.Email, To: "nobody", Subject: "s", Text: "t", IdempotencyKey: "k"},
		"no subject":		{Channel: app.Email, To: "a@example.com", Text: "t", IdempotencyKey: "k"},
		"two-line subject":	{Channel: app.Email, To: "a@example.com", Subject: "a\r\nBcc: x@example.com", Text: "t", IdempotencyKey: "k"},
		"no body":		{Channel: app.Email, To: "a@example.com", Subject: "s", IdempotencyKey: "k"},
		"path in filename":	{Channel: app.Email, To: "a@example.com", Subject: "s", Text: "t", IdempotencyKey: "k", Attachments: []app.Attachment{{Filename: "../x", Content: []byte("x")}}},
		"attachments big":	{Channel: app.Email, To: "a@example.com", Subject: "s", Text: "t", IdempotencyKey: "k", Attachments: []app.Attachment{{Filename: "x", Content: make([]byte, 2048)}}},
		"short number":		{Channel: app.WhatsApp, To: "1234", Text: "t", IdempotencyKey: "k"},
		"letters in number":	{Channel: app.WhatsApp, To: "97333abc001", Text: "t", IdempotencyKey: "k"},
		"html on whatsapp":	{Channel: app.WhatsApp, To: "97333000001", Text: "t", HTML: "<b>", IdempotencyKey: "k"},
		"unknown channel":	{Channel: "sms", To: "97333000001", Text: "t", IdempotencyKey: "k"},
	} {
		_, _, err := svc.Queue(ctx, "admin", in)
		assert.ErrorIs(t, err, app.ErrValidation, name)
	}
}
func TestWorkerDelivers(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	pool, sender, svc, opts := setup(t)
	client, err := jobs.NewClient(pool, svc, opts)
	require.NoError(t, err)
	require.NoError(t, client.Start(ctx))
	defer func() { _ = client.Stop(context.Background()) }()
	m, _, err := svc.Queue(ctx, "it", app.Input{Channel: app.Email, To: "it@example.com", Subject: "s", Text: "t", IdempotencyKey: "k"})
	require.NoError(t, err)
	require.Eventually(t, func() bool {
		state, err := svc.Detail(ctx, m.ID)
		return err == nil && state.Status == "sent"
	}, 15*time.Second, 100*time.Millisecond)
	assert.Equal(t, 1, sender.count())
}
func TestEmailRetentionScrubsContentAndKeepsDeliveryEvidence(t *testing.T) {
	ctx := context.Background()
	pool, _, svc, _ := setup(t)
	old, _, err := svc.Queue(ctx, "admin", app.Input{
		Channel:	app.Email, To: "private@example.com", Subject: "Private subject", Text: "Private body",
		IdempotencyKey:	"retention-old", ActorID: "staff-1",
		Attachments:	[]app.Attachment{{Filename: "proof.pdf", ContentType: "application/pdf", Content: []byte("proof")}},
	})
	require.NoError(t, err)
	require.NoError(t, svc.Deliver(ctx, old.ID, 1))
	recent, _, err := svc.Queue(ctx, "web", app.Input{
		Channel:	app.Email, To: "recent@example.com", Subject: "Recent subject", Text: "Recent body",
		IdempotencyKey:	"retention-recent-sent",
	})
	require.NoError(t, err)
	require.NoError(t, svc.Deliver(ctx, recent.ID, 1))
	_, err = pool.Exec(ctx, `UPDATE notify.message SET sent_at = now() - interval '31 days' WHERE id = $1`, old.ID)
	require.NoError(t, err)
	removed, err := svc.PurgeEmailContent(ctx, 30*24*time.Hour)
	require.NoError(t, err)
	assert.EqualValues(t, 1, removed)
	purged, err := svc.Detail(ctx, old.ID)
	require.NoError(t, err)
	assert.Equal(t, "sent", purged.Status)
	assert.Equal(t, "fake", *purged.Provider)
	assert.Equal(t, "p-"+old.ID, *purged.ProviderID)
	assert.Equal(t, int32(1), purged.Attempts)
	assert.Empty(t, purged.Recipient)
	assert.Nil(t, purged.Subject)
	assert.Nil(t, purged.Text)
	assert.Nil(t, purged.HTML)
	assert.Empty(t, purged.Attachments)
	var attachmentCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM notify.attachment WHERE message_id=$1`, old.ID).Scan(&attachmentCount))
	assert.Zero(t, attachmentCount)
	kept, err := svc.Detail(ctx, recent.ID)
	require.NoError(t, err)
	assert.Equal(t, "recent@example.com", kept.Recipient)
	assert.Equal(t, "Recent subject", *kept.Subject)
	assert.Equal(t, "Recent body", *kept.Text)
	removed, err = svc.PurgeEmailContent(ctx, 30*24*time.Hour)
	require.NoError(t, err)
	assert.Zero(t, removed, "scrubbed records are not repeatedly modified")
}
