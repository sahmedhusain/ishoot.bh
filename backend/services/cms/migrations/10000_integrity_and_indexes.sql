-- +goose Up
CREATE INDEX IF NOT EXISTS idx_cms_article_author_id ON cms.cms_article (author_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON cms.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_item_category_id ON cms.portfolio_item (category_id);
CREATE INDEX IF NOT EXISTS idx_social_content_plan_assignee_id ON cms.social_content_plan (assignee_id);
CREATE INDEX IF NOT EXISTS idx_social_content_plan_created_by_id ON cms.social_content_plan (created_by_id);
CREATE INDEX IF NOT EXISTS idx_social_insight_snapshot_source_account_id ON cms.social_insight_snapshot (source_account_id);
CREATE INDEX IF NOT EXISTS idx_social_metric_source_account_id ON cms.social_metric (source_account_id);
CREATE INDEX IF NOT EXISTS idx_social_post_external_id ON cms.social_post (external_id);
CREATE INDEX IF NOT EXISTS idx_social_post_source_account_id ON cms.social_post (source_account_id);
CREATE INDEX IF NOT EXISTS idx_social_post_snapshot_post_id ON cms.social_post_snapshot (post_id);
CREATE INDEX IF NOT EXISTS idx_social_post_snapshot_source_account_id ON cms.social_post_snapshot (source_account_id);

-- +goose Down
DROP INDEX IF EXISTS cms.idx_cms_article_author_id;
DROP INDEX IF EXISTS cms.idx_inbox_event_id;
DROP INDEX IF EXISTS cms.idx_portfolio_item_category_id;
DROP INDEX IF EXISTS cms.idx_social_content_plan_assignee_id;
DROP INDEX IF EXISTS cms.idx_social_content_plan_created_by_id;
DROP INDEX IF EXISTS cms.idx_social_insight_snapshot_source_account_id;
DROP INDEX IF EXISTS cms.idx_social_metric_source_account_id;
DROP INDEX IF EXISTS cms.idx_social_post_external_id;
DROP INDEX IF EXISTS cms.idx_social_post_source_account_id;
DROP INDEX IF EXISTS cms.idx_social_post_snapshot_post_id;
DROP INDEX IF EXISTS cms.idx_social_post_snapshot_source_account_id;
