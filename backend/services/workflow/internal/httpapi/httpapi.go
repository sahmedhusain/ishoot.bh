package httpapi
import (
	"errors"
	"net/http"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/authz"
	"platform.local/backend/pkg/problem"
	"platform.local/backend/services/workflow/api"
	"platform.local/backend/services/workflow/internal/app"
	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
)
type Options struct {
	Verifier	*authn.Verifier
	Readers		[]string
	Writers		[]string
}
type handler struct {
	svc	*app.Service
	opts	Options
}
func Register(e *echo.Echo, svc *app.Service, opts Options) {
	h := &handler{svc: svc, opts: opts}
	e.GET("/v1/workflow/openapi.yaml", func(c echo.Context) error {
		return c.Blob(http.StatusOK, "application/yaml", api.OpenAPI)
	})
	auth := authn.Require(opts.Verifier, authn.RealmService)
	g := e.Group("/v1/workflow", auth, authz.ServiceCallers(opts.Readers, opts.Writers))
	g.GET("/approvals", h.listApprovalsRelational)
	g.POST("/approvals", h.createApprovalRelational)
	g.GET("/approvals/:id", h.getApprovalRequest)
	g.POST("/approvals/:id/decide", h.decideApproval)
	g.GET("/signatures", h.listSignaturesRelational)
	g.POST("/signatures", h.createSignatureRelational)
	g.POST("/signatures/:id/sign", h.recordSignature)
	g.GET("/tasks", h.listTasks)
	g.POST("/tasks", h.createTask)
	g.PUT("/tasks/:id", h.updateTask)
	g.PUT("/tasks/:id/status", h.updateTaskStatus)
	g.DELETE("/tasks/:id", h.deleteTask)
	g.GET("/calendar", h.listCalendarRelational)
	g.POST("/calendar", h.createCalendarRelational)
	g.GET("/moms", h.listMOMs)
	g.POST("/moms", h.createMOM)
	g.GET("/moms/:id", h.getMOM)
	g.PUT("/moms/:id", h.updateMOM)
	g.DELETE("/moms/:id", h.deleteMOM)
	g.GET("/directory", h.listDirectory)
	g.GET("/contracts", h.listContracts)
	g.POST("/contracts", h.saveContract)
	g.GET("/contracts/:id", h.getContract)
	g.PUT("/contracts/:id", h.saveContract)
	g.DELETE("/contracts/:id", h.deleteContract)
	g.GET("/letters", h.listLettersRelational)
	g.POST("/letters", h.createLetterRelational)
	g.GET("/letters/:id", h.getOfficialLetter)
	g.POST("/letters/:id/issue", h.issueOfficialLetter)
	g.GET("/letter-templates", h.listLetterTemplates)
	g.POST("/letter-templates", h.createLetterTemplate)
}
func (h *handler) listApprovals(c echo.Context) error {
	approvals, err := h.svc.ListApprovalRequests(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, approvals)
}
func (h *handler) getApprovalRequest(c echo.Context) error {
	req, err := h.svc.GetApprovalRequest(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, req)
}
func (h *handler) createApprovalRequest(c echo.Context) error {
	var in sqlcdb.CreateApprovalRequestParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "pending"
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
	created, err := h.svc.CreateApprovalRequest(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
type decideBody struct {
	Decision	string	`json:"decision"`
	Comments	*string	`json:"comments"`
}
func (h *handler) decideApproval(c echo.Context) error {
	var body decideBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	approverID := "system"
	if p, ok := authn.PrincipalFrom(c.Request().Context()); ok {
		approverID = p.Subject
	}
	decision, err := h.svc.DecideApproval(c.Request().Context(), c.Param("id"), approverID, body.Decision, body.Comments)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, decision)
}
func (h *handler) listSignatures(c echo.Context) error {
	signatures, err := h.svc.ListSignatureRequests(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, signatures)
}
func (h *handler) createSignatureRequest(c echo.Context) error {
	var in sqlcdb.CreateSignatureRequestParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "pending"
	}
	created, err := h.svc.CreateSignatureRequest(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
type signBody struct {
	SignatureURL string `json:"signatureUrl"`
}
func (h *handler) recordSignature(c echo.Context) error {
	var body signBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	sig, err := h.svc.RecordSignature(c.Request().Context(), c.Param("id"), &body.SignatureURL)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, sig)
}
func optionalParam(c echo.Context, key string) *string {
	if v := c.QueryParam(key); v != "" {
		return &v
	}
	return nil
}
func (h *handler) listTasks(c echo.Context) error {
	tasks, err := h.svc.ListTasksFiltered(c.Request().Context(), sqlcdb.ListTasksFilteredParams{
		ProjectID:    optionalParam(c, "projectId"),
		DepartmentID: optionalParam(c, "departmentId"),
		MomID:        optionalParam(c, "momId"),
		ClientID:     optionalParam(c, "clientId"),
		DealID:       optionalParam(c, "dealId"),
		AssignedTo:   optionalParam(c, "assignedTo"),
		Status:       optionalParam(c, "status"),
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, tasks)
}
func (h *handler) updateTask(c echo.Context) error {
	var in sqlcdb.UpdateTaskParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	updated, err := h.svc.UpdateTask(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}
func (h *handler) deleteTask(c echo.Context) error {
	if err := h.svc.DeleteTask(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
func (h *handler) createTask(c echo.Context) error {
	var in sqlcdb.CreateTaskParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "todo"
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
	created, err := h.svc.CreateTask(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
type taskStatusBody struct {
	Status string `json:"status"`
}
func (h *handler) updateTaskStatus(c echo.Context) error {
	var body taskStatusBody
	if err := c.Bind(&body); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	updated, err := h.svc.UpdateTaskStatus(c.Request().Context(), c.Param("id"), body.Status)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}
func (h *handler) listCalendarEvents(c echo.Context) error {
	events, err := h.svc.ListCalendarEvents(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, events)
}
func (h *handler) createCalendarEvent(c echo.Context) error {
	var in sqlcdb.CreateCalendarEventParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.EventType == "" {
		in.EventType = "general"
	}
	created, err := h.svc.CreateCalendarEvent(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
func (h *handler) listMOMs(c echo.Context) error {
	moms, err := h.svc.ListMOMsFiltered(c.Request().Context(), sqlcdb.ListMOMsFilteredParams{
		ClientID:     optionalParam(c, "clientId"),
		DealID:       optionalParam(c, "dealId"),
		ProjectID:    optionalParam(c, "projectId"),
		DepartmentID: optionalParam(c, "departmentId"),
		TeamID:       optionalParam(c, "teamId"),
		Status:       optionalParam(c, "status"),
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, moms)
}
func (h *handler) getMOM(c echo.Context) error {
	mom, err := h.svc.GetMOMDetails(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, mom)
}
func (h *handler) createMOM(c echo.Context) error {
	var in app.CreateMOMInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateMOMWithRelations(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
func (h *handler) updateMOM(c echo.Context) error {
	var in app.UpdateMOMInput
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	in.ID = c.Param("id")
	updated, err := h.svc.UpdateMOMWithRelations(c.Request().Context(), in)
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, updated)
}
func (h *handler) deleteMOM(c echo.Context) error {
	if err := h.svc.DeleteMOM(c.Request().Context(), c.Param("id")); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
func (h *handler) listDirectory(c echo.Context) error {
	items, err := h.svc.ListDirectoryRefs(c.Request().Context(), optionalParam(c, "kind"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, items)
}
func (h *handler) listOfficialLetters(c echo.Context) error {
	letters, err := h.svc.ListOfficialLetters(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, letters)
}
func (h *handler) getOfficialLetter(c echo.Context) error {
	letter, err := h.svc.GetOfficialLetter(c.Request().Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, app.ErrNotFound) {
			return problem.NotFound("")
		}
		return err
	}
	return c.JSON(http.StatusOK, letter)
}
func (h *handler) createOfficialLetter(c echo.Context) error {
	var in sqlcdb.CreateOfficialLetterParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	if in.Status == "" {
		in.Status = "draft"
	}
	created, err := h.svc.CreateOfficialLetter(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
func (h *handler) issueOfficialLetter(c echo.Context) error {
	issued, err := h.svc.IssueOfficialLetter(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, issued)
}
func (h *handler) listLetterTemplates(c echo.Context) error {
	templates, err := h.svc.ListLetterTemplates(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, templates)
}
func (h *handler) createLetterTemplate(c echo.Context) error {
	var in sqlcdb.CreateLetterTemplateParams
	if err := c.Bind(&in); err != nil {
		return problem.New(http.StatusBadRequest, "bad_request", err.Error())
	}
	created, err := h.svc.CreateLetterTemplate(c.Request().Context(), in)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusCreated, created)
}
