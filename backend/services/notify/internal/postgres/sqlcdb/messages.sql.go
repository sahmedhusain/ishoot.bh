package sqlcdb

import (
	"context"
	"time"
)

const attachmentNames = `-- name: AttachmentNames :many
SELECT message_id, position, filename, content_type, length(content)::bigint AS size
FROM notify.attachment WHERE message_id = $1 ORDER BY position
`

type AttachmentNamesRow struct {
	MessageID   string `json:"messageId"`
	Position    int32  `json:"position"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

func (q *Queries) AttachmentNames(ctx context.Context, messageID string) ([]AttachmentNamesRow, error) {
	rows, err := q.db.Query(ctx, attachmentNames, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AttachmentNamesRow
	for rows.Next() {
		var i AttachmentNamesRow
		if err := rows.Scan(
			&i.MessageID,
			&i.Position,
			&i.Filename,
			&i.ContentType,
			&i.Size,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const attachments = `-- name: Attachments :many
SELECT message_id, position, filename, content_type, content FROM notify.attachment WHERE message_id = $1 ORDER BY position
`

func (q *Queries) Attachments(ctx context.Context, messageID string) ([]NotifyAttachment, error) {
	rows, err := q.db.Query(ctx, attachments, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []NotifyAttachment
	for rows.Next() {
		var i NotifyAttachment
		if err := rows.Scan(
			&i.MessageID,
			&i.Position,
			&i.Filename,
			&i.ContentType,
			&i.Content,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const countByStatus = `-- name: CountByStatus :many
SELECT status, channel, count(*)::bigint AS messages FROM notify.message
WHERE created_at >= $1 GROUP BY status, channel
`

type CountByStatusRow struct {
	Status   string `json:"status"`
	Channel  string `json:"channel"`
	Messages int64  `json:"messages"`
}

func (q *Queries) CountByStatus(ctx context.Context, since time.Time) ([]CountByStatusRow, error) {
	rows, err := q.db.Query(ctx, countByStatus, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []CountByStatusRow
	for rows.Next() {
		var i CountByStatusRow
		if err := rows.Scan(&i.Status, &i.Channel, &i.Messages); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getMessage = `-- name: GetMessage :one
SELECT id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html, status, attempts, provider, provider_id, last_error, created_at, updated_at, sent_at FROM notify.message WHERE id = $1
`

func (q *Queries) GetMessage(ctx context.Context, id string) (NotifyMessage, error) {
	row := q.db.QueryRow(ctx, getMessage, id)
	var i NotifyMessage
	err := row.Scan(
		&i.ID,
		&i.Caller,
		&i.IdempotencyKey,
		&i.Actor,
		&i.Channel,
		&i.Recipient,
		&i.Subject,
		&i.BodyText,
		&i.BodyHtml,
		&i.Status,
		&i.Attempts,
		&i.Provider,
		&i.ProviderID,
		&i.LastError,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.SentAt,
	)
	return i, err
}

const insertAttachment = `-- name: InsertAttachment :exec
INSERT INTO notify.attachment (message_id, position, filename, content_type, content)
VALUES ($1, $2, $3, $4, $5)
`

type InsertAttachmentParams struct {
	MessageID   string `json:"messageId"`
	Position    int32  `json:"position"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	Content     []byte `json:"content"`
}

func (q *Queries) InsertAttachment(ctx context.Context, arg InsertAttachmentParams) error {
	_, err := q.db.Exec(ctx, insertAttachment,
		arg.MessageID,
		arg.Position,
		arg.Filename,
		arg.ContentType,
		arg.Content,
	)
	return err
}

const insertMessage = `-- name: InsertMessage :execrows
INSERT INTO notify.message (id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (caller, idempotency_key) DO NOTHING
`

type InsertMessageParams struct {
	ID             string  `json:"id"`
	Caller         string  `json:"caller"`
	IdempotencyKey string  `json:"idempotencyKey"`
	Actor          *string `json:"actor"`
	Channel        string  `json:"channel"`
	Recipient      string  `json:"recipient"`
	Subject        *string `json:"subject"`
	BodyText       *string `json:"bodyText"`
	BodyHtml       *string `json:"bodyHtml"`
}

func (q *Queries) InsertMessage(ctx context.Context, arg InsertMessageParams) (int64, error) {
	result, err := q.db.Exec(ctx, insertMessage,
		arg.ID,
		arg.Caller,
		arg.IdempotencyKey,
		arg.Actor,
		arg.Channel,
		arg.Recipient,
		arg.Subject,
		arg.BodyText,
		arg.BodyHtml,
	)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const listMessages = `-- name: ListMessages :many
SELECT id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html, status, attempts, provider, provider_id, last_error, created_at, updated_at, sent_at FROM notify.message
WHERE ($1::text IS NULL OR status = $1)
  AND ($2::text IS NULL OR channel = $2)
  AND (NOT $3::boolean OR (created_at, id) < ($4::timestamptz, $5::uuid))
ORDER BY created_at DESC, id DESC
LIMIT $6
`

type ListMessagesParams struct {
	Status        *string   `json:"status"`
	Channel       *string   `json:"channel"`
	HasCursor     bool      `json:"hasCursor"`
	BeforeCreated time.Time `json:"beforeCreated"`
	BeforeID      string    `json:"beforeId"`
	PageSize      int32     `json:"pageSize"`
}

func (q *Queries) ListMessages(ctx context.Context, arg ListMessagesParams) ([]NotifyMessage, error) {
	rows, err := q.db.Query(ctx, listMessages,
		arg.Status,
		arg.Channel,
		arg.HasCursor,
		arg.BeforeCreated,
		arg.BeforeID,
		arg.PageSize,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []NotifyMessage
	for rows.Next() {
		var i NotifyMessage
		if err := rows.Scan(
			&i.ID,
			&i.Caller,
			&i.IdempotencyKey,
			&i.Actor,
			&i.Channel,
			&i.Recipient,
			&i.Subject,
			&i.BodyText,
			&i.BodyHtml,
			&i.Status,
			&i.Attempts,
			&i.Provider,
			&i.ProviderID,
			&i.LastError,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.SentAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const lockMessage = `-- name: LockMessage :one
SELECT id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html, status, attempts, provider, provider_id, last_error, created_at, updated_at, sent_at FROM notify.message WHERE id = $1 FOR UPDATE
`

func (q *Queries) LockMessage(ctx context.Context, id string) (NotifyMessage, error) {
	row := q.db.QueryRow(ctx, lockMessage, id)
	var i NotifyMessage
	err := row.Scan(
		&i.ID,
		&i.Caller,
		&i.IdempotencyKey,
		&i.Actor,
		&i.Channel,
		&i.Recipient,
		&i.Subject,
		&i.BodyText,
		&i.BodyHtml,
		&i.Status,
		&i.Attempts,
		&i.Provider,
		&i.ProviderID,
		&i.LastError,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.SentAt,
	)
	return i, err
}

const markAttempt = `-- name: MarkAttempt :exec
UPDATE notify.message SET attempts = attempts + 1, provider = $1, last_error = $2, updated_at = $3
WHERE id = $4
`

type MarkAttemptParams struct {
	Provider  *string   `json:"provider"`
	LastError *string   `json:"lastError"`
	Now       time.Time `json:"now"`
	ID        string    `json:"id"`
}

func (q *Queries) MarkAttempt(ctx context.Context, arg MarkAttemptParams) error {
	_, err := q.db.Exec(ctx, markAttempt,
		arg.Provider,
		arg.LastError,
		arg.Now,
		arg.ID,
	)
	return err
}

const markFailed = `-- name: MarkFailed :exec
UPDATE notify.message SET status = 'failed', attempts = attempts + 1, provider = $1, last_error = $2,
    updated_at = $3
WHERE id = $4
`

type MarkFailedParams struct {
	Provider  *string   `json:"provider"`
	LastError *string   `json:"lastError"`
	Now       time.Time `json:"now"`
	ID        string    `json:"id"`
}

func (q *Queries) MarkFailed(ctx context.Context, arg MarkFailedParams) error {
	_, err := q.db.Exec(ctx, markFailed,
		arg.Provider,
		arg.LastError,
		arg.Now,
		arg.ID,
	)
	return err
}

const markSent = `-- name: MarkSent :exec
UPDATE notify.message SET status = 'sent', attempts = attempts + 1, provider = $1, provider_id = $2,
    last_error = NULL, sent_at = $3, updated_at = $3
WHERE id = $4
`

type MarkSentParams struct {
	Provider   *string    `json:"provider"`
	ProviderID *string    `json:"providerId"`
	Now        *time.Time `json:"now"`
	ID         string     `json:"id"`
}

func (q *Queries) MarkSent(ctx context.Context, arg MarkSentParams) error {
	_, err := q.db.Exec(ctx, markSent,
		arg.Provider,
		arg.ProviderID,
		arg.Now,
		arg.ID,
	)
	return err
}

const messageByKey = `-- name: MessageByKey :one
SELECT id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html, status, attempts, provider, provider_id, last_error, created_at, updated_at, sent_at FROM notify.message WHERE caller = $1 AND idempotency_key = $2
`

type MessageByKeyParams struct {
	Caller         string `json:"caller"`
	IdempotencyKey string `json:"idempotencyKey"`
}

func (q *Queries) MessageByKey(ctx context.Context, arg MessageByKeyParams) (NotifyMessage, error) {
	row := q.db.QueryRow(ctx, messageByKey, arg.Caller, arg.IdempotencyKey)
	var i NotifyMessage
	err := row.Scan(
		&i.ID,
		&i.Caller,
		&i.IdempotencyKey,
		&i.Actor,
		&i.Channel,
		&i.Recipient,
		&i.Subject,
		&i.BodyText,
		&i.BodyHtml,
		&i.Status,
		&i.Attempts,
		&i.Provider,
		&i.ProviderID,
		&i.LastError,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.SentAt,
	)
	return i, err
}

const requeue = `-- name: Requeue :execrows
UPDATE notify.message SET status = 'queued', updated_at = $1 WHERE id = $2 AND status = 'failed'
`

type RequeueParams struct {
	Now time.Time `json:"now"`
	ID  string    `json:"id"`
}

func (q *Queries) Requeue(ctx context.Context, arg RequeueParams) (int64, error) {
	result, err := q.db.Exec(ctx, requeue, arg.Now, arg.ID)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
