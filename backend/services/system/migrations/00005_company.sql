-- +goose Up
CREATE TABLE IF NOT EXISTS system.company (
 id text PRIMARY KEY,
 singleton boolean NOT NULL DEFAULT true UNIQUE CHECK(singleton),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 currency_locked boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1,
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS system.company_asset (
 id text PRIMARY KEY,
 asset_key text NOT NULL UNIQUE,
 title text NOT NULL,
 file_url text NOT NULL,
 mime_type text,
 file_size bigint,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS system.document_sequence (
 kind text PRIMARY KEY CHECK(kind IN ('invoice','receipt')),
 prefix text NOT NULL,
 next_number bigint NOT NULL CHECK(next_number BETWEEN 1 AND 2147483647)
);
CREATE TABLE IF NOT EXISTS system.number_reservation (
 caller text NOT NULL,
 idempotency_key text NOT NULL,
 kind text NOT NULL,
 document_date date NOT NULL,
 document_number text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(caller,idempotency_key),
 UNIQUE(kind,document_number)
);
-- +goose Down
DROP TABLE system.number_reservation;
DROP TABLE system.document_sequence;
DROP TABLE system.company_asset;
DROP TABLE system.company;
