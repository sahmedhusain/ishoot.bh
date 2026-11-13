package httpapi
import (
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/httpx"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/files/api"
	"platform.local/backend/services/files/internal/app"
	"platform.local/backend/services/files/internal/domain"
)
const (
	CodeInvalidURL		= "invalid_file_url"
	CodeUnsupportedType	= "unsupported_file_type"
	CodeNotFound		= "file_not_found"
	CodeNotOwner		= "upload_not_owned"
	CodeUnavailable		= "upload_unavailable"
	CodeContentMismatch	= "file_content_mismatch"
	CodeExists		= "file_exists"
	CodeNotPrivate		= "file_not_private"
	CodeSourceBlocked	= "source_not_allowed"
	CodeSourceUnreachable	= "source_unreachable"
	CodeImportsOff		= "imports_off"
)
type Handler struct {
	svc		*app.Service
	jsonBodyLimit	int64
}
func Register(g *echo.Group, svc *app.Service, jsonBodyLimit int64) {
	h := &Handler{svc: svc, jsonBodyLimit: jsonBodyLimit}
	g.GET("/openapi.yaml", func(c echo.Context) error { return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI) })
	g.POST("/uploads", h.register)
	g.PUT("/uploads/content", h.writeUpload)
	g.POST("/uploads/verify", h.verify)
	g.POST("/uploads/claim", h.claim)
	g.POST("/uploads/import", h.importLink)
	g.GET("/records", h.lookup)
	g.GET("/content", h.read)
	g.PUT("/content", h.store)
	g.DELETE("/content", h.delete)
}
type File struct {
	ID		string		`json:"id"`
	FileURL		string		`json:"fileUrl"`
	OwnerID		string		`json:"ownerId,omitempty"`
	FileName	string		`json:"fileName"`
	FileSize	int64		`json:"fileSize"`
	MIMEType	string		`json:"mimeType"`
	IsPublic	bool		`json:"isPublic"`
	ClaimedAt	*time.Time	`json:"claimedAt,omitempty"`
	ExpiresAt	*time.Time	`json:"expiresAt,omitempty"`
	CreatedAt	time.Time	`json:"createdAt"`
}
func toJSON(f domain.File) File {
	var expires *time.Time
	if !f.ExpiresAt.IsZero() {
		expires = &f.ExpiresAt
	}
	return File{
		ID:	f.ID, FileURL: f.URL, OwnerID: f.OwnerID, FileName: f.FileName, FileSize: f.Size, MIMEType: f.MIMEType,
		IsPublic:	f.Public, ClaimedAt: f.ClaimedAt, ExpiresAt: expires, CreatedAt: f.CreatedAt,
	}
}
type registerRequest struct {
	OwnerID		string	`json:"ownerId" validate:"required,max=64"`
	Folder		string	`json:"folder" validate:"required,max=40"`
	FileName	string	`json:"fileName" validate:"required,max=255"`
	MIMEType	string	`json:"mimeType" validate:"required,max=100"`
	FileSize	int64	`json:"fileSize" validate:"gt=0"`
}
func (h *Handler) register(c echo.Context) error {
	var req registerRequest
	if err := httpx.BindJSON(c, &req, h.jsonBodyLimit); err != nil {
		return err
	}
	f, err := h.svc.Register(c.Request().Context(), app.RegisterInput{
		OwnerID:	req.OwnerID, Folder: req.Folder, FileName: req.FileName, MIMEType: req.MIMEType, Size: req.FileSize,
	})
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusCreated, toJSON(f))
}
type uploadRef struct {
	FileURL	string	`json:"fileUrl" validate:"required,max=300"`
	OwnerID	string	`json:"ownerId" validate:"required,max=64"`
}
func (h *Handler) writeUpload(c echo.Context) error {
	q := c.QueryParams()
	ref := uploadRef{FileURL: q.Get("fileUrl"), OwnerID: q.Get("ownerId")}
	if err := httpx.Validate(ref); err != nil {
		return err
	}
	f, err := h.svc.WriteUpload(c.Request().Context(), ref.FileURL, ref.OwnerID, c.Request().Body, c.Request().ContentLength)
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusOK, toJSON(f))
}
func (h *Handler) verify(c echo.Context) error {
	var req uploadRef
	if err := httpx.BindJSON(c, &req, h.jsonBodyLimit); err != nil {
		return err
	}
	f, err := h.svc.Verify(c.Request().Context(), req.FileURL, req.OwnerID)
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusOK, toJSON(f))
}
type claimRequest struct {
	uploadRef
	RequirePrivate	bool	`json:"requirePrivate"`
}
func (h *Handler) claim(c echo.Context) error {
	var req claimRequest
	if err := httpx.BindJSON(c, &req, h.jsonBodyLimit); err != nil {
		return err
	}
	f, err := h.svc.Claim(c.Request().Context(), req.FileURL, req.OwnerID, req.RequirePrivate)
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusOK, toJSON(f))
}
type importRequest struct {
	OwnerID	string	`json:"ownerId" validate:"required,max=64"`
	Folder	string	`json:"folder" validate:"required,max=40"`
	URL	string	`json:"url" validate:"required,max=2048"`
}
func (h *Handler) importLink(c echo.Context) error {
	var req importRequest
	if err := httpx.BindJSON(c, &req, h.jsonBodyLimit); err != nil {
		return err
	}
	f, err := h.svc.Import(c.Request().Context(), req.OwnerID, req.Folder, req.URL)
	switch {
	case errors.Is(err, app.ErrSourceBlocked):
		return problem.New(http.StatusUnprocessableEntity, CodeSourceBlocked, "")
	case errors.Is(err, app.ErrSourceUnreachable):
		return problem.New(http.StatusUnprocessableEntity, CodeSourceUnreachable, "")
	case errors.Is(err, app.ErrImportsOff):
		return problem.New(http.StatusNotImplemented, CodeImportsOff, "")
	case err != nil:
		return h.toProblem(err)
	}
	return c.JSON(http.StatusCreated, toJSON(f))
}
func (h *Handler) lookup(c echo.Context) error {
	files, err := h.svc.Lookup(c.Request().Context(), c.QueryParams()["fileUrl"])
	if err != nil {
		return toProblem(err)
	}
	items := make([]File, len(files))
	for i, f := range files {
		items[i] = toJSON(f)
	}
	return c.JSON(http.StatusOK, map[string][]File{"items": items})
}
func (h *Handler) read(c echo.Context) error {
	body, f, err := h.svc.Open(c.Request().Context(), c.QueryParam("fileUrl"))
	if err != nil {
		return toProblem(err)
	}
	defer body.Close()
	header := c.Response().Header()
	header.Set("X-File-Public", strconv.FormatBool(f.Public))
	header.Set("X-File-Name", url.PathEscape(f.FileName))
	header.Set("Cache-Control", "no-store")
	return c.Stream(http.StatusOK, f.MIMEType, body)
}
func (h *Handler) store(c echo.Context) error {
	q := c.QueryParams()
	req := c.Request()
	if (q.Get("fileUrl") == "") == (q.Get("folder") == "") {
		return problem.Validation(problem.FieldError{Field: "fileUrl", Code: "fileUrl_or_folder"})
	}
	if req.ContentLength <= 0 {
		return problem.New(http.StatusLengthRequired, problem.CodeBadRequest, "Content-Length is required")
	}
	f, err := h.svc.Store(req.Context(), app.StoreInput{
		URL:	q.Get("fileUrl"), Folder: q.Get("folder"), NamePrefix: q.Get("namePrefix"),
		OwnerID:	q.Get("ownerId"), FileName: q.Get("fileName"),
		Size:	req.ContentLength, Body: io.LimitReader(req.Body, req.ContentLength+1),
	})
	if err != nil {
		return h.toProblem(err)
	}
	return c.JSON(http.StatusCreated, toJSON(f))
}
func (h *Handler) delete(c echo.Context) error {
	if err := h.svc.Delete(c.Request().Context(), c.QueryParam("fileUrl")); err != nil {
		return toProblem(err)
	}
	return c.NoContent(http.StatusNoContent)
}
var errorCodes = []struct {
	err	error
	status	int
	code	string
}{
	{domain.ErrInvalidURL, http.StatusUnprocessableEntity, CodeInvalidURL},
	{domain.ErrTypeNotAllowed, http.StatusUnsupportedMediaType, CodeUnsupportedType},
	{domain.ErrTooLarge, http.StatusRequestEntityTooLarge, problem.CodeTooLarge},
	{domain.ErrNotFound, http.StatusNotFound, CodeNotFound},
	{domain.ErrNotOwner, http.StatusForbidden, CodeNotOwner},
	{domain.ErrUnavailable, http.StatusConflict, CodeUnavailable},
	{domain.ErrContentMismatch, http.StatusUnprocessableEntity, CodeContentMismatch},
	{domain.ErrExists, http.StatusConflict, CodeExists},
	{domain.ErrNotPrivate, http.StatusUnprocessableEntity, CodeNotPrivate},
}
func (h *Handler) toProblem(err error) error {
	if errors.Is(err, domain.ErrTooLarge) {
		p := problem.New(http.StatusRequestEntityTooLarge, problem.CodeTooLarge, "")
		p.Extra = map[string]any{"maxFileSize": h.svc.MaxFileSize()}
		return p
	}
	return toProblem(err)
}
func toProblem(err error) error {
	for _, e := range errorCodes {
		if errors.Is(err, e.err) {
			return problem.New(e.status, e.code, "")
		}
	}
	return err
}
