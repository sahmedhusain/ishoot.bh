CREATE TABLE IF NOT EXISTS finance.invoice (
    id text PRIMARY KEY,
    invoice_number text NOT NULL UNIQUE,
    quotation_id text,
    contact_id text,
    deal_id text,
    status text NOT NULL DEFAULT 'draft',
    issue_date date NOT NULL DEFAULT current_date,
    due_date date NOT NULL DEFAULT (current_date + interval '30 days'),
    subtotal numeric(14, 3) NOT NULL DEFAULT 0.000,
    discount numeric(14, 3) NOT NULL DEFAULT 0.000,
    vat_rate numeric(5, 2) NOT NULL DEFAULT 0.00,
    vat_amount numeric(14, 3) NOT NULL DEFAULT 0.000,
    total numeric(14, 3) NOT NULL DEFAULT 0.000,
    amount_paid numeric(14, 3) NOT NULL DEFAULT 0.000,
    balance_due numeric(14, 3) NOT NULL DEFAULT 0.000,
    currency text NOT NULL DEFAULT '',
    notes text,
    terms text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoice_number_idx ON finance.invoice (invoice_number);
CREATE INDEX IF NOT EXISTS invoice_status_due_idx ON finance.invoice (status, due_date);
CREATE TABLE IF NOT EXISTS finance.invoice_item (
    id text PRIMARY KEY,
    invoice_id text NOT NULL REFERENCES finance.invoice(id) ON DELETE CASCADE,
    description text NOT NULL,
    quantity numeric(10, 2) NOT NULL DEFAULT 1.00,
    unit_price numeric(14, 3) NOT NULL DEFAULT 0.000,
    amount numeric(14, 3) NOT NULL DEFAULT 0.000,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS inv_item_idx ON finance.invoice_item (invoice_id, sort_order);
CREATE TABLE IF NOT EXISTS finance.payment (
    id text PRIMARY KEY,
    payment_number text NOT NULL UNIQUE,
    invoice_id text REFERENCES finance.invoice(id) ON DELETE SET NULL,
    contact_id text,
    amount numeric(14, 3) NOT NULL,
    currency text NOT NULL DEFAULT '',
    payment_method text NOT NULL DEFAULT 'bank_transfer',
    payment_date date NOT NULL DEFAULT current_date,
    reference text,
    status text NOT NULL DEFAULT 'completed',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_invoice_idx ON finance.payment (invoice_id);
CREATE TABLE IF NOT EXISTS finance.expense_category (
    id text PRIMARY KEY,
    name_en text NOT NULL,
    name_ar text NOT NULL,
    code text NOT NULL UNIQUE,
    sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS finance.expense (
    id text PRIMARY KEY,
    title text NOT NULL,
    category_id text REFERENCES finance.expense_category(id) ON DELETE SET NULL,
    amount numeric(14, 3) NOT NULL,
    currency text NOT NULL DEFAULT '',
    expense_date date NOT NULL DEFAULT current_date,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    vendor text,
    receipt_url text,
    created_by text,
    approved_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expense_category_date_idx ON finance.expense (category_id, expense_date);
CREATE TABLE IF NOT EXISTS finance.bank_settlement (
    id text PRIMARY KEY,
    settlement_number text NOT NULL UNIQUE,
    bank_account text NOT NULL,
    amount numeric(14, 3) NOT NULL,
    currency text NOT NULL DEFAULT '',
    settled_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'completed',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);
DROP TABLE IF EXISTS finance.bank_settlement;
DROP TABLE IF EXISTS finance.expense;
DROP TABLE IF EXISTS finance.expense_category;
DROP TABLE IF EXISTS finance.payment;
DROP TABLE IF EXISTS finance.invoice_item;
DROP TABLE IF EXISTS finance.invoice;
