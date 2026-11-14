package httpapi

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/files/internal/postgres"
)

type createAttachmentRequest struct {
	FileID       *string `json:"fileId,omitempty"`
	FileURL      string  `json:"fileUrl" validate:"required,max=500"`
	FileName     string  `json:"fileName" validate:"max=255"`
	FileSize     int64   `json:"fileSize"`
	MIMEType     string  `json:"mimeType" validate:"max=120"`
	EntityType   string  `json:"entityType" validate:"required,max=80"`
	EntityID     string  `json:"entityId" validate:"required,max=120"`
	DocumentID   *string `json:"documentId,omitempty"`
	DocumentType *string `json:"documentType,omitempty"`
	RelationKind string  `json:"relationKind" validate:"max=64"`
	Title        *string `json:"title,omitempty"`
	ClientID     *string `json:"clientId,omitempty"`
	EmployeeID   *string `json:"employeeId,omitempty"`
	ProjectID    *string `json:"projectId,omitempty"`
	UploadedByID *string `json:"uploadedById,omitempty"`
}

func (h *Handler) createAttachment(c echo.Context) error {
	var req createAttachmentRequest
	if err := httpx.BindJSON(c, &req, h.jsonBodyLimit); err != nil {
		return err
	}
	created, err := h.svc.CreateAttachment(c.Request().Context(), postgres.EntityAttachment{
		FileID:       req.FileID,
		FileURL:      req.FileURL,
		FileName:     req.FileName,
		FileSize:     req.FileSize,
		MIMEType:     req.MIMEType,
		EntityType:   req.EntityType,
		EntityID:     req.EntityID,
		DocumentID:   req.DocumentID,
		DocumentType: req.DocumentType,
		RelationKind: req.RelationKind,
		Title:        req.Title,
		ClientID:     req.ClientID,
		EmployeeID:   req.EmployeeID,
		ProjectID:    req.ProjectID,
		UploadedByID: req.UploadedByID,
	})
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusCreated, created)
}

func (h *Handler) listAttachments(c echo.Context) error {
	q := c.QueryParams()
	limit := 100
	if raw := q.Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}
	items, err := h.svc.ListAttachments(c.Request().Context(), postgres.AttachmentFilter{
		EntityType: q.Get("entityType"),
		EntityID:   q.Get("entityId"),
		DocumentID: q.Get("documentId"),
		ClientID:   q.Get("clientId"),
		EmployeeID: q.Get("employeeId"),
		ProjectID:  q.Get("projectId"),
		FileURL:    q.Get("fileUrl"),
		Limit:      limit,
	})
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) deleteAttachment(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return problem.Validation(problem.FieldError{Field: "id", Code: "required"})
	}
	if err := h.svc.DeleteAttachment(c.Request().Context(), id); err != nil {
		return toProblem(err)
	}
	return c.NoContent(http.StatusNoContent)
}
