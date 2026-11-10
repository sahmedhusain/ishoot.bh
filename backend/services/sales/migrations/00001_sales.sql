-- +goose Up
CREATE TABLE IF NOT EXISTS sales.contact (
    id text PRIMARY KEY,
    first_name text NOT NULL,
    last_name text,
    email text,
    phone text,
    company text,
    contact_type text NOT NULL DEFAULT 'lead',
    status text NOT NULL DEFAULT 'active',
    notes text,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_email_idx ON sales.contact (email);
CREATE INDEX IF NOT EXISTS contact_phone_idx ON sales.contact (phone);
CREATE TABLE IF NOT EXISTS sales.deal (
    id text PRIMARY KEY,
    title text NOT NULL,
    contact_id text REFERENCES sales.contact(id) ON DELETE SET NULL,
    stage text NOT NULL DEFAULT 'lead',
    value numeric(14, 3) NOT NULL DEFAULT 0.000,
    currency text NOT NULL DEFAULT '',
    probability integer NOT NULL DEFAULT 20,
    expected_close_date date,
    status text NOT NULL DEFAULT 'open',
    assigned_to text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_stage_status_idx ON sales.deal (stage, status);
CREATE TABLE IF NOT EXISTS sales.inquiry (
    id text PRIMARY KEY,
    inquiry_type text NOT NULL DEFAULT 'general',
    subject text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    priority text NOT NULL DEFAULT 'normal',
    requester_name text NOT NULL,
    requester_email text NOT NULL,
    requester_phone text,
    assignee_id text,
    deal_id text REFERENCES sales.deal(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inquiry_status_idx ON sales.inquiry (status);
CREATE TABLE IF NOT EXISTS sales.quotation (
    id text PRIMARY KEY,
    quotation_number text NOT NULL UNIQUE,
    deal_id text REFERENCES sales.deal(id) ON DELETE SET NULL,
    contact_id text REFERENCES sales.contact(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'draft',
    subtotal numeric(14, 3) NOT NULL DEFAULT 0.000,
    discount numeric(14, 3) NOT NULL DEFAULT 0.000,
    vat_rate numeric(5, 2) NOT NULL DEFAULT 0.00,
    vat_amount numeric(14, 3) NOT NULL DEFAULT 0.000,
    total numeric(14, 3) NOT NULL DEFAULT 0.000,
    currency text NOT NULL DEFAULT '',
    valid_until date,
    terms text,
    notes text,
    issued_at timestamptz,
    accepted_at timestamptz,
    rejected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quotation_number_idx ON sales.quotation (quotation_number);
CREATE TABLE IF NOT EXISTS sales.quotation_item (
    id text PRIMARY KEY,
    quotation_id text NOT NULL REFERENCES sales.quotation(id) ON DELETE CASCADE,
    description text NOT NULL,
    quantity numeric(10, 2) NOT NULL DEFAULT 1.00,
    unit_price numeric(14, 3) NOT NULL DEFAULT 0.000,
    amount numeric(14, 3) NOT NULL DEFAULT 0.000,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS q_item_quotation_idx ON sales.quotation_item (quotation_id, sort_order);
CREATE TABLE IF NOT EXISTS sales.campaign (
    id text PRIMARY KEY,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS sales.campaign;
DROP TABLE IF EXISTS sales.quotation_item;
DROP TABLE IF EXISTS sales.quotation;
DROP TABLE IF EXISTS sales.inquiry;
DROP TABLE IF EXISTS sales.deal;
DROP TABLE IF EXISTS sales.contact;
