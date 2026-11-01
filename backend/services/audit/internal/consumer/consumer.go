// Package consumer feeds the audit trail from the EVENTS stream (ADR 0003): a durable consumer of every subject.
package consumer

import (
	"context"
	"log/slog"

	"github.com/nats-io/nats.go/jetstream"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"

	"platform.local/backend/pkg/natsx"
	"platform.local/backend/services/audit/internal/app"
)

// Durable is the consumer's name in JetStream; its position survives restarts.
const Durable = "audit"

// Consumer records every delivered event.
type Consumer struct {
	svc      *app.Service
	logger   *slog.Logger
	recorded prometheus.Counter
	repeated prometheus.Counter
}

// New returns a consumer; registry receives its counters.
func New(svc *app.Service, logger *slog.Logger, registry prometheus.Registerer) (*Consumer, error) {
	c := &Consumer{
		svc: svc, logger: logger,
		recorded: prometheus.NewCounter(prometheus.CounterOpts{Name: "audit_events_recorded_total", Help: "Events added to the audit trail."}),
		repeated: prometheus.NewCounter(prometheus.CounterOpts{Name: "audit_events_redelivered_total", Help: "Deliveries of events already recorded."}),
	}
	for _, m := range []prometheus.Collector{c.recorded, c.repeated} {
		if err := registry.Register(m); err != nil {
			return nil, err
		}
	}
	return c, nil
}

// Run consumes until ctx ends.
func (c *Consumer) Run(ctx context.Context, client *natsx.Client) error {
	return client.Consume(ctx, Durable, nil, c.Handle, c.logger)
}

// Handle records one message. An error asks JetStream to deliver it again later.
func (c *Consumer) Handle(ctx context.Context, msg jetstream.Msg) error {
	headers := propagation.HeaderCarrier(msg.Headers())
	ctx = otel.GetTextMapPropagator().Extract(ctx, headers)
	in := app.Incoming{ID: natsx.EventID(msg), Subject: msg.Subject(), Data: msg.Data(), Traceparent: msg.Headers().Get("traceparent")}
	if meta, err := msg.Metadata(); err == nil {
		in.OccurredAt, in.Stream, in.Sequence = meta.Timestamp, meta.Stream, meta.Sequence.Stream
	}
	isNew, err := c.svc.Record(ctx, in)
	if err != nil {
		return err
	}
	if isNew {
		c.recorded.Inc()
	} else {
		c.repeated.Inc()
	}
	return nil
}
