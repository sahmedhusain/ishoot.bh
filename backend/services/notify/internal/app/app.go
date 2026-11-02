// Package app holds the notify service's use cases.
package app

import (
	"context"
	"errors"
	"fmt"
	"mime"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/rivertype"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/notify/internal/postgres"
	"platform.local/backend/services/notify/internal/postgres/sqlcdb"
	"platform.local/backend/services/notify/internal/providers"
)

var (
	// ErrValidation means the message cannot be sent as given.
	ErrValidation = errors.New("validation failed")
	// ErrNotFound means there is no such message (for this caller).
	ErrNotFound = errors.New("message not found")
	// ErrNotFailed means only a failed message can be retried.
	ErrNotFailed = errors.New("message has not failed")
)

// Channels.
const (
	Email    = "email"
	WhatsApp = "whatsapp"
)

// Limits on what a message may carry.
const (
	maxSubject       = 998
	maxText          = 1 << 20
	maxHTML          = 2 << 20
	maxWhatsAppText  = 4096
	maxAttachments   = 10
	maxFilename      = 200
	maxKey           = 200
	maxActor         = 64
	testMessageText  = "This is a test message from the IT dashboard. If it reached you, delivery works."
	testMessageTitle = "Test message"
)

// DeliverArgs asks the worker to deliver one message (River job, ADR 0004).
type DeliverArgs struct {
	ID string `json:"id"`
}

// Kind names the job in River's tables.
func (DeliverArgs) Kind() string { return "notify.deliver" }

// Queue is the River queue delivery runs on.
const Queue = "notify"

// InsertOpts keeps one pending delivery per message; a finished one does not block a retry.
func (DeliverArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true, ByState: []rivertype.JobState{
		rivertype.JobStateAvailable, rivertype.JobStatePending, rivertype.JobStateRunning,
		rivertype.JobStateRetryable, rivertype.JobStateScheduled,
	}}}
}

// Inserter enqueues jobs inside a transaction (river.Client).
type Inserter interface {
	InsertTx(ctx context.Context, tx pgx.Tx, args river.JobArgs, opts *river.InsertOpts) (*rivertype.JobInsertResult, error)
}

// Attachment is a file given with an e-mail.
type Attachment struct {
	Filename    string
	ContentType string
	Content     []byte
}

// Input is a message to queue.
type Input struct {
	Channel        string
	To             string
	Subject        string
	Text           string
	HTML           string
	Attachments    []Attachment
	IdempotencyKey string
	// ActorID is the person the caller acts for, if any.
	ActorID string
}

// AttachmentInfo describes an attachment without its content.
type AttachmentInfo struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

// Message is a message's state.
type Message struct {
	ID          string           `json:"id"`
	Caller      string           `json:"caller"`
	Actor       *string          `json:"actor"`
	Channel     string           `json:"channel"`
	Recipient   string           `json:"recipient"`
	Subject     *string          `json:"subject"`
	Status      string           `json:"status"`
	Attempts    int32            `json:"attempts"`
	Provider    *string          `json:"provider"`
	ProviderID  *string          `json:"providerId"`
	LastError   *string          `json:"lastError"`
	CreatedAt   time.Time        `json:"createdAt"`
	SentAt      *time.Time       `json:"sentAt"`
	Text        *string          `json:"text,omitempty"`
	HTML        *string          `json:"html,omitempty"`
	Attachments []AttachmentInfo `json:"attachments,omitempty"`
}

// Options configures the service.
type Options struct {
	// Senders by channel.
	Senders map[string]providers.Sender
	// MaxAttempts is how many times a transient failure is retried before the message fails.
	MaxAttempts int
	// MaxAttachmentBytes caps the attachments of one message together.
	MaxAttachmentBytes int64
}

// Service implements the use cases.
type Service struct {
	store *postgres.Store
	jobs  Inserter
	opts  Options
	now   func() time.Time
}

// New returns the service. jobs may be nil for a process that only delivers.
func New(store *postgres.Store, jobs Inserter, opts Options) *Service {
	return &Service{store: store, jobs: jobs, opts: opts, now: func() time.Time { return time.Now().UTC() }}
}

// SetJobs sets the job inserter (the River client is built after the service it works for).
func (s *Service) SetJobs(jobs Inserter) { s.jobs = jobs }

func invalid(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrValidation, fmt.Sprintf(format, args...))
}

// normalize checks a message and returns it ready to store.
func (s *Service) normalize(in Input) (Input, error) {
	in.IdempotencyKey = strings.TrimSpace(in.IdempotencyKey)
	if in.IdempotencyKey == "" || len(in.IdempotencyKey) > maxKey {
		return in, invalid("idempotencyKey must have 1 to %d characters", maxKey)
	}
	if len(in.ActorID) > maxActor {
		return in, invalid("actorId is too long")
	}
	switch in.Channel {
	case Email:
		addr, err := mail.ParseAddress(strings.TrimSpace(in.To))
		if err != nil {
			return in, invalid("to is not an e-mail address")
		}
		in.To = addr.Address
		in.Subject = strings.TrimSpace(in.Subject)
		if in.Subject == "" || utf8.RuneCountInString(in.Subject) > maxSubject || strings.ContainsAny(in.Subject, "\r\n") {
			return in, invalid("an e-mail needs a one-line subject of up to %d characters", maxSubject)
		}
		if in.Text == "" && in.HTML == "" {
			return in, invalid("an e-mail needs text or html")
		}
		if len(in.Text) > maxText || len(in.HTML) > maxHTML {
			return in, invalid("the body is too large")
		}
		if len(in.Attachments) > maxAttachments {
			return in, invalid("at most %d attachments", maxAttachments)
		}
		var total int64
		for i, a := range in.Attachments {
			a.Filename = strings.TrimSpace(a.Filename)
			if a.Filename == "" || len(a.Filename) > maxFilename || strings.ContainsAny(a.Filename, "/\\\r\n\"") {
				return in, invalid("attachment %d needs a plain file name", i+1)
			}
			if a.ContentType == "" {
				a.ContentType = "application/octet-stream"
			}
			if _, _, err := mime.ParseMediaType(a.ContentType); err != nil {
				return in, invalid("attachment %d has an invalid content type", i+1)
			}
			total += int64(len(a.Content))
			in.Attachments[i] = a
		}
		if total > s.opts.MaxAttachmentBytes {
			return in, invalid("attachments exceed %d bytes", s.opts.MaxAttachmentBytes)
		}
	case WhatsApp:
		digits := strings.Map(func(r rune) rune {
			switch {
			case r >= '0' && r <= '9':
				return r
			case r == '+' || r == ' ' || r == '-' || r == '(' || r == ')':
				return -1
			}
			return 'x'
		}, in.To)
		if strings.Contains(digits, "x") || len(digits) < 8 || len(digits) > 15 {
			return in, invalid("to must be a phone number with its country code")
		}
		in.To = digits
		if in.Text == "" || utf8.RuneCountInString(in.Text) > maxWhatsAppText {
			return in, invalid("a WhatsApp message needs text of up to %d characters", maxWhatsAppText)
		}
		if in.Subject != "" || in.HTML != "" || len(in.Attachments) > 0 {
			return in, invalid("a WhatsApp message carries text only")
		}
	default:
		return in, invalid("channel must be email or whatsapp")
	}
	return in, nil
}

func optional(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}

// Queue stores a message and its delivery job. The same caller and idempotency key return the first message
// (duplicate true) without sending it again.
func (s *Service) Queue(ctx context.Context, caller string, in Input) (Message, bool, error) {
	in, err := s.normalize(in)
	if err != nil {
		return Message{}, false, err
	}
	id := uuid.NewString()
	duplicate := false
	err = s.store.Tx(ctx, func(q *sqlcdb.Queries, tx pgx.Tx) error {
		n, err := q.InsertMessage(ctx, sqlcdb.InsertMessageParams{
			ID: id, Caller: caller, IdempotencyKey: in.IdempotencyKey, Actor: optional(in.ActorID), Channel: in.Channel,
			Recipient: in.To, Subject: optional(in.Subject), BodyText: optional(in.Text), BodyHtml: optional(in.HTML),
		})
		if err != nil {
			return err
		}
		if n == 0 {
			existing, err := q.MessageByKey(ctx, sqlcdb.MessageByKeyParams{Caller: caller, IdempotencyKey: in.IdempotencyKey})
			if err != nil {
				return err
			}
			id, duplicate = existing.ID, true
			return nil
		}
		for i, a := range in.Attachments {
			if err := q.InsertAttachment(ctx, sqlcdb.InsertAttachmentParams{
				MessageID: id, Position: int32(i), Filename: a.Filename, ContentType: a.ContentType, Content: a.Content,
			}); err != nil {
				return err
			}
		}
		_, err = s.jobs.InsertTx(ctx, tx, DeliverArgs{ID: id}, nil)
		return err
	})
	if err != nil {
		return Message{}, false, err
	}
	msg, err := s.message(ctx, id, false)
	return msg, duplicate, err
}

// Deliver sends a queued message once (the worker's job). A transient failure returns an error so the job is retried,
// until the last attempt; a permanent one fails the message at once. Each final outcome is announced as an event.
func (s *Service) Deliver(ctx context.Context, id string, attempt int) error {
	m, err := s.store.GetMessage(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // removed in the meantime: nothing to send
	}
	if err != nil {
		return err
	}
	if m.Status != "queued" {
		return nil // delivered or failed already (a duplicate job)
	}
	sender, ok := s.opts.Senders[m.Channel]
	if !ok {
		return s.fail(ctx, m, "", providers.Permanent("no sender for %s", m.Channel))
	}
	msg := providers.Message{ID: m.ID, To: m.Recipient}
	if m.Subject != nil {
		msg.Subject = *m.Subject
	}
	if m.BodyText != nil {
		msg.Text = *m.BodyText
	}
	if m.BodyHtml != nil {
		msg.HTML = *m.BodyHtml
	}
	files, err := s.store.Attachments(ctx, m.ID)
	if err != nil {
		return err
	}
	for _, f := range files {
		msg.Attachments = append(msg.Attachments, providers.Attachment{Filename: f.Filename, ContentType: f.ContentType, Content: f.Content})
	}
	result, sendErr := sender.Send(ctx, msg)
	if sendErr == nil {
		now := s.now()
		return s.store.Tx(ctx, func(q *sqlcdb.Queries, tx pgx.Tx) error {
			if err := q.MarkSent(ctx, sqlcdb.MarkSentParams{ID: m.ID, Provider: &result.Provider, ProviderID: &result.ProviderID, Now: &now}); err != nil {
				return err
			}
			return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: EventSent, Payload: outcome(m, result.Provider, "")})
		})
	}
	if providers.IsPermanent(sendErr) || attempt >= s.opts.MaxAttempts {
		return s.fail(ctx, m, result.Provider, sendErr)
	}
	reason := truncate(sendErr.Error(), 500)
	if err := s.store.MarkAttempt(ctx, sqlcdb.MarkAttemptParams{ID: m.ID, Provider: optional(result.Provider), LastError: &reason, Now: s.now()}); err != nil {
		return errors.Join(sendErr, err)
	}
	return sendErr
}

func (s *Service) fail(ctx context.Context, m sqlcdb.NotifyMessage, provider string, cause error) error {
	reason := truncate(cause.Error(), 500)
	return s.store.Tx(ctx, func(q *sqlcdb.Queries, tx pgx.Tx) error {
		if err := q.MarkFailed(ctx, sqlcdb.MarkFailedParams{ID: m.ID, Provider: optional(provider), LastError: &reason, Now: s.now()}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: EventFailed, Payload: outcome(m, provider, reason)})
	})
}

// Retry queues a failed message again (IT). by names who asked.
func (s *Service) Retry(ctx context.Context, id, by string) (Message, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Message{}, ErrNotFound
	}
	err := s.store.Tx(ctx, func(q *sqlcdb.Queries, tx pgx.Tx) error {
		m, err := q.LockMessage(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		n, err := q.Requeue(ctx, sqlcdb.RequeueParams{ID: id, Now: s.now()})
		if err != nil {
			return err
		}
		if n == 0 {
			return ErrNotFailed
		}
		if _, err := s.jobs.InsertTx(ctx, tx, DeliverArgs{ID: id}, nil); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{Subject: EventRetried,
			Payload: Retried{MessageID: id, Channel: m.Channel, ChangedBy: by}})
	})
	if err != nil {
		return Message{}, err
	}
	return s.message(ctx, id, true)
}

// SendTest queues a short test message from IT to the address or number given.
func (s *Service) SendTest(ctx context.Context, channel, to, itAccount string) (Message, error) {
	in := Input{Channel: channel, To: to, Text: testMessageText, IdempotencyKey: "test:" + uuid.NewString(), ActorID: itAccount}
	if channel == Email {
		in.Subject = testMessageTitle
	}
	m, _, err := s.Queue(ctx, "it", in)
	return m, err
}

// ForCaller returns a message the caller queued.
func (s *Service) ForCaller(ctx context.Context, caller, id string) (Message, error) {
	m, err := s.message(ctx, id, false)
	if err != nil {
		return Message{}, err
	}
	if m.Caller != caller {
		return Message{}, ErrNotFound
	}
	return m, nil
}

// Detail returns a message with its bodies and attachment names (IT).
func (s *Service) Detail(ctx context.Context, id string) (Message, error) {
	return s.message(ctx, id, true)
}

func (s *Service) message(ctx context.Context, id string, detail bool) (Message, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Message{}, ErrNotFound
	}
	m, err := s.store.GetMessage(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Message{}, ErrNotFound
	}
	if err != nil {
		return Message{}, err
	}
	out := view(m)
	if detail {
		out.Text, out.HTML = m.BodyText, m.BodyHtml
		names, err := s.store.AttachmentNames(ctx, id)
		if err != nil {
			return Message{}, err
		}
		for _, n := range names {
			out.Attachments = append(out.Attachments, AttachmentInfo{Filename: n.Filename, ContentType: n.ContentType, Size: n.Size})
		}
	}
	return out, nil
}

// ListQuery narrows a listing.
type ListQuery struct {
	Status, Channel string
	BeforeCreated   time.Time
	BeforeID        string
	Limit           int32
}

// List returns one page of messages, newest first (IT).
func (s *Service) List(ctx context.Context, q ListQuery) ([]Message, error) {
	before := q.BeforeID
	if before == "" {
		before = uuid.Nil.String()
	}
	rows, err := s.store.ListMessages(ctx, sqlcdb.ListMessagesParams{
		Status: optional(q.Status), Channel: optional(q.Channel), HasCursor: q.BeforeID != "",
		BeforeCreated: q.BeforeCreated, BeforeID: before, PageSize: q.Limit,
	})
	if err != nil {
		return nil, err
	}
	out := make([]Message, len(rows))
	for i, r := range rows {
		out[i] = view(r)
	}
	return out, nil
}

// Count is how many messages of one status and channel there were.
type Count struct {
	Status   string `json:"status"`
	Channel  string `json:"channel"`
	Messages int64  `json:"messages"`
}

// Counts returns the last day's messages by status and channel.
func (s *Service) Counts(ctx context.Context) ([]Count, error) {
	rows, err := s.store.CountByStatus(ctx, s.now().Add(-24*time.Hour))
	if err != nil {
		return nil, err
	}
	out := make([]Count, len(rows))
	for i, r := range rows {
		out[i] = Count{Status: r.Status, Channel: r.Channel, Messages: r.Messages}
	}
	return out, nil
}

func view(m sqlcdb.NotifyMessage) Message {
	return Message{ID: m.ID, Caller: m.Caller, Actor: m.Actor, Channel: m.Channel, Recipient: m.Recipient, Subject: m.Subject,
		Status: m.Status, Attempts: m.Attempts, Provider: m.Provider, ProviderID: m.ProviderID, LastError: m.LastError,
		CreatedAt: m.CreatedAt.UTC(), SentAt: utc(m.SentAt)}
}

func utc(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	u := t.UTC()
	return &u
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
