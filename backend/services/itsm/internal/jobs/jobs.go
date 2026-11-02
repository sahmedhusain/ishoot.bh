// Package jobs runs the itsm service's background work on River (ADR 0004).
package jobs

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"

	"platform.local/backend/services/itsm/internal/app"
	"platform.local/backend/services/itsm/internal/domain"
	"platform.local/backend/services/itsm/internal/notifyclient"
)

// Queue is the River queue the service's jobs run on.
const Queue = domain.Queue

// BreachArgs asks for open tickets past their resolve/response deadline to be flagged.
type BreachArgs struct{}

// Kind names the job in River's tables.
func (BreachArgs) Kind() string { return "itsm.mark_sla_breaches" }

// InsertOpts keeps at most one sweep waiting at a time.
func (BreachArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

// BreachWorker flags breached tickets.
type BreachWorker struct {
	river.WorkerDefaults[BreachArgs]
	Service *app.Service
	Logger  *slog.Logger
}

// Work runs one breach sweep.
func (w *BreachWorker) Work(ctx context.Context, _ *river.Job[BreachArgs]) error {
	n, err := w.Service.MarkBreached(ctx)
	if n > 0 {
		w.Logger.InfoContext(ctx, "tickets past their SLA", "count", n)
	}
	return err
}

// ReminderArgs sweeps for open tickets approaching their SLA deadline.
type ReminderArgs struct{}

// Kind names the job in River's tables.
func (ReminderArgs) Kind() string { return "itsm.check_sla_reminders" }

// InsertOpts keeps at most one sweep waiting at a time.
func (ReminderArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{Queue: Queue, UniqueOpts: river.UniqueOpts{ByArgs: true}}
}

// ReminderWorker sweeps for and flags SLA reminders.
type ReminderWorker struct {
	river.WorkerDefaults[ReminderArgs]
	Service *app.Service
	Logger  *slog.Logger
}

// Work runs one reminder sweep.
func (w *ReminderWorker) Work(ctx context.Context, _ *river.Job[ReminderArgs]) error {
	n, err := w.Service.CheckSLAReminders(ctx)
	if n > 0 {
		w.Logger.InfoContext(ctx, "SLA reminders issued", "count", n)
	}
	return err
}

// NotificationWorker dispatches notifications to the notify service.
type NotificationWorker struct {
	river.WorkerDefaults[domain.NotificationArgs]
	Notifier *notifyclient.Client
	Logger   *slog.Logger
}

// Work dispatches the notification idempotently.
func (w *NotificationWorker) Work(ctx context.Context, job *river.Job[domain.NotificationArgs]) error {
	if w.Notifier == nil {
		return nil
	}
	args := job.Args
	ticketRef := fmt.Sprintf("#%d", args.TicketNumber)

	switch args.Kind {
	case "created":
		// Notify requester in-app
		_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
			Realm:      "staff",
			Recipient:  args.RequesterID,
			Category:   "it_tickets",
			Priority:   "normal",
			Title:      fmt.Sprintf("Ticket %s submitted", ticketRef),
			Body:       args.TicketTitle,
			ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
			EntityType: "ticket",
			EntityID:   args.TicketID,
			ActorID:    args.ActorID,
			DedupeKey:  fmt.Sprintf("itsm:inbox:%s:created", args.TicketID),
		}})
		// Send requester email
		if args.RequesterEmail != "" {
			emailSubject := fmt.Sprintf("[IT-%s] Ticket Received: %s", ticketRef, args.TicketTitle)
			emailText := fmt.Sprintf("Your IT ticket %s (%s) has been received. Our team will review it shortly.\n\nTicket ID: %s",
				ticketRef, args.TicketTitle, args.TicketID)
			emailHTML := fmt.Sprintf("<p>Your IT ticket <strong>%s</strong> (<em>%s</em>) has been received. Our team will review it shortly.</p>",
				ticketRef, args.TicketTitle)
			_ = w.Notifier.QueueEmail(ctx, args.RequesterEmail, emailSubject, emailText, emailHTML,
				fmt.Sprintf("itsm:email:ticket:%s:created", args.TicketID), args.ActorID)
		}

	case "transition":
		if args.ActorRealm == "it" {
			// IT made a transition -> notify requester
			title := fmt.Sprintf("Ticket %s updated: %s", ticketRef, args.Detail)
			_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
				Realm:      "staff",
				Recipient:  args.RequesterID,
				Category:   "it_tickets",
				Priority:   "normal",
				Title:      title,
				Body:       args.TicketTitle,
				ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
				EntityType: "ticket",
				EntityID:   args.TicketID,
				ActorID:    args.ActorID,
				DedupeKey:  fmt.Sprintf("itsm:inbox:%s:%s", args.TicketID, args.EventID),
			}})
			if args.RequesterEmail != "" {
				subj := fmt.Sprintf("[IT-%s] Status Update: %s", ticketRef, args.Detail)
				text := fmt.Sprintf("Your ticket %s (%s) status changed to %s.\n\nTicket ID: %s",
					ticketRef, args.TicketTitle, args.Detail, args.TicketID)
				_ = w.Notifier.QueueEmail(ctx, args.RequesterEmail, subj, text, "",
					fmt.Sprintf("itsm:email:%s:%s", args.TicketID, args.EventID), args.ActorID)
			}
		} else {
			// Requester transitioned -> notify assignee if assigned
			if args.AssigneeID != "" {
				_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
					Realm:      "it",
					Recipient:  args.AssigneeID,
					Category:   "it_tickets",
					Priority:   "normal",
					Title:      fmt.Sprintf("Ticket %s: %s", ticketRef, args.Detail),
					Body:       args.TicketTitle,
					ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
					EntityType: "ticket",
					EntityID:   args.TicketID,
					ActorID:    args.ActorID,
					DedupeKey:  fmt.Sprintf("itsm:inbox:%s:%s", args.TicketID, args.EventID),
				}})
			}
		}

	case "comment":
		if args.ActorRealm == "it" {
			// IT replied publicly -> notify requester
			_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
				Realm:      "staff",
				Recipient:  args.RequesterID,
				Category:   "it_tickets",
				Priority:   "normal",
				Title:      fmt.Sprintf("New reply on ticket %s", ticketRef),
				Body:       args.TicketTitle,
				ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
				EntityType: "ticket",
				EntityID:   args.TicketID,
				ActorID:    args.ActorID,
				DedupeKey:  fmt.Sprintf("itsm:inbox:comment:%s:%s", args.TicketID, args.EventID),
			}})
			if args.RequesterEmail != "" {
				subj := fmt.Sprintf("[IT-%s] New Reply: %s", ticketRef, args.TicketTitle)
				text := fmt.Sprintf("A reply was added to your IT ticket %s (%s).\n\nTicket ID: %s",
					ticketRef, args.TicketTitle, args.TicketID)
				_ = w.Notifier.QueueEmail(ctx, args.RequesterEmail, subj, text, "",
					fmt.Sprintf("itsm:email:comment:%s:%s", args.TicketID, args.EventID), args.ActorID)
			}
		} else {
			// Requester replied -> notify assignee
			if args.AssigneeID != "" {
				_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
					Realm:      "it",
					Recipient:  args.AssigneeID,
					Category:   "it_tickets",
					Priority:   "normal",
					Title:      fmt.Sprintf("Requester replied on ticket %s", ticketRef),
					Body:       args.TicketTitle,
					ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
					EntityType: "ticket",
					EntityID:   args.TicketID,
					ActorID:    args.ActorID,
					DedupeKey:  fmt.Sprintf("itsm:inbox:comment:%s:%s", args.TicketID, args.EventID),
				}})
			}
		}

	case "breached":
		if args.AssigneeID != "" {
			_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
				Realm:      "it",
				Recipient:  args.AssigneeID,
				Category:   "it_tickets",
				Priority:   "urgent",
				Title:      fmt.Sprintf("SLA Breached: Ticket %s", ticketRef),
				Body:       fmt.Sprintf("Ticket %s (%s) breached its %s SLA target.", ticketRef, args.TicketTitle, args.Detail),
				ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
				EntityType: "ticket",
				EntityID:   args.TicketID,
				DedupeKey:  fmt.Sprintf("itsm:inbox:breach:%s:%s", args.TicketID, args.Detail),
			}})
		}

	case "reminder":
		if args.AssigneeID != "" {
			_ = w.Notifier.DeliverInApp(ctx, []notifyclient.InAppNotification{{
				Realm:      "it",
				Recipient:  args.AssigneeID,
				Category:   "it_tickets",
				Priority:   "high",
				Title:      fmt.Sprintf("SLA Warning: Ticket %s", ticketRef),
				Body:       fmt.Sprintf("Ticket %s (%s) is approaching its %s deadline.", ticketRef, args.TicketTitle, args.Detail),
				ActionURL:  fmt.Sprintf("/tickets/%s", args.TicketID),
				EntityType: "ticket",
				EntityID:   args.TicketID,
				DedupeKey:  fmt.Sprintf("itsm:inbox:reminder:%s:%s", args.TicketID, args.Detail),
			}})
		}
	}

	return nil
}

// Options configures the River client.
type Options struct {
	Schema           string
	BreachInterval   time.Duration
	ReminderInterval time.Duration
	Workers          int
	Logger           *slog.Logger
	Notifier         *notifyclient.Client
}

// NewClient returns a River client that works the service's queue and schedules SLA sweeps.
// When svc is nil, the client is created in inserter-only mode without workers or periodic jobs.
func NewClient(pool *pgxpool.Pool, svc *app.Service, opts Options) (*river.Client[pgx.Tx], error) {
	cfg := &river.Config{
		Schema: opts.Schema,
		Logger: opts.Logger,
	}

	if svc != nil {
		workers := river.NewWorkers()
		if err := river.AddWorkerSafely(workers, &BreachWorker{Service: svc, Logger: opts.Logger}); err != nil {
			return nil, err
		}
		if err := river.AddWorkerSafely(workers, &ReminderWorker{Service: svc, Logger: opts.Logger}); err != nil {
			return nil, err
		}
		if err := river.AddWorkerSafely(workers, &NotificationWorker{Notifier: opts.Notifier, Logger: opts.Logger}); err != nil {
			return nil, err
		}

		breachInterval := opts.BreachInterval
		if breachInterval <= 0 {
			breachInterval = time.Minute
		}
		reminderInterval := opts.ReminderInterval
		if reminderInterval <= 0 {
			reminderInterval = 5 * time.Minute
		}

		cfg.Queues = map[string]river.QueueConfig{Queue: {MaxWorkers: opts.Workers}}
		cfg.Workers = workers
		cfg.PeriodicJobs = []*river.PeriodicJob{
			river.NewPeriodicJob(river.PeriodicInterval(breachInterval),
				func() (river.JobArgs, *river.InsertOpts) { return BreachArgs{}, nil },
				&river.PeriodicJobOpts{RunOnStart: true}),
			river.NewPeriodicJob(river.PeriodicInterval(reminderInterval),
				func() (river.JobArgs, *river.InsertOpts) { return ReminderArgs{}, nil },
				&river.PeriodicJobOpts{RunOnStart: true}),
		}
	}

	return river.NewClient(riverpgxv5.New(pool), cfg)
}
