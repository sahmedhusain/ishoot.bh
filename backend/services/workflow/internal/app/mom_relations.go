package app

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/workflow/internal/postgres"
	"platform.local/backend/services/workflow/internal/postgres/sqlcdb"
)

const (
	EventMomCreated    = "workflow.mom.created"
	EventMomUpdated    = "workflow.mom.updated"
	DomainSyncConsumer = "workflow-domain-sync"
)

type MOMDetails struct {
	postgres.MinuteOfMeeting
	AttendeeRecords   []postgres.MomAttendee   `json:"attendeeRecords"`
	ActionItemRecords []postgres.MomActionItem `json:"actionItemRecords"`
}

type MomActionItemInput struct {
	ID                 string     `json:"id"`
	TaskID             *string    `json:"taskId"`
	Title              string     `json:"title"`
	Description        *string    `json:"description"`
	AssigneeEmployeeID *string    `json:"assigneeEmployeeId"`
	AssigneeUserID     *string    `json:"assigneeUserId"`
	DepartmentID       *string    `json:"departmentId"`
	DueDate            *time.Time `json:"dueDate"`
	Status             string     `json:"status"`
	CreateTask         *bool      `json:"createTask"`
}

type CreateMOMInput struct {
	sqlcdb.CreateMOMParams
	AttendeeRecords   []sqlcdb.InsertMomAttendeeParams `json:"attendeeRecords"`
	ActionItemRecords []MomActionItemInput             `json:"actionItemRecords"`
}

type UpdateMOMInput struct {
	sqlcdb.UpdateMOMParams
	AttendeeRecords   []sqlcdb.InsertMomAttendeeParams `json:"attendeeRecords"`
	ActionItemRecords []MomActionItemInput             `json:"actionItemRecords"`
	ReplaceRelations  bool                             `json:"replaceRelations"`
}

func normalizeMOMCreateDefaults(in *sqlcdb.CreateMOMParams) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	if in.Attendees == nil {
		in.Attendees = []string{}
	}
	if len(in.Decisions) == 0 {
		in.Decisions = json.RawMessage("[]")
	}
	if in.Status == "" {
		in.Status = "draft"
	}
}

func normalizeMOMUpdateDefaults(in *sqlcdb.UpdateMOMParams) {
	if in.Attendees == nil {
		in.Attendees = []string{}
	}
	if len(in.Decisions) == 0 {
		in.Decisions = json.RawMessage("[]")
	}
}

func (s *Service) ListMOMsFiltered(ctx context.Context, filter sqlcdb.ListMOMsFilteredParams) ([]postgres.MinuteOfMeeting, error) {
	return s.store.ListMOMsFiltered(ctx, filter)
}

func (s *Service) GetMOMDetails(ctx context.Context, id string) (MOMDetails, error) {
	mom, err := s.store.GetMOM(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MOMDetails{}, ErrNotFound
		}
		return MOMDetails{}, err
	}
	attendees, err := s.store.ListMomAttendees(ctx, id)
	if err != nil {
		return MOMDetails{}, err
	}
	actions, err := s.store.ListMomActionItems(ctx, id)
	if err != nil {
		return MOMDetails{}, err
	}
	return MOMDetails{
		MinuteOfMeeting:   mom,
		AttendeeRecords:   attendees,
		ActionItemRecords: actions,
	}, nil
}

func (s *Service) insertMOMRelations(
	ctx context.Context,
	st *postgres.Store,
	mom postgres.MinuteOfMeeting,
	attendees []sqlcdb.InsertMomAttendeeParams,
	actions []MomActionItemInput,
) ([]postgres.MomAttendee, []postgres.MomActionItem, error) {
	savedAttendees := make([]postgres.MomAttendee, 0, len(attendees))
	for _, a := range attendees {
		if a.ID == "" {
			a.ID = uuid.NewString()
		}
		a.MomID = mom.ID
		if a.AttendeeType == "" {
			switch {
			case a.EmployeeID != nil && *a.EmployeeID != "":
				a.AttendeeType = "employee"
			case a.UserID != nil && *a.UserID != "":
				a.AttendeeType = "user"
			case a.ContactID != nil && *a.ContactID != "":
				a.AttendeeType = "client"
			default:
				a.AttendeeType = "external"
			}
		}
		ins, err := st.InsertMomAttendee(ctx, a)
		if err != nil {
			return nil, nil, err
		}
		savedAttendees = append(savedAttendees, ins)
	}

	savedActions := make([]postgres.MomActionItem, 0, len(actions))
	for _, act := range actions {
		if act.Title == "" {
			continue
		}
		if act.ID == "" {
			act.ID = uuid.NewString()
		}
		if act.Status == "" {
			act.Status = "open"
		}
		taskID := act.TaskID
		shouldCreateTask := taskID == nil && (act.CreateTask == nil || *act.CreateTask)
		if shouldCreateTask {
			assignee := act.AssigneeUserID
			if assignee == nil || *assignee == "" {
				assignee = act.AssigneeEmployeeID
			}
			deptID := act.DepartmentID
			if deptID == nil {
				deptID = mom.DepartmentID
			}
			momRef := mom.ID
			relType := "mom"
			t, err := st.CreateTask(ctx, sqlcdb.CreateTaskParams{
				ID:                uuid.NewString(),
				Title:             act.Title,
				Description:       act.Description,
				AssignedTo:        assignee,
				DueDate:           act.DueDate,
				Status:            "todo",
				Priority:          "normal",
				RelatedEntityType: &relType,
				RelatedEntityID:   &momRef,
				ProjectID:         mom.ProjectID,
				DepartmentID:      deptID,
				MomID:             &momRef,
				ClientID:          mom.ClientID,
				DealID:            mom.DealID,
				CreatedByID:       mom.CreatedByID,
			})
			if err != nil {
				return nil, nil, err
			}
			tid := t.ID
			taskID = &tid
		}
		ins, err := st.InsertMomActionItem(ctx, sqlcdb.InsertMomActionItemParams{
			ID:                 act.ID,
			MomID:              mom.ID,
			TaskID:             taskID,
			Title:              act.Title,
			Description:        act.Description,
			AssigneeEmployeeID: act.AssigneeEmployeeID,
			AssigneeUserID:     act.AssigneeUserID,
			DepartmentID:       act.DepartmentID,
			DueDate:            act.DueDate,
			Status:             act.Status,
		})
		if err != nil {
			return nil, nil, err
		}
		savedActions = append(savedActions, ins)
	}
	return savedAttendees, savedActions, nil
}

func (s *Service) CreateMOMWithRelations(ctx context.Context, in CreateMOMInput) (MOMDetails, error) {
	normalizeMOMCreateDefaults(&in.CreateMOMParams)
	// Sync attendee display names into legacy text[] column automatically
	if len(in.Attendees) == 0 && len(in.AttendeeRecords) > 0 {
		names := make([]string, 0, len(in.AttendeeRecords))
		for _, a := range in.AttendeeRecords {
			if strings.TrimSpace(a.DisplayName) != "" {
				names = append(names, a.DisplayName)
			}
		}
		in.Attendees = names
	}
	var out MOMDetails
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		created, err := st.CreateMOM(ctx, in.CreateMOMParams)
		if err != nil {
			return err
		}
		attendees, actions, err := s.insertMOMRelations(ctx, st, created, in.AttendeeRecords, in.ActionItemRecords)
		if err != nil {
			return err
		}
		out = MOMDetails{
			MinuteOfMeeting:   created,
			AttendeeRecords:   attendees,
			ActionItemRecords: actions,
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{
			Subject: EventMomCreated,
			Payload: map[string]any{
				"momId":        created.ID,
				"momNumber":    created.MomNumber,
				"title":        created.Title,
				"clientId":     created.ClientID,
				"dealId":       created.DealID,
				"projectId":    created.ProjectID,
				"departmentId": created.DepartmentID,
			},
		})
	})
	return out, err
}

func (s *Service) UpdateMOMWithRelations(ctx context.Context, in UpdateMOMInput) (MOMDetails, error) {
	normalizeMOMUpdateDefaults(&in.UpdateMOMParams)
	var out MOMDetails
	err := s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		updated, err := st.UpdateMOM(ctx, in.UpdateMOMParams)
		if err != nil {
			return err
		}
		if in.ReplaceRelations || len(in.AttendeeRecords) > 0 {
			if err := st.DeleteMomAttendees(ctx, updated.ID); err != nil {
				return err
			}
		}
		if in.ReplaceRelations || len(in.ActionItemRecords) > 0 {
			if err := st.DeleteMomActionItems(ctx, updated.ID); err != nil {
				return err
			}
		}
		_, _, err = s.insertMOMRelations(ctx, st, updated, in.AttendeeRecords, in.ActionItemRecords)
		if err != nil {
			return err
		}
		attendees, err := st.ListMomAttendees(ctx, updated.ID)
		if err != nil {
			return err
		}
		actions, err := st.ListMomActionItems(ctx, updated.ID)
		if err != nil {
			return err
		}
		out = MOMDetails{
			MinuteOfMeeting:   updated,
			AttendeeRecords:   attendees,
			ActionItemRecords: actions,
		}
		return outbox.Enqueue(ctx, tx, postgres.Schema, outbox.Event{
			Subject: EventMomUpdated,
			Payload: map[string]any{
				"momId":  updated.ID,
				"status": updated.Status,
			},
		})
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return MOMDetails{}, ErrNotFound
	}
	return out, err
}

func (s *Service) DeleteMOM(ctx context.Context, id string) error {
	return s.store.DeleteMOM(ctx, id)
}

func (s *Service) ListTasksFiltered(ctx context.Context, filter sqlcdb.ListTasksFilteredParams) ([]postgres.Task, error) {
	return s.store.ListTasksFiltered(ctx, filter)
}

func (s *Service) ListDirectoryRefs(ctx context.Context, kind *string) ([]postgres.DirectoryRef, error) {
	return s.store.ListDirectoryRefs(ctx, kind)
}

func (s *Service) HandleDomainEvent(ctx context.Context, eventID, subject string, payload []byte) error {
	if eventID == "" {
		return nil
	}
	return s.store.Tx(ctx, func(st *postgres.Store, tx pgx.Tx) error {
		first, err := outbox.Handled(ctx, tx, postgres.Schema, DomainSyncConsumer, eventID)
		if err != nil || !first {
			return err
		}
		switch {
		case subject == "sales.contact.upserted":
			var body struct {
				ID        string  `json:"id"`
				FirstName string  `json:"firstName"`
				LastName  *string `json:"lastName"`
				Company   *string `json:"company"`
				Email     *string `json:"email"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			display := strings.TrimSpace(body.FirstName)
			if body.LastName != nil && *body.LastName != "" {
				display = strings.TrimSpace(display + " " + *body.LastName)
			}
			if body.Company != nil && *body.Company != "" {
				if display == "" {
					display = *body.Company
				} else {
					display = display + " (" + *body.Company + ")"
				}
			}
			return st.UpsertDirectoryRef(ctx, sqlcdb.UpsertWorkflowDirectoryRefParams{
				Kind:     "contact",
				ID:       body.ID,
				Name:     display,
				Email:    body.Email,
				Metadata: payload,
			})
		case subject == "sales.deal.upserted":
			var body struct {
				ID        string  `json:"id"`
				Title     string  `json:"title"`
				ContactID *string `json:"contactId"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			return st.UpsertDirectoryRef(ctx, sqlcdb.UpsertWorkflowDirectoryRefParams{
				Kind:     "deal",
				ID:       body.ID,
				Name:     body.Title,
				ParentID: body.ContactID,
				Metadata: payload,
			})
		case subject == "system.project.upserted":
			var body struct {
				ID           string  `json:"id"`
				Name         string  `json:"name"`
				DepartmentID *string `json:"departmentId"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			return st.UpsertDirectoryRef(ctx, sqlcdb.UpsertWorkflowDirectoryRefParams{
				Kind:     "project",
				ID:       body.ID,
				Name:     body.Name,
				ParentID: body.DepartmentID,
				Metadata: payload,
			})
		case subject == "hr.employee.created" || subject == "hr.employee.upserted":
			var body struct {
				ID           string  `json:"id"`
				EmployeeID   string  `json:"employeeId"`
				Name         string  `json:"name"`
				NameAr       *string `json:"nameAr"`
				Email        *string `json:"email"`
				DepartmentID *string `json:"departmentId"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			eid := body.ID
			if eid == "" {
				eid = body.EmployeeID
			}
			if eid == "" {
				return nil
			}
			name := body.Name
			if name == "" && body.Email != nil {
				name = *body.Email
			}
			return st.UpsertDirectoryRef(ctx, sqlcdb.UpsertWorkflowDirectoryRefParams{
				Kind:     "employee",
				ID:       eid,
				Name:     name,
				NameAr:   body.NameAr,
				Email:    body.Email,
				ParentID: body.DepartmentID,
				Metadata: payload,
			})
		case subject == "hr.department.upserted":
			var body struct {
				ID       string  `json:"id"`
				Name     string  `json:"name"`
				NameAr   *string `json:"nameAr"`
				ParentID *string `json:"parentId"`
			}
			if err := json.Unmarshal(payload, &body); err != nil {
				return err
			}
			if body.ID == "" {
				return nil
			}
			return st.UpsertDirectoryRef(ctx, sqlcdb.UpsertWorkflowDirectoryRefParams{
				Kind:     "department",
				ID:       body.ID,
				Name:     body.Name,
				NameAr:   body.NameAr,
				ParentID: body.ParentID,
				Metadata: payload,
			})
		}
		return nil
	})
}
