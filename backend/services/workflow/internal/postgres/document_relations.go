package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

type ContractRecord struct {
	ID             string     `json:"id"`
	ContractNumber string     `json:"contractNumber"`
	Title          string     `json:"title"`
	TitleAr        *string    `json:"titleAr,omitempty"`
	ContractType   string     `json:"contractType"`
	ContactID      *string    `json:"contactId,omitempty"`
	DealID         *string    `json:"dealId,omitempty"`
	ProjectID      *string    `json:"projectId,omitempty"`
	QuotationID    *string    `json:"quotationId,omitempty"`
	InvoiceID      *string    `json:"invoiceId,omitempty"`
	EmployeeID     *string    `json:"employeeId,omitempty"`
	DepartmentID   *string    `json:"departmentId,omitempty"`
	DocumentID     *string    `json:"documentId,omitempty"`
	FileURL        *string    `json:"fileUrl,omitempty"`
	Status         string     `json:"status"`
	StartDate      *time.Time `json:"startDate,omitempty"`
	EndDate        *time.Time `json:"endDate,omitempty"`
	Value          string     `json:"value"`
	Currency       string     `json:"currency"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedByID    *string    `json:"createdById,omitempty"`
	SignedByID     *string    `json:"signedById,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type ContractFilter struct {
	ContactID    string
	DealID       string
	ProjectID    string
	QuotationID  string
	InvoiceID    string
	EmployeeID   string
	DepartmentID string
	Status       string
}

type OfficialLetterRelational struct {
	ID                 string     `json:"id"`
	LetterNumber       string     `json:"letterNumber"`
	TemplateID         *string    `json:"templateId,omitempty"`
	RecipientName      string     `json:"recipientName"`
	RecipientTitle     *string    `json:"recipientTitle,omitempty"`
	Subject            string     `json:"subject"`
	Body               string     `json:"body"`
	Status             string     `json:"status"`
	IssuedAt           *time.Time `json:"issuedAt,omitempty"`
	ClientID           *string    `json:"clientId,omitempty"`
	DealID             *string    `json:"dealId,omitempty"`
	ProjectID          *string    `json:"projectId,omitempty"`
	EmployeeID         *string    `json:"employeeId,omitempty"`
	DepartmentID       *string    `json:"departmentId,omitempty"`
	DocumentID         *string    `json:"documentId,omitempty"`
	CreatedByID        *string    `json:"createdById,omitempty"`
	SignedByID         *string    `json:"signedById,omitempty"`
	SignatureRequestID *string    `json:"signatureRequestId,omitempty"`
	FileURL            *string    `json:"fileUrl,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

type SignatureRequestRelational struct {
	ID            string     `json:"id"`
	Title         string     `json:"title"`
	DocumentType  string     `json:"documentType"`
	DocumentID    string     `json:"documentId"`
	RequestedFrom string     `json:"requestedFrom"`
	Status        string     `json:"status"`
	SignatureURL  *string    `json:"signatureUrl,omitempty"`
	SignedAt      *time.Time `json:"signedAt,omitempty"`
	ExpiresAt     *time.Time `json:"expiresAt,omitempty"`
	ClientID      *string    `json:"clientId,omitempty"`
	DealID        *string    `json:"dealId,omitempty"`
	ProjectID     *string    `json:"projectId,omitempty"`
	EmployeeID    *string    `json:"employeeId,omitempty"`
	DepartmentID  *string    `json:"departmentId,omitempty"`
	CreatedByID   *string    `json:"createdById,omitempty"`
	FileURL       *string    `json:"fileUrl,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type ApprovalRequestRelational struct {
	ID           string    `json:"id"`
	Kind         string    `json:"kind"`
	EntityType   *string   `json:"entityType,omitempty"`
	EntityID     string    `json:"entityId"`
	RequesterID  string    `json:"requesterId"`
	Status       string    `json:"status"`
	Priority     string    `json:"priority"`
	Reason       *string   `json:"reason,omitempty"`
	DocumentID   *string   `json:"documentId,omitempty"`
	ClientID     *string   `json:"clientId,omitempty"`
	DealID       *string   `json:"dealId,omitempty"`
	ProjectID    *string   `json:"projectId,omitempty"`
	DepartmentID *string   `json:"departmentId,omitempty"`
	EmployeeID   *string   `json:"employeeId,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CalendarEventRelational struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Description  *string   `json:"description,omitempty"`
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	IsAllDay     bool      `json:"isAllDay"`
	Location     *string   `json:"location,omitempty"`
	OrganizerID  string    `json:"organizerId"`
	EventType    string    `json:"eventType"`
	ClientID     *string   `json:"clientId,omitempty"`
	DealID       *string   `json:"dealId,omitempty"`
	ProjectID    *string   `json:"projectId,omitempty"`
	DepartmentID *string   `json:"departmentId,omitempty"`
	EmployeeID   *string   `json:"employeeId,omitempty"`
	MomID        *string   `json:"momId,omitempty"`
	DocumentID   *string   `json:"documentId,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

type RelationFilter struct {
	ClientID     string
	DealID       string
	ProjectID    string
	DepartmentID string
	EmployeeID   string
	DocumentID   string
	DocumentType string
	EntityType   string
	EntityID     string
	MomID        string
	Status       string
}

func (s *Store) ListContractsFiltered(ctx context.Context, f ContractFilter) ([]ContractRecord, error) {
	rows, err := s.dbConn().Query(ctx, `
		SELECT id, contract_number, title, title_ar, contract_type,
		       contact_id, deal_id, project_id, quotation_id, invoice_id, employee_id, department_id, document_id, file_url,
		       status, start_date, end_date, value::text, currency, notes, created_by_id, signed_by_id, created_at, updated_at
		FROM workflow.contract
		WHERE ($1 = '' OR contact_id = $1)
		  AND ($2 = '' OR deal_id = $2)
		  AND ($3 = '' OR project_id = $3)
		  AND ($4 = '' OR quotation_id = $4)
		  AND ($5 = '' OR invoice_id = $5)
		  AND ($6 = '' OR employee_id = $6)
		  AND ($7 = '' OR department_id = $7)
		  AND ($8 = '' OR status = $8)
		ORDER BY created_at DESC
	`, f.ContactID, f.DealID, f.ProjectID, f.QuotationID, f.InvoiceID, f.EmployeeID, f.DepartmentID, f.Status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ContractRecord, 0)
	for rows.Next() {
		var r ContractRecord
		if err := rows.Scan(
			&r.ID, &r.ContractNumber, &r.Title, &r.TitleAr, &r.ContractType,
			&r.ContactID, &r.DealID, &r.ProjectID, &r.QuotationID, &r.InvoiceID, &r.EmployeeID, &r.DepartmentID, &r.DocumentID, &r.FileURL,
			&r.Status, &r.StartDate, &r.EndDate, &r.Value, &r.Currency, &r.Notes, &r.CreatedByID, &r.SignedByID, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *Store) GetContractRelational(ctx context.Context, id string) (ContractRecord, error) {
	var r ContractRecord
	err := s.dbConn().QueryRow(ctx, `
		SELECT id, contract_number, title, title_ar, contract_type,
		       contact_id, deal_id, project_id, quotation_id, invoice_id, employee_id, department_id, document_id, file_url,
		       status, start_date, end_date, value::text, currency, notes, created_by_id, signed_by_id, created_at, updated_at
		FROM workflow.contract WHERE id = $1 LIMIT 1
	`, id).Scan(
		&r.ID, &r.ContractNumber, &r.Title, &r.TitleAr, &r.ContractType,
		&r.ContactID, &r.DealID, &r.ProjectID, &r.QuotationID, &r.InvoiceID, &r.EmployeeID, &r.DepartmentID, &r.DocumentID, &r.FileURL,
		&r.Status, &r.StartDate, &r.EndDate, &r.Value, &r.Currency, &r.Notes, &r.CreatedByID, &r.SignedByID, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

func (s *Store) UpsertContractRelational(ctx context.Context, in ContractRecord) (ContractRecord, error) {
	var r ContractRecord
	if in.ContractType == "" {
		in.ContractType = "service"
	}
	if in.Status == "" {
		in.Status = "draft"
	}
	if in.Value == "" {
		in.Value = "0"
	}
	if in.Currency == "" {
		in.Currency = "BHD"
	}
	err := s.dbConn().QueryRow(ctx, `
		INSERT INTO workflow.contract (
			id, contract_number, title, title_ar, contract_type,
			contact_id, deal_id, project_id, quotation_id, invoice_id, employee_id, department_id, document_id, file_url,
			status, start_date, end_date, value, currency, notes, created_by_id, signed_by_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18::numeric(14,3), $19, $20, $21, $22, now(), now()
		)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			title_ar = EXCLUDED.title_ar,
			contract_type = EXCLUDED.contract_type,
			contact_id = EXCLUDED.contact_id,
			deal_id = EXCLUDED.deal_id,
			project_id = EXCLUDED.project_id,
			quotation_id = EXCLUDED.quotation_id,
			invoice_id = EXCLUDED.invoice_id,
			employee_id = EXCLUDED.employee_id,
			department_id = EXCLUDED.department_id,
			document_id = EXCLUDED.document_id,
			file_url = EXCLUDED.file_url,
			status = EXCLUDED.status,
			start_date = EXCLUDED.start_date,
			end_date = EXCLUDED.end_date,
			value = EXCLUDED.value,
			currency = EXCLUDED.currency,
			notes = EXCLUDED.notes,
			signed_by_id = COALESCE(EXCLUDED.signed_by_id, workflow.contract.signed_by_id),
			updated_at = now()
		RETURNING id, contract_number, title, title_ar, contract_type,
		          contact_id, deal_id, project_id, quotation_id, invoice_id, employee_id, department_id, document_id, file_url,
		          status, start_date, end_date, value::text, currency, notes, created_by_id, signed_by_id, created_at, updated_at
	`, in.ID, in.ContractNumber, in.Title, in.TitleAr, in.ContractType,
		in.ContactID, in.DealID, in.ProjectID, in.QuotationID, in.InvoiceID, in.EmployeeID, in.DepartmentID, in.DocumentID, in.FileURL,
		in.Status, in.StartDate, in.EndDate, in.Value, in.Currency, in.Notes, in.CreatedByID, in.SignedByID,
	).Scan(
		&r.ID, &r.ContractNumber, &r.Title, &r.TitleAr, &r.ContractType,
		&r.ContactID, &r.DealID, &r.ProjectID, &r.QuotationID, &r.InvoiceID, &r.EmployeeID, &r.DepartmentID, &r.DocumentID, &r.FileURL,
		&r.Status, &r.StartDate, &r.EndDate, &r.Value, &r.Currency, &r.Notes, &r.CreatedByID, &r.SignedByID, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

func (s *Store) DeleteContractRelational(ctx context.Context, id string) error {
	_, err := s.dbConn().Exec(ctx, `DELETE FROM workflow.contract WHERE id = $1`, id)
	return err
}

func (s *Store) CreateOfficialLetterRelational(ctx context.Context, in OfficialLetterRelational) (OfficialLetterRelational, error) {
	if in.Status == "" {
		in.Status = "draft"
	}
	var out OfficialLetterRelational
	err := s.dbConn().QueryRow(ctx, `
		INSERT INTO workflow.official_letter (
			id, letter_number, template_id, recipient_name, recipient_title, subject, body, status,
			client_id, deal_id, project_id, employee_id, department_id, document_id,
			created_by_id, signed_by_id, signature_request_id, file_url, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, now(), now()
		)
		RETURNING id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at,
		          client_id, deal_id, project_id, employee_id, department_id, document_id,
		          created_by_id, signed_by_id, signature_request_id, file_url, created_at, updated_at
	`, in.ID, in.LetterNumber, in.TemplateID, in.RecipientName, in.RecipientTitle, in.Subject, in.Body, in.Status,
		in.ClientID, in.DealID, in.ProjectID, in.EmployeeID, in.DepartmentID, in.DocumentID,
		in.CreatedByID, in.SignedByID, in.SignatureRequestID, in.FileURL,
	).Scan(
		&out.ID, &out.LetterNumber, &out.TemplateID, &out.RecipientName, &out.RecipientTitle, &out.Subject, &out.Body, &out.Status, &out.IssuedAt,
		&out.ClientID, &out.DealID, &out.ProjectID, &out.EmployeeID, &out.DepartmentID, &out.DocumentID,
		&out.CreatedByID, &out.SignedByID, &out.SignatureRequestID, &out.FileURL, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (s *Store) ListOfficialLettersFiltered(ctx context.Context, f RelationFilter) ([]OfficialLetterRelational, error) {
	rows, err := s.dbConn().Query(ctx, `
		SELECT id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at,
		       client_id, deal_id, project_id, employee_id, department_id, document_id,
		       created_by_id, signed_by_id, signature_request_id, file_url, created_at, updated_at
		FROM workflow.official_letter
		WHERE ($1 = '' OR client_id = $1)
		  AND ($2 = '' OR deal_id = $2)
		  AND ($3 = '' OR project_id = $3)
		  AND ($4 = '' OR employee_id = $4)
		  AND ($5 = '' OR department_id = $5)
		  AND ($6 = '' OR document_id = $6)
		  AND ($7 = '' OR status = $7)
		ORDER BY created_at DESC
	`, f.ClientID, f.DealID, f.ProjectID, f.EmployeeID, f.DepartmentID, f.DocumentID, f.Status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]OfficialLetterRelational, 0)
	for rows.Next() {
		var item OfficialLetterRelational
		if err := rows.Scan(
			&item.ID, &item.LetterNumber, &item.TemplateID, &item.RecipientName, &item.RecipientTitle, &item.Subject, &item.Body, &item.Status, &item.IssuedAt,
			&item.ClientID, &item.DealID, &item.ProjectID, &item.EmployeeID, &item.DepartmentID, &item.DocumentID,
			&item.CreatedByID, &item.SignedByID, &item.SignatureRequestID, &item.FileURL, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) CreateSignatureRequestRelational(ctx context.Context, in SignatureRequestRelational) (SignatureRequestRelational, error) {
	if in.Status == "" {
		in.Status = "pending"
	}
	var out SignatureRequestRelational
	err := s.dbConn().QueryRow(ctx, `
		INSERT INTO workflow.signature_request (
			id, title, document_type, document_id, requested_from, status, expires_at,
			client_id, deal_id, project_id, employee_id, department_id, created_by_id, file_url, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13, $14, now(), now()
		)
		RETURNING id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at,
		          client_id, deal_id, project_id, employee_id, department_id, created_by_id, file_url, created_at, updated_at
	`, in.ID, in.Title, in.DocumentType, in.DocumentID, in.RequestedFrom, in.Status, in.ExpiresAt,
		in.ClientID, in.DealID, in.ProjectID, in.EmployeeID, in.DepartmentID, in.CreatedByID, in.FileURL,
	).Scan(
		&out.ID, &out.Title, &out.DocumentType, &out.DocumentID, &out.RequestedFrom, &out.Status, &out.SignatureURL, &out.SignedAt, &out.ExpiresAt,
		&out.ClientID, &out.DealID, &out.ProjectID, &out.EmployeeID, &out.DepartmentID, &out.CreatedByID, &out.FileURL, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (s *Store) ListSignatureRequestsFiltered(ctx context.Context, f RelationFilter) ([]SignatureRequestRelational, error) {
	rows, err := s.dbConn().Query(ctx, `
		SELECT id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at,
		       client_id, deal_id, project_id, employee_id, department_id, created_by_id, file_url, created_at, updated_at
		FROM workflow.signature_request
		WHERE ($1 = '' OR document_type = $1)
		  AND ($2 = '' OR document_id = $2)
		  AND ($3 = '' OR client_id = $3)
		  AND ($4 = '' OR deal_id = $4)
		  AND ($5 = '' OR project_id = $5)
		  AND ($6 = '' OR employee_id = $6)
		  AND ($7 = '' OR status = $7)
		ORDER BY created_at DESC
	`, f.DocumentType, f.DocumentID, f.ClientID, f.DealID, f.ProjectID, f.EmployeeID, f.Status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]SignatureRequestRelational, 0)
	for rows.Next() {
		var item SignatureRequestRelational
		if err := rows.Scan(
			&item.ID, &item.Title, &item.DocumentType, &item.DocumentID, &item.RequestedFrom, &item.Status, &item.SignatureURL, &item.SignedAt, &item.ExpiresAt,
			&item.ClientID, &item.DealID, &item.ProjectID, &item.EmployeeID, &item.DepartmentID, &item.CreatedByID, &item.FileURL, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) CreateApprovalRequestRelational(ctx context.Context, in ApprovalRequestRelational) (ApprovalRequestRelational, error) {
	if in.Status == "" {
		in.Status = "pending"
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
	if in.EntityType == nil && in.Kind != "" {
		k := in.Kind
		in.EntityType = &k
	}
	var out ApprovalRequestRelational
	err := s.dbConn().QueryRow(ctx, `
		INSERT INTO workflow.approval_request (
			id, kind, entity_type, entity_id, requester_id, status, priority, reason,
			document_id, client_id, deal_id, project_id, department_id, employee_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, now(), now()
		)
		RETURNING id, kind, entity_type, entity_id, requester_id, status, priority, reason,
		          document_id, client_id, deal_id, project_id, department_id, employee_id, created_at, updated_at
	`, in.ID, in.Kind, in.EntityType, in.EntityID, in.RequesterID, in.Status, in.Priority, in.Reason,
		in.DocumentID, in.ClientID, in.DealID, in.ProjectID, in.DepartmentID, in.EmployeeID,
	).Scan(
		&out.ID, &out.Kind, &out.EntityType, &out.EntityID, &out.RequesterID, &out.Status, &out.Priority, &out.Reason,
		&out.DocumentID, &out.ClientID, &out.DealID, &out.ProjectID, &out.DepartmentID, &out.EmployeeID, &out.CreatedAt, &out.UpdatedAt,
	)
	return out, err
}

func (s *Store) ListApprovalRequestsFiltered(ctx context.Context, f RelationFilter) ([]ApprovalRequestRelational, error) {
	rows, err := s.dbConn().Query(ctx, `
		SELECT id, kind, entity_type, entity_id, requester_id, status, priority, reason,
		       document_id, client_id, deal_id, project_id, department_id, employee_id, created_at, updated_at
		FROM workflow.approval_request
		WHERE ($1 = '' OR entity_type = $1 OR kind = $1)
		  AND ($2 = '' OR entity_id = $2)
		  AND ($3 = '' OR document_id = $3)
		  AND ($4 = '' OR client_id = $4)
		  AND ($5 = '' OR deal_id = $5)
		  AND ($6 = '' OR project_id = $6)
		  AND ($7 = '' OR department_id = $7)
		  AND ($8 = '' OR employee_id = $8)
		  AND ($9 = '' OR status = $9)
		ORDER BY created_at DESC
	`, f.EntityType, f.EntityID, f.DocumentID, f.ClientID, f.DealID, f.ProjectID, f.DepartmentID, f.EmployeeID, f.Status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]ApprovalRequestRelational, 0)
	for rows.Next() {
		var item ApprovalRequestRelational
		if err := rows.Scan(
			&item.ID, &item.Kind, &item.EntityType, &item.EntityID, &item.RequesterID, &item.Status, &item.Priority, &item.Reason,
			&item.DocumentID, &item.ClientID, &item.DealID, &item.ProjectID, &item.DepartmentID, &item.EmployeeID, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (s *Store) CreateCalendarEventRelational(ctx context.Context, in CalendarEventRelational) (CalendarEventRelational, error) {
	if in.EventType == "" {
		in.EventType = "general"
	}
	var out CalendarEventRelational
	err := s.dbConn().QueryRow(ctx, `
		INSERT INTO workflow.calendar_event (
			id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type,
			client_id, deal_id, project_id, department_id, employee_id, mom_id, document_id, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, $16, now()
		)
		RETURNING id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type,
		          client_id, deal_id, project_id, department_id, employee_id, mom_id, document_id, created_at
	`, in.ID, in.Title, in.Description, in.StartTime, in.EndTime, in.IsAllDay, in.Location, in.OrganizerID, in.EventType,
		in.ClientID, in.DealID, in.ProjectID, in.DepartmentID, in.EmployeeID, in.MomID, in.DocumentID,
	).Scan(
		&out.ID, &out.Title, &out.Description, &out.StartTime, &out.EndTime, &out.IsAllDay, &out.Location, &out.OrganizerID, &out.EventType,
		&out.ClientID, &out.DealID, &out.ProjectID, &out.DepartmentID, &out.EmployeeID, &out.MomID, &out.DocumentID, &out.CreatedAt,
	)
	return out, err
}

func (s *Store) ListCalendarEventsFiltered(ctx context.Context, f RelationFilter) ([]CalendarEventRelational, error) {
	rows, err := s.dbConn().Query(ctx, `
		SELECT id, title, description, start_time, end_time, is_all_day, location, organizer_id, event_type,
		       client_id, deal_id, project_id, department_id, employee_id, mom_id, document_id, created_at
		FROM workflow.calendar_event
		WHERE ($1 = '' OR client_id = $1)
		  AND ($2 = '' OR deal_id = $2)
		  AND ($3 = '' OR project_id = $3)
		  AND ($4 = '' OR department_id = $4)
		  AND ($5 = '' OR employee_id = $5)
		  AND ($6 = '' OR mom_id = $6)
		  AND ($7 = '' OR document_id = $7)
		ORDER BY start_time ASC
	`, f.ClientID, f.DealID, f.ProjectID, f.DepartmentID, f.EmployeeID, f.MomID, f.DocumentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]CalendarEventRelational, 0)
	for rows.Next() {
		var item CalendarEventRelational
		if err := rows.Scan(
			&item.ID, &item.Title, &item.Description, &item.StartTime, &item.EndTime, &item.IsAllDay, &item.Location, &item.OrganizerID, &item.EventType,
			&item.ClientID, &item.DealID, &item.ProjectID, &item.DepartmentID, &item.EmployeeID, &item.MomID, &item.DocumentID, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

var _ = pgx.ErrNoRows
