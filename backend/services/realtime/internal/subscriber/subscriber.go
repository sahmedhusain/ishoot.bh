// Package subscriber feeds this replica's hub: hints from NATS core subjects, and ended sessions from the EVENTS
// stream (their streams close at once instead of at their next reconnect).
package subscriber

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"platform.local/backend/pkg/live"
	"platform.local/backend/services/realtime/internal/hub"
)

// Dispatch writes one received hint to the hub. The payload must be one JSON event object; it is compacted so it
// fits on one SSE data line.
func Dispatch(h *hub.Hub, subject string, data []byte) int {
	target, ok := live.ParseSubject(subject)
	if !ok || len(data) > live.MaxData+512 {
		return 0
	}
	var ev live.Event
	if err := json.Unmarshal(data, &ev); err != nil || ev.Validate() != nil {
		return 0
	}
	var line bytes.Buffer
	if err := json.Compact(&line, data); err != nil {
		return 0
	}
	if target.Topic != "" {
		return h.ToTopic(target.Topic, line.Bytes())
	}
	return h.ToUser(target.Realm, target.ID, line.Bytes())
}

// Hints subscribes to every live subject until ctx ends. Each replica subscribes on its own (no queue group): every
// replica must see every hint, because each holds different people's streams.
func Hints(ctx context.Context, conn *nats.Conn, h *hub.Hub) error {
	sub, err := conn.Subscribe("live.>", func(m *nats.Msg) { Dispatch(h, m.Subject, m.Data) })
	if err != nil {
		return err
	}
	<-ctx.Done()
	return sub.Unsubscribe()
}

// SessionRevoked is the subject identity announces an ended session on.
const SessionRevoked = "identity.session.revoked"

// Sessions closes the streams of sessions identity revoked, from now on (an ordered consumer: nothing is stored).
func Sessions(ctx context.Context, js jetstream.JetStream, stream string, h *hub.Hub, logger *slog.Logger) error {
	consumer, err := js.OrderedConsumer(ctx, stream, jetstream.OrderedConsumerConfig{
		FilterSubjects: []string{SessionRevoked}, DeliverPolicy: jetstream.DeliverNewPolicy,
	})
	if err != nil {
		return err
	}
	cc, err := consumer.Consume(func(msg jetstream.Msg) {
		var payload struct {
			SessionID string `json:"sessionId"`
		}
		if json.Unmarshal(msg.Data(), &payload) == nil && payload.SessionID != "" {
			if n := h.CloseSession(payload.SessionID); n > 0 {
				logger.InfoContext(ctx, "closed the streams of a revoked session", "streams", n)
			}
		}
	})
	if err != nil {
		return err
	}
	<-ctx.Done()
	cc.Stop()
	return nil
}
