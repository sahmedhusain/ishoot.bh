-- +goose Up
CREATE INDEX IF NOT EXISTS idx_attachment_message_id ON notify.attachment (message_id);
CREATE INDEX IF NOT EXISTS idx_category_setting_user_id ON notify.category_setting (user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON notify.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_message_provider_id ON notify.message (provider_id);
CREATE INDEX IF NOT EXISTS idx_mute_user_id ON notify.mute (user_id);
CREATE INDEX IF NOT EXISTS idx_mute_entity_id ON notify.mute (entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_entity_id ON notify.notification (entity_id);
CREATE INDEX IF NOT EXISTS idx_preference_user_id ON notify.preference (user_id);

-- +goose Down
DROP INDEX IF EXISTS notify.idx_attachment_message_id;
DROP INDEX IF EXISTS notify.idx_category_setting_user_id;
DROP INDEX IF EXISTS notify.idx_inbox_event_id;
DROP INDEX IF EXISTS notify.idx_message_provider_id;
DROP INDEX IF EXISTS notify.idx_mute_user_id;
DROP INDEX IF EXISTS notify.idx_mute_entity_id;
DROP INDEX IF EXISTS notify.idx_notification_entity_id;
DROP INDEX IF EXISTS notify.idx_preference_user_id;
