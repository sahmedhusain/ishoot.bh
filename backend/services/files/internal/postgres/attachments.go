package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// EntityAttachment links a stored file or external/internal document reference to any domain entity.
type EntityAttachment struct {
	ID           string    `json:"id"`
	FileID       *string   `json:"fileId,omitempty"`
	FileURL      string    `json:"fileUrl"`
	FileName     string    `json:"fileName"`
	FileSize     int64     `json:"fileSize"`
	MIMEType     string    `json:"mimeType"`
	EntityType   string    `json:"entityType"`
	EntityID     string    `json:"entityId"`
	DocumentID   *string   `json:"documentId,omitempty"`
	DocumentType *string   `json:"documentType,omitempty"`
	RelationKind string    `json:"relationKind"`
	Title        *string   `json:"title,omitempty"`
	ClientID     *string   `json:"clientId,omitempty"`
	EmployeeID   *string   `json:"employeeId,omitempty"`
	ProjectID    *string   `json:"projectId,omitempty"`
	UploadedByID *string   `json:"uploadedById,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// AttachmentFilter constrains ListAttachments queries cleanly via nullable optional fields.
type AttachmentFilter struct {
	EntityType string
	EntityID   string
	DocumentID string
	ClientID   string
	EmployeeID string
	ProjectID  string
	FileURL    string
	Limit      int
}

// InsertAttachment creates a relational file/document attachment record, resolving file_id if uploaded in files.upload_object.
func (r *Repository) InsertAttachment(ctx context.Context, in EntityAttachment) (EntityAttachment, error) {
	if in.MIMEType == "" {
		in.MIMEType = "application/octet-stream"
	}
	if in.RelationKind == "" {
		in.RelationKind = "attachment"
	}
	if in.FileID == nil && in.FileURL != "" {
		var fid string
		if err := r.pool.QueryRow(ctx, `SELECT id FROM files.upload_object WHERE file_url = $1 LIMIT 1`, in.FileURL).Scan(&fid); err == nil && fid != "" {
			in.FileID = &fid
		}
	}
	var out EntityAttachment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO files.entity_attachment (
			id, file_id, file_url, file_name, file_size, mime_type,
			entity_type, entity_id, document_id, document_type, relation_kind, title,
			client_id, employee_id, project_id, uploaded_by_id, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, now()
		)
		RETURNING id, file_id, file_url, file_name, file_size, mime_type,
		          entity_type, entity_id, document_id, document_type, relation_kind, title,
		          client_id, employee_id, project_id, uploaded_by_id, created_at
	`, in.ID, in.FileID, in.FileURL, in.FileName, in.FileSize, in.MIMEType,
		in.EntityType, in.EntityID, in.DocumentID, in.DocumentType, in.RelationKind, in.Title,
		in.ClientID, in.EmployeeID, in.ProjectID, in.UploadedByID,
	).Scan(
		&out.ID, &out.FileID, &out.FileURL, &out.FileName, &out.FileSize, &out.MIMEType,
		&out.EntityType, &out.EntityID, &out.DocumentID, &out.DocumentType, &out.RelationKind, &out.Title,
		&out.ClientID, &out.EmployeeID, &out.ProjectID, &out.UploadedByID, &out.CreatedAt,
	)
	return out, err
}

// ListAttachments returns matching entity attachments ordered newest first.
func (r *Repository) ListAttachments(ctx context.Context, f AttachmentFilter) ([]EntityAttachment, error) {
	limit := f.Limit
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, file_id, file_url, file_name, file_size, mime_type,
		       entity_type, entity_id, document_id, document_type, relation_kind, title,
		       client_id, employee_id, project_id, uploaded_by_id, created_at
		FROM files.entity_attachment
		WHERE ($1 = '' OR entity_type = $1)
		  AND ($2 = '' OR entity_id = $2)
		  AND ($3 = '' OR document_id = $3)
		  AND ($4 = '' OR client_id = $4)
		  AND ($5 = '' OR employee_id = $5)
		  AND ($6 = '' OR project_id = $6)
		  AND ($7 = '' OR file_url = $7)
		ORDER BY created_at DESC
		LIMIT $8
	`, f.EntityType, f.EntityID, f.DocumentID, f.ClientID, f.EmployeeID, f.ProjectID, f.FileURL, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]EntityAttachment, 0)
	for rows.Next() {
		var item EntityAttachment
		if err := rows.Scan(
			&item.ID, &item.FileID, &item.FileURL, &item.FileName, &item.FileSize, &item.MIMEType,
			&item.EntityType, &item.EntityID, &item.DocumentID, &item.DocumentType, &item.RelationKind, &item.Title,
			&item.ClientID, &item.EmployeeID, &item.ProjectID, &item.UploadedByID, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

// DeleteAttachment removes an attachment link row by ID.
func (r *Repository) DeleteAttachment(ctx context.Context, id string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM files.entity_attachment WHERE id = $1`, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
