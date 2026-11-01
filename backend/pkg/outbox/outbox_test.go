package outbox_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/pkg/testkit"
)

type fakePublisher struct {
	mu   sync.Mutex
	sent []outbox.Message
	fail bool
}

func (f *fakePublisher) Publish(_ context.Context, msg outbox.Message) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.fail {
		return errors.New("broker down")
	}
	f.sent = append(f.sent, msg)
	return nil
}

func setup(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	_, err = pool.Exec(ctx, `CREATE SCHEMA demo; CREATE TABLE demo.thing (id int PRIMARY KEY);`+outbox.DDL("demo"))
	require.NoError(t, err)
	return pool
}

func TestOutbox(t *testing.T) {
	ctx := context.Background()
	pool := setup(t)
	pub := &fakePublisher{}
	relay, err := outbox.NewRelay(pool, outbox.RelayOptions{Schema: "demo", Publisher: pub, Batch: 10})
	require.NoError(t, err)

	// An event is written with its change, and nothing at all when the change rolls back.
	require.NoError(t, db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `INSERT INTO demo.thing VALUES (1)`); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "demo", outbox.Event{Subject: "demo.thing.created", Payload: map[string]int{"id": 1}})
	}))
	require.Error(t, db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if err := outbox.Enqueue(ctx, tx, "demo", outbox.Event{Subject: "demo.thing.created", Payload: 2}); err != nil {
			return err
		}
		return errors.New("use case failed")
	}))
	require.ErrorIs(t, db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		return outbox.Enqueue(ctx, tx, "demo", outbox.Event{Subject: "Bad Subject"})
	}), outbox.ErrInvalidSubject)

	// The broker is down: the event stays pending and is retried later.
	pub.fail = true
	n, err := relay.Once(ctx)
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	var attempts int
	var lastError string
	require.NoError(t, pool.QueryRow(ctx, `SELECT attempts, last_error FROM demo.outbox`).Scan(&attempts, &lastError))
	assert.Equal(t, 1, attempts)
	assert.Equal(t, "broker down", lastError)
	n, err = relay.Once(ctx)
	require.NoError(t, err)
	assert.Zero(t, n, "not due again until the back-off has passed")

	// The broker is back: once due, the event is published and marked.
	pub.fail = false
	_, err = pool.Exec(ctx, `UPDATE demo.outbox SET next_try_at = now() - interval '1 second'`)
	require.NoError(t, err)
	n, err = relay.Once(ctx)
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	require.Len(t, pub.sent, 1)
	assert.Equal(t, "demo.thing.created", pub.sent[0].Subject)
	assert.JSONEq(t, `{"id":1}`, string(pub.sent[0].Data))
	assert.NotEmpty(t, pub.sent[0].ID)
	n, err = relay.Once(ctx)
	require.NoError(t, err)
	assert.Zero(t, n, "a published event is not sent again")

	// Consumers record what they handled; a redelivery is recognised.
	id := pub.sent[0].ID
	for i, want := range []bool{true, false} {
		require.NoError(t, db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
			first, err := outbox.Handled(ctx, tx, "demo", "audit", id)
			assert.Equal(t, want, first, "delivery %d", i+1)
			return err
		}))
	}

	// Published rows are purged after the retention.
	purger, err := outbox.NewRelay(pool, outbox.RelayOptions{Schema: "demo", Publisher: pub, Retention: time.Minute})
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE demo.outbox SET published_at = now() - interval '2 minutes'`)
	require.NoError(t, err)
	purged, err := purger.Purge(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(1), purged)
}

// Two relays on one schema never publish the same row twice.
func TestConcurrentRelays(t *testing.T) {
	ctx := context.Background()
	pool := setup(t)
	require.NoError(t, db.WithTx(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		events := make([]outbox.Event, 50)
		for i := range events {
			events[i] = outbox.Event{Subject: "demo.thing.created", Payload: i}
		}
		return outbox.Enqueue(ctx, tx, "demo", events...)
	}))
	pub := &fakePublisher{}
	var wg sync.WaitGroup
	for range 3 {
		relay, err := outbox.NewRelay(pool, outbox.RelayOptions{Schema: "demo", Publisher: pub, Batch: 7})
		require.NoError(t, err)
		wg.Go(func() {
			for {
				n, err := relay.Once(ctx)
				assert.NoError(t, err)
				if n == 0 {
					return
				}
			}
		})
	}
	wg.Wait()
	seen := map[string]bool{}
	for _, m := range pub.sent {
		assert.False(t, seen[m.ID], "published twice: %s", m.ID)
		seen[m.ID] = true
	}
	assert.Len(t, seen, 50)
}
