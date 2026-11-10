CREATE INDEX IF NOT EXISTS message_sent_email_retention_idx
    ON notify.message (sent_at, id)
    WHERE channel = 'email' AND status = 'sent' AND sent_at IS NOT NULL AND recipient <> '';
DROP INDEX IF EXISTS notify.message_sent_email_retention_idx;
