-- The device and address a session signed in from, shown to its owner so they can recognise and end it.

-- +goose Up
ALTER TABLE identity.session_family ADD COLUMN IF NOT EXISTS user_agent text CHECK (length(user_agent) <= 512);
ALTER TABLE identity.session_family ADD COLUMN IF NOT EXISTS client_ip text CHECK (length(client_ip) <= 45);

-- +goose Down
ALTER TABLE identity.session_family DROP COLUMN IF EXISTS client_ip;
ALTER TABLE identity.session_family DROP COLUMN IF EXISTS user_agent;
