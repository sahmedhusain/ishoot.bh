package natsx_test
import (
	"context"
	"log/slog"
	"sync"
	"testing"
	"time"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	tcnats "github.com/testcontainers/testcontainers-go/modules/nats"
	"platform.local/backend/pkg/natsx"
	"platform.local/backend/pkg/outbox"
)
func TestPublishAndConsume(t *testing.T) {
	if testing.Short() {
		t.Skip("integration test: needs Docker")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	container, err := tcnats.Run(ctx, "nats:2.12-alpine")
	require.NoError(t, err)
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })
	url, err := container.ConnectionString(ctx)
	require.NoError(t, err)
	client, err := natsx.Connect(ctx, natsx.Config{URL: url, Stream: "EVENTS", Subjects: []string{"demo.>"}, Replicas: 1,
		MaxAge:	time.Hour, DuplicateWindow: time.Minute, PublishTimeout: 5 * time.Second}, "test", slog.Default())
	require.NoError(t, err)
	defer client.Close()
	require.NoError(t, client.Check()(ctx))
	msg := outbox.Message{ID: "0b6c1f0e-1d0f-4e57-9e7e-8a0f3c1b2a11", Subject: "demo.thing.created", Data: []byte(`{"id":1}`),
		Headers:	map[string]string{"traceparent": "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"}}
	require.NoError(t, client.Publish(ctx, msg))
	require.NoError(t, client.Publish(ctx, msg), "a re-sent event is accepted")
	info, err := client.JS.Stream(ctx, "EVENTS")
	require.NoError(t, err)
	state, err := info.Info(ctx)
	require.NoError(t, err)
	assert.Equal(t, uint64(1), state.State.Msgs, "and stored once")
	var mu sync.Mutex
	var got []string
	done := make(chan struct{})
	go func() {
		_ = client.Consume(ctx, "audit", []string{"demo.>"}, func(_ context.Context, m jetstream.Msg) error {
			mu.Lock()
			defer mu.Unlock()
			got = append(got, natsx.EventID(m)+" "+m.Headers().Get("traceparent"))
			if len(got) == 1 {
				close(done)
			}
			return nil
		}, slog.Default())
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("no event delivered")
	}
	mu.Lock()
	defer mu.Unlock()
	assert.Equal(t, msg.ID+" "+msg.Headers["traceparent"], got[0])
}
