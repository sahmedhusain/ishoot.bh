-- +goose Up
ALTER TABLE commerce.store_settings
    ADD COLUMN IF NOT EXISTS announcement_en text,
    ADD COLUMN IF NOT EXISTS announcement_ar text,
    ADD COLUMN IF NOT EXISTS cr_number text NOT NULL DEFAULT '99779-1',
    ADD COLUMN IF NOT EXISTS vat_number text,
    ADD COLUMN IF NOT EXISTS return_window_days integer NOT NULL DEFAULT 14,
    ADD COLUMN IF NOT EXISTS show_category_bar boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_deals_section boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_gift_cards_section boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS custom_categories_json text;

-- +goose Down
ALTER TABLE commerce.store_settings
    DROP COLUMN IF EXISTS custom_categories_json,
    DROP COLUMN IF EXISTS show_gift_cards_section,
    DROP COLUMN IF EXISTS show_deals_section,
    DROP COLUMN IF EXISTS show_category_bar,
    DROP COLUMN IF EXISTS return_window_days,
    DROP COLUMN IF EXISTS vat_number,
    DROP COLUMN IF EXISTS cr_number,
    DROP COLUMN IF EXISTS announcement_ar,
    DROP COLUMN IF EXISTS announcement_en;
