-- +goose Up
-- Extend workflow.minute_of_meeting to link clients, deals, projects, departments, teams, and users
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS title_ar text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS deal_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS department_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS team_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS organizer_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS created_by_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS approved_by_id text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS agenda text NOT NULL DEFAULT '';
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS decisions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS signature_url text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS pdf_storage_path text;
ALTER TABLE workflow.minute_of_meeting ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_mom_client_id ON workflow.minute_of_meeting (client_id);
CREATE INDEX IF NOT EXISTS idx_mom_deal_id ON workflow.minute_of_meeting (deal_id);
CREATE INDEX IF NOT EXISTS idx_mom_project_id ON workflow.minute_of_meeting (project_id);
CREATE INDEX IF NOT EXISTS idx_mom_department_id ON workflow.minute_of_meeting (department_id);
CREATE INDEX IF NOT EXISTS idx_mom_team_id ON workflow.minute_of_meeting (team_id);
CREATE INDEX IF NOT EXISTS idx_mom_organizer_id ON workflow.minute_of_meeting (organizer_id);
CREATE INDEX IF NOT EXISTS idx_mom_created_by_id ON workflow.minute_of_meeting (created_by_id);

-- Structured 1:N / M:N attendee links per MoM (employees, users, client contacts, external guests)
CREATE TABLE IF NOT EXISTS workflow.mom_attendee (
    id text PRIMARY KEY,
    mom_id text NOT NULL REFERENCES workflow.minute_of_meeting(id) ON DELETE CASCADE,
    attendee_type text NOT NULL DEFAULT 'employee' CHECK (attendee_type IN ('employee', 'user', 'client', 'external')),
    employee_id text,
    user_id text,
    contact_id text,
    department_id text,
    display_name text NOT NULL,
    email text,
    role_title text,
    attended boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mom_attendee_mom_id ON workflow.mom_attendee (mom_id);
CREATE INDEX IF NOT EXISTS idx_mom_attendee_employee_id ON workflow.mom_attendee (employee_id);
CREATE INDEX IF NOT EXISTS idx_mom_attendee_user_id ON workflow.mom_attendee (user_id);
CREATE INDEX IF NOT EXISTS idx_mom_attendee_contact_id ON workflow.mom_attendee (contact_id);
CREATE INDEX IF NOT EXISTS idx_mom_attendee_department_id ON workflow.mom_attendee (department_id);

-- Structured MoM action items optionally linked to trackable workflow.task records
CREATE TABLE IF NOT EXISTS workflow.mom_action_item (
    id text PRIMARY KEY,
    mom_id text NOT NULL REFERENCES workflow.minute_of_meeting(id) ON DELETE CASCADE,
    task_id text REFERENCES workflow.task(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    assignee_employee_id text,
    assignee_user_id text,
    department_id text,
    due_date date,
    status text NOT NULL DEFAULT 'open',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mom_action_item_mom_id ON workflow.mom_action_item (mom_id);
CREATE INDEX IF NOT EXISTS idx_mom_action_item_task_id ON workflow.mom_action_item (task_id);
CREATE INDEX IF NOT EXISTS idx_mom_action_item_assignee_employee_id ON workflow.mom_action_item (assignee_employee_id);
CREATE INDEX IF NOT EXISTS idx_mom_action_item_department_id ON workflow.mom_action_item (department_id);

-- Extend workflow.task with direct project, department, mom, client, and deal links
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS department_id text;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS mom_id text REFERENCES workflow.minute_of_meeting(id) ON DELETE SET NULL;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS deal_id text;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS created_by_id text;

CREATE INDEX IF NOT EXISTS idx_task_project_id ON workflow.task (project_id);
CREATE INDEX IF NOT EXISTS idx_task_department_id ON workflow.task (department_id);
CREATE INDEX IF NOT EXISTS idx_task_mom_id ON workflow.task (mom_id);
CREATE INDEX IF NOT EXISTS idx_task_client_id ON workflow.task (client_id);
CREATE INDEX IF NOT EXISTS idx_task_deal_id ON workflow.task (deal_id);

-- Cross-service directory read-model projection (clients, deals, projects, employees, departments, teams, users)
CREATE TABLE IF NOT EXISTS workflow.directory_ref (
    kind text NOT NULL CHECK (kind IN ('contact', 'deal', 'project', 'employee', 'department', 'team', 'user')),
    id text NOT NULL,
    name text NOT NULL,
    name_ar text,
    email text,
    parent_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS idx_wf_directory_ref_parent ON workflow.directory_ref (kind, parent_id);

-- +goose Down
DROP TABLE IF EXISTS workflow.directory_ref;
DROP TABLE IF EXISTS workflow.mom_action_item;
DROP TABLE IF EXISTS workflow.mom_attendee;
DROP INDEX IF EXISTS workflow.idx_task_project_id;
DROP INDEX IF EXISTS workflow.idx_task_department_id;
DROP INDEX IF EXISTS workflow.idx_task_mom_id;
DROP INDEX IF EXISTS workflow.idx_task_client_id;
DROP INDEX IF EXISTS workflow.idx_task_deal_id;
DROP INDEX IF EXISTS workflow.idx_mom_client_id;
DROP INDEX IF EXISTS workflow.idx_mom_deal_id;
DROP INDEX IF EXISTS workflow.idx_mom_project_id;
DROP INDEX IF EXISTS workflow.idx_mom_department_id;
DROP INDEX IF EXISTS workflow.idx_mom_team_id;
DROP INDEX IF EXISTS workflow.idx_mom_organizer_id;
DROP INDEX IF EXISTS workflow.idx_mom_created_by_id;
