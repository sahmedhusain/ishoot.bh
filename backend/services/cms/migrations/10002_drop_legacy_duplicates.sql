-- +goose Up
DROP TABLE IF EXISTS cms.cms_article CASCADE;
DROP TABLE IF EXISTS cms.cms_page CASCADE;

-- +goose Down
SELECT 1;
