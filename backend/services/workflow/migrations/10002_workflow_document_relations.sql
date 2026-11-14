-- +goose Up
-- +goose StatementBegin
-- Enrich official_letter with client, deal, project, employee, department, signature, and document relations.
ALTER TABLE workflow.official_letter
    ADD COLUMN IF NOT EXISTS client_id            text,
    ADD COLUMN IF NOT EXISTS deal_id              text,
    ADD COLUMN IF NOT EXISTS project_id           text,
    ADD COLUMN IF NOT EXISTS employee_id          text,
    ADD COLUMN IF NOT EXISTS department_id        text,
    ADD COLUMN IF NOT EXISTS document_id          text,
    ADD COLUMN IF NOT EXISTS created_by_id        text,
    ADD COLUMN IF NOT EXISTS signed_by_id         text,
    ADD COLUMN IF NOT EXISTS signature_request_id text REFERENCES workflow.signature_request(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS file_url             text,
    ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_official_letter_client_id ON workflow.official_letter (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_official_letter_deal_id ON workflow.official_letter (deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_official_letter_project_id ON workflow.official_letter (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_official_letter_employee_id ON workflow.official_letter (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_official_letter_department_id ON workflow.official_letter (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_official_letter_document_id ON workflow.official_letter (document_id) WHERE document_id IS NOT NULL;

-- Enrich signature_request with client, deal, project, employee, department, file_url, and creator relations.
ALTER TABLE workflow.signature_request
    ADD COLUMN IF NOT EXISTS client_id     text,
    ADD COLUMN IF NOT EXISTS deal_id       text,
    ADD COLUMN IF NOT EXISTS project_id    text,
    ADD COLUMN IF NOT EXISTS employee_id   text,
    ADD COLUMN IF NOT EXISTS department_id text,
    ADD COLUMN IF NOT EXISTS created_by_id text,
    ADD COLUMN IF NOT EXISTS file_url      text,
    ADD COLUMN IF NOT EXISTS updated_at    timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_signature_request_client_id ON workflow.signature_request (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signature_request_employee_id ON workflow.signature_request (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signature_request_project_id ON workflow.signature_request (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signature_request_deal_id ON workflow.signature_request (deal_id) WHERE deal_id IS NOT NULL;

-- Enrich approval_request with normalized entity/document/client/project/department/employee relations.
ALTER TABLE workflow.approval_request
    ADD COLUMN IF NOT EXISTS entity_type   text,
    ADD COLUMN IF NOT EXISTS document_id   text,
    ADD COLUMN IF NOT EXISTS client_id     text,
    ADD COLUMN IF NOT EXISTS deal_id       text,
    ADD COLUMN IF NOT EXISTS project_id    text,
    ADD COLUMN IF NOT EXISTS department_id text,
    ADD COLUMN IF NOT EXISTS employee_id   text;

CREATE INDEX IF NOT EXISTS idx_approval_request_entity_type_id ON workflow.approval_request (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_request_document_id ON workflow.approval_request (document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_request_client_id ON workflow.approval_request (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_request_project_id ON workflow.approval_request (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_request_department_id ON workflow.approval_request (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_approval_request_employee_id ON workflow.approval_request (employee_id) WHERE employee_id IS NOT NULL;

-- Enrich calendar_event with client, deal, project, department, employee, MoM, and document relations.
ALTER TABLE workflow.calendar_event
    ADD COLUMN IF NOT EXISTS client_id     text,
    ADD COLUMN IF NOT EXISTS deal_id       text,
    ADD COLUMN IF NOT EXISTS project_id    text,
    ADD COLUMN IF NOT EXISTS department_id text,
    ADD COLUMN IF NOT EXISTS employee_id   text,
    ADD COLUMN IF NOT EXISTS mom_id        text REFERENCES workflow.minute_of_meeting(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS document_id   text;

CREATE INDEX IF NOT EXISTS idx_calendar_event_client_id ON workflow.calendar_event (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_event_deal_id ON workflow.calendar_event (deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_event_project_id ON workflow.calendar_event (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_event_employee_id ON workflow.calendar_event (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_event_mom_id ON workflow.calendar_event (mom_id) WHERE mom_id IS NOT NULL;

-- Ensure workflow.task has explicit employee_id and document_id links alongside project/department/client/deal/mom.
ALTER TABLE workflow.task
    ADD COLUMN IF NOT EXISTS employee_id text,
    ADD COLUMN IF NOT EXISTS document_id text;

CREATE INDEX IF NOT EXISTS idx_workflow_task_employee_id ON workflow.task (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_task_document_id ON workflow.task (document_id) WHERE document_id IS NOT NULL;

-- Canonical relational Contracts table in workflow schema connecting contacts, deals, projects, quotes, invoices, employees, and documents.
CREATE TABLE IF NOT EXISTS workflow.contract (
    id              text          PRIMARY KEY,
    contract_number text          NOT NULL UNIQUE,
    title           text          NOT NULL,
    title_ar        text,
    contract_type   text          NOT NULL DEFAULT 'service',
    contact_id      text,
    deal_id         text,
    project_id      text,
    quotation_id    text,
    invoice_id      text,
    employee_id     text,
    department_id   text,
    document_id     text,
    file_url        text,
    status          text          NOT NULL DEFAULT 'draft',
    start_date      date,
    end_date        date,
    value           numeric(14,3) NOT NULL DEFAULT 0,
    currency        text          NOT NULL DEFAULT 'BHD',
    notes           text,
    created_by_id   text,
    signed_by_id    text,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_contract_contact_id ON workflow.contract (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_contract_deal_id ON workflow.contract (deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_contract_project_id ON workflow.contract (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_contract_quotation_id ON workflow.contract (quotation_id) WHERE quotation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_contract_invoice_id ON workflow.contract (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_contract_employee_id ON workflow.contract (employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_contract_status ON workflow.contract (status);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS workflow.contract;
-- +goose StatementEnd
