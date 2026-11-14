-- +goose Up
ALTER TABLE identity.role_data_scope ALTER COLUMN role SET NOT NULL;
ALTER TABLE identity.role_data_scope ALTER COLUMN area SET NOT NULL;
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'identity.role_data_scope'::regclass AND contype = 'p') THEN
        DELETE FROM identity.role_data_scope a USING identity.role_data_scope b WHERE a.ctid < b.ctid AND a.role = b.role AND a.area = b.area;
        ALTER TABLE identity.role_data_scope ADD CONSTRAINT role_data_scope_pkey PRIMARY KEY (role, area);
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_account_subject_id ON identity.account (subject_id);
CREATE INDEX IF NOT EXISTS idx_auth_challenge_user_id ON identity.auth_challenge (user_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_challenge_user_id' AND conrelid = 'identity.auth_challenge'::regclass) THEN
        UPDATE identity.auth_challenge SET user_id = NULL WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM identity."user" p WHERE p.id = identity.auth_challenge.user_id);
        ALTER TABLE identity.auth_challenge ADD CONSTRAINT fk_auth_challenge_user_id FOREIGN KEY (user_id) REFERENCES identity."user"(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_branch_grant_branch_id ON identity.branch_grant (branch_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_branch_grant_branch_id' AND conrelid = 'identity.branch_grant'::regclass) THEN
        DELETE FROM identity.branch_grant WHERE branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM identity.branch p WHERE p.id = identity.branch_grant.branch_id);
        ALTER TABLE identity.branch_grant ADD CONSTRAINT fk_branch_grant_branch_id FOREIGN KEY (branch_id) REFERENCES identity.branch(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_branch_grant_user_id ON identity.branch_grant (user_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_branch_grant_user_id' AND conrelid = 'identity.branch_grant'::regclass) THEN
        DELETE FROM identity.branch_grant WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM identity."user" p WHERE p.id = identity.branch_grant.user_id);
        ALTER TABLE identity.branch_grant ADD CONSTRAINT fk_branch_grant_user_id FOREIGN KEY (user_id) REFERENCES identity."user"(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_customer_provider_subject_id ON identity.customer_provider (subject_id);
CREATE INDEX IF NOT EXISTS idx_inbox_event_id ON identity.inbox (event_id);
CREATE INDEX IF NOT EXISTS idx_it_permission_role_id ON identity.it_permission (role_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_code_subject_id ON identity.mfa_recovery_code (subject_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_code_user_id ON identity.mfa_recovery_code (user_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mfa_recovery_code_user_id' AND conrelid = 'identity.mfa_recovery_code'::regclass) THEN
        UPDATE identity.mfa_recovery_code SET user_id = NULL WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM identity."user" p WHERE p.id = identity.mfa_recovery_code.user_id);
        ALTER TABLE identity.mfa_recovery_code ADD CONSTRAINT fk_mfa_recovery_code_user_id FOREIGN KEY (user_id) REFERENCES identity."user"(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_password_reset_subject_id ON identity.password_reset (subject_id);
CREATE INDEX IF NOT EXISTS idx_profile_projection_subject_id ON identity.profile_projection (subject_id);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON identity.session (user_id);
-- +goose StatementBegin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_session_user_id' AND conrelid = 'identity.session'::regclass) THEN
        UPDATE identity.session SET user_id = NULL WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM identity."user" p WHERE p.id = identity.session.user_id);
        ALTER TABLE identity.session ADD CONSTRAINT fk_session_user_id FOREIGN KEY (user_id) REFERENCES identity."user"(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;
-- +goose StatementEnd
CREATE INDEX IF NOT EXISTS idx_session_family_subject_id ON identity.session_family (subject_id);
CREATE INDEX IF NOT EXISTS idx_staff_access_subject_id ON identity.staff_access (subject_id);
CREATE INDEX IF NOT EXISTS idx_staff_permission_role_id ON identity.staff_permission (role_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_scope_role_id ON identity.staff_role_scope (role_id);
CREATE INDEX IF NOT EXISTS idx_user_department_id ON identity."user" (department_id);
CREATE INDEX IF NOT EXISTS idx_user_manager_id ON identity."user" (manager_id);
CREATE INDEX IF NOT EXISTS idx_user_archived_by_id ON identity."user" (archived_by_id);
CREATE INDEX IF NOT EXISTS idx_user_suspended_by_id ON identity."user" (suspended_by_id);

-- +goose Down
DROP INDEX IF EXISTS identity.idx_account_subject_id;
DROP INDEX IF EXISTS identity.idx_auth_challenge_user_id;
ALTER TABLE identity.auth_challenge DROP CONSTRAINT IF EXISTS fk_auth_challenge_user_id;
DROP INDEX IF EXISTS identity.idx_branch_grant_branch_id;
ALTER TABLE identity.branch_grant DROP CONSTRAINT IF EXISTS fk_branch_grant_branch_id;
DROP INDEX IF EXISTS identity.idx_branch_grant_user_id;
ALTER TABLE identity.branch_grant DROP CONSTRAINT IF EXISTS fk_branch_grant_user_id;
DROP INDEX IF EXISTS identity.idx_customer_provider_subject_id;
DROP INDEX IF EXISTS identity.idx_inbox_event_id;
DROP INDEX IF EXISTS identity.idx_it_permission_role_id;
DROP INDEX IF EXISTS identity.idx_mfa_recovery_code_subject_id;
DROP INDEX IF EXISTS identity.idx_mfa_recovery_code_user_id;
ALTER TABLE identity.mfa_recovery_code DROP CONSTRAINT IF EXISTS fk_mfa_recovery_code_user_id;
DROP INDEX IF EXISTS identity.idx_password_reset_subject_id;
DROP INDEX IF EXISTS identity.idx_profile_projection_subject_id;
DROP INDEX IF EXISTS identity.idx_session_user_id;
ALTER TABLE identity.session DROP CONSTRAINT IF EXISTS fk_session_user_id;
DROP INDEX IF EXISTS identity.idx_session_family_subject_id;
DROP INDEX IF EXISTS identity.idx_staff_access_subject_id;
DROP INDEX IF EXISTS identity.idx_staff_permission_role_id;
DROP INDEX IF EXISTS identity.idx_staff_role_scope_role_id;
DROP INDEX IF EXISTS identity.idx_user_department_id;
DROP INDEX IF EXISTS identity.idx_user_manager_id;
DROP INDEX IF EXISTS identity.idx_user_archived_by_id;
DROP INDEX IF EXISTS identity.idx_user_suspended_by_id;
