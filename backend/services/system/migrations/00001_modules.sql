CREATE TABLE IF NOT EXISTS system.module_setting (
    module_key text        NOT NULL,
    enabled    boolean     NOT NULL,
    updated_by text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT module_setting_pkey PRIMARY KEY (module_key),
    CONSTRAINT module_setting_key_check CHECK (length(module_key) BETWEEN 1 AND 64)
);
DROP TABLE IF EXISTS system.module_setting;
