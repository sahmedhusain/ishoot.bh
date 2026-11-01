// Package natsx connects services to NATS JetStream (ADR 0003): the events stream, a publisher for the outbox relay
// and durable consumers for the services that react to events.
package natsx

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/outbox"
)

// Config is embedded in a service config with envPrefix:"NATS_".
type Config struct {
	// URL of the NATS server; empty disables publishing (events wait in the outbox).
	URL string `env:"URL"`
	// Stream is the JetStream stream every service's events go to.
	Stream string `env:"STREAM" envDefault:"EVENTS" validate:"required"`
	// Subjects the stream stores: one "<service>.>" per service (a catch-all would overlap JetStream's own API).
	Subjects []string `env:"SUBJECTS" envDefault:"files.>,identity.>,system.>,audit.>,notify.>,itsm.>,cms.>,sales.>,finance.>,workflow.>,hr.>,inventory.>,commerce.>,delivery.>" envSeparator:"," validate:"min=1,dive,required"`
	// Replicas of the stream (1 locally, 3 in a cluster).
	Replicas int `env:"REPLICAS" envDefault:"1" validate:"gte=1,lte=5"`
	// MaxAge is how long the stream keeps events.
	MaxAge time.Duration `env:"MAX_AGE" envDefault:"168h" validate:"gt=0"`
	// DuplicateWindow is how long JetStream remembers event IDs to drop re-sends.
	DuplicateWindow time.Duration `env:"DUPLICATE_WINDOW" envDefault:"2h" validate:"gt=0"`
	// PublishTimeout bounds one publish.
	PublishTimeout time.Duration `env:"PUBLISH_TIMEOUT" envDefault:"5s" validate:"gt=0"`
	// CredentialsFile is a NATS credentials file (production); empty connects without one.
	CredentialsFile string `env:"CREDENTIALS_FILE"`
}

// Configured reports whether a server is set.
func (c Config) Configured() bool { return c.URL != "" }

// Client is a connection with JetStream.
type Client struct {
	Conn *nats.Conn
	JS   jetstream.JetStream
	cfg  Config
}

// Connect connects and makes sure the events stream exists with the configured subjects and limits.
func Connect(ctx context.Context, cfg Config, name string, logger *slog.Logger) (*Client, error) {
	if !cfg.Configured() {
		return nil, errors.New("natsx: NATS_URL is not set")
	}
	opts := []nats.Option{
		nats.Name(name),
		nats.MaxReconnects(-1),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			if err != nil {
				logger.Warn("nats disconnected", "error", err)
			}
		}),
		nats.ReconnectHandler(func(*nats.Conn) { logger.Info("nats reconnected") }),
	}
	if cfg.CredentialsFile != "" {
		opts = append(opts, nats.UserCredentials(cfg.CredentialsFile))
	}
	conn, err := nats.Connect(cfg.URL, opts...)
	if err != nil {
		return nil, fmt.Errorf("natsx: connect: %w", err)
	}
	js, err := jetstream.New(conn)
	if err != nil {
		conn.Close()
		return nil, err
	}
	if _, err := js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:       cfg.Stream,
		Subjects:   cfg.Subjects,
		Storage:    jetstream.FileStorage,
		Retention:  jetstream.LimitsPolicy,
		Replicas:   cfg.Replicas,
		MaxAge:     cfg.MaxAge,
		Duplicates: cfg.DuplicateWindow,
	}); err != nil {
		conn.Close()
		return nil, fmt.Errorf("natsx: stream %s: %w", cfg.Stream, err)
	}
	return &Client{Conn: conn, JS: js, cfg: cfg}, nil
}

// Close drains the connection.
func (c *Client) Close() { _ = c.Conn.Drain() }

// Check is a readiness check for the connection.
func (c *Client) Check() health.Check {
	return func(context.Context) error {
		if c.Conn.Status() != nats.CONNECTED {
			return fmt.Errorf("nats: %s", c.Conn.Status())
		}
		return nil
	}
}

// Publish implements outbox.Publisher: the event ID is the message ID, so JetStream drops a re-sent event.
func (c *Client) Publish(ctx context.Context, msg outbox.Message) error {
	ctx, cancel := context.WithTimeout(ctx, c.cfg.PublishTimeout)
	defer cancel()
	m := nats.NewMsg(msg.Subject)
	m.Data = msg.Data
	for k, v := range msg.Headers {
		m.Header.Set(k, v)
	}
	_, err := c.JS.PublishMsg(ctx, m, jetstream.WithMsgID(msg.ID))
	return err
}

// Handler handles one delivered event. Returning an error asks for redelivery after the consumer's back-off.
type Handler func(ctx context.Context, msg jetstream.Msg) error

// Consume runs a durable consumer of the subjects until ctx ends. Each message is acknowledged after the handler
// succeeds; handlers must be idempotent (outbox.Handled), as delivery is at least once.
func (c *Client) Consume(ctx context.Context, durable string, subjects []string, handle Handler, logger *slog.Logger) error {
	consumer, err := c.JS.CreateOrUpdateConsumer(ctx, c.cfg.Stream, jetstream.ConsumerConfig{
		Durable:        durable,
		FilterSubjects: subjects,
		AckPolicy:      jetstream.AckExplicitPolicy,
		DeliverPolicy:  jetstream.DeliverAllPolicy,
		MaxDeliver:     -1,
		BackOff:        []time.Duration{time.Second, 5 * time.Second, 30 * time.Second, 2 * time.Minute},
	})
	if err != nil {
		return fmt.Errorf("natsx: consumer %s: %w", durable, err)
	}
	cc, err := consumer.Consume(func(msg jetstream.Msg) {
		if err := handle(ctx, msg); err != nil {
			logger.ErrorContext(ctx, "event handler", "consumer", durable, "subject", msg.Subject(), "error", err)
			_ = msg.Nak()
			return
		}
		_ = msg.Ack()
	})
	if err != nil {
		return err
	}
	<-ctx.Done()
	cc.Stop()
	return nil
}

// EventID is the ID the outbox gave the event (its JetStream message ID).
func EventID(msg jetstream.Msg) string { return msg.Headers().Get(jetstream.MsgIDHeader) }
