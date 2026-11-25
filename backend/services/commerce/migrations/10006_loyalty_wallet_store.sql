-- +goose Up
ALTER TABLE commerce.customer
    ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wallet_balance numeric(14, 3) NOT NULL DEFAULT 0.000,
    ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'BHD',
    ADD COLUMN IF NOT EXISTS cookie_consent_json text;

ALTER TABLE commerce.store_settings
    ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS points_per_unit numeric(10, 2) NOT NULL DEFAULT 10.00,
    ADD COLUMN IF NOT EXISTS points_redemption_rate integer NOT NULL DEFAULT 500,
    ADD COLUMN IF NOT EXISTS min_redeem_points integer NOT NULL DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS wallet_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS min_partial_wallet numeric(14, 3) NOT NULL DEFAULT 1.000,
    ADD COLUMN IF NOT EXISTS raffle_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS raffle_spend_unit numeric(14, 3) NOT NULL DEFAULT 10.000,
    ADD COLUMN IF NOT EXISTS raffle_prize_en text,
    ADD COLUMN IF NOT EXISTS raffle_prize_ar text,
    ADD COLUMN IF NOT EXISTS cookie_banner_enabled boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS ssl_badge_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE commerce.sales_order
    ADD COLUMN IF NOT EXISTS account_discount_amount numeric(15, 6) NOT NULL DEFAULT 0.000000,
    ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_discount_amount numeric(15, 6) NOT NULL DEFAULT 0.000000,
    ADD COLUMN IF NOT EXISTS wallet_applied numeric(15, 6) NOT NULL DEFAULT 0.000000,
    ADD COLUMN IF NOT EXISTS raffle_tickets integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency_display text;

ALTER TABLE commerce.store_region
    ADD COLUMN IF NOT EXISTS currency_symbol text,
    ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(14, 3);

CREATE TABLE IF NOT EXISTS commerce.customer_wallet_tx (
    id text PRIMARY KEY,
    customer_id text NOT NULL REFERENCES commerce.customer(id) ON DELETE CASCADE,
    kind text NOT NULL,
    amount numeric(14, 3) NOT NULL,
    balance_after numeric(14, 3) NOT NULL DEFAULT 0.000,
    reference text,
    note text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_wallet_tx_customer ON commerce.customer_wallet_tx (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commerce.customer_points_tx (
    id text PRIMARY KEY,
    customer_id text NOT NULL REFERENCES commerce.customer(id) ON DELETE CASCADE,
    kind text NOT NULL,
    points integer NOT NULL,
    balance_after integer NOT NULL DEFAULT 0,
    reference text,
    note text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_points_tx_customer ON commerce.customer_points_tx (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commerce.gift_card (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    initial_value numeric(14, 3) NOT NULL,
    remaining_value numeric(14, 3) NOT NULL,
    currency text NOT NULL DEFAULT 'BHD',
    recipient_email text,
    note text,
    is_active boolean NOT NULL DEFAULT true,
    redeemed_by text REFERENCES commerce.customer(id) ON DELETE SET NULL,
    redeemed_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gift_card_code ON commerce.gift_card (code);

CREATE TABLE IF NOT EXISTS commerce.order_return_request (
    id text PRIMARY KEY,
    order_id text NOT NULL REFERENCES commerce.sales_order(id) ON DELETE CASCADE,
    customer_id text REFERENCES commerce.customer(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending',
    refund_destination text NOT NULL DEFAULT 'wallet',
    amount_requested numeric(14, 3) NOT NULL DEFAULT 0.000,
    reason text NOT NULL,
    resolution_note text,
    resolved_by text,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_return_request_order ON commerce.order_return_request (order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_return_request_customer ON commerce.order_return_request (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commerce.customer_wishlist (
    id text PRIMARY KEY,
    customer_id text NOT NULL REFERENCES commerce.customer(id) ON DELETE CASCADE,
    product_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_wishlist_customer ON commerce.customer_wishlist (customer_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS commerce.customer_wishlist;
DROP TABLE IF EXISTS commerce.order_return_request;
DROP TABLE IF EXISTS commerce.gift_card;
DROP TABLE IF EXISTS commerce.customer_points_tx;
DROP TABLE IF EXISTS commerce.customer_wallet_tx;
ALTER TABLE commerce.store_region
    DROP COLUMN IF EXISTS currency_symbol,
    DROP COLUMN IF EXISTS free_shipping_threshold;
ALTER TABLE commerce.sales_order
    DROP COLUMN IF EXISTS currency_display,
    DROP COLUMN IF EXISTS raffle_tickets,
    DROP COLUMN IF EXISTS wallet_applied,
    DROP COLUMN IF EXISTS points_discount_amount,
    DROP COLUMN IF EXISTS points_redeemed,
    DROP COLUMN IF EXISTS points_earned,
    DROP COLUMN IF EXISTS account_discount_amount;
ALTER TABLE commerce.store_settings
    DROP COLUMN IF EXISTS ssl_badge_enabled,
    DROP COLUMN IF EXISTS cookie_banner_enabled,
    DROP COLUMN IF EXISTS raffle_prize_ar,
    DROP COLUMN IF EXISTS raffle_prize_en,
    DROP COLUMN IF EXISTS raffle_spend_unit,
    DROP COLUMN IF EXISTS raffle_enabled,
    DROP COLUMN IF EXISTS min_partial_wallet,
    DROP COLUMN IF EXISTS wallet_enabled,
    DROP COLUMN IF EXISTS min_redeem_points,
    DROP COLUMN IF EXISTS points_redemption_rate,
    DROP COLUMN IF EXISTS points_per_unit,
    DROP COLUMN IF EXISTS loyalty_enabled;
ALTER TABLE commerce.customer
    DROP COLUMN IF EXISTS cookie_consent_json,
    DROP COLUMN IF EXISTS preferred_currency,
    DROP COLUMN IF EXISTS tier,
    DROP COLUMN IF EXISTS discount_percent,
    DROP COLUMN IF EXISTS wallet_balance,
    DROP COLUMN IF EXISTS loyalty_points;
