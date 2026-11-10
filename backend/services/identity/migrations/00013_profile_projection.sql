-- +goose Up
ALTER TABLE identity.staff_role ADD COLUMN revision bigint NOT NULL DEFAULT 1;
CREATE TABLE identity.profile_projection (
 realm text NOT NULL CHECK(realm IN ('staff','customer')),
 subject_id text NOT NULL,
 version bigint NOT NULL DEFAULT 1,
 delivered_version bigint NOT NULL DEFAULT 0,
 deleted boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(realm,subject_id)
);
-- +goose StatementBegin
CREATE FUNCTION identity.queue_profile_projection() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r text; sid text; gone boolean;
BEGIN
 IF TG_OP='DELETE' THEN r:=OLD.realm;sid:=OLD.subject_id;ELSE r:=NEW.realm;sid:=NEW.subject_id;END IF;
 gone:=TG_OP='DELETE' AND TG_TABLE_NAME='account';
 IF r='staff' OR (r='customer' AND gone) THEN
  INSERT INTO identity.profile_projection(realm,subject_id,deleted) VALUES(r,sid,gone)
  ON CONFLICT(realm,subject_id) DO UPDATE SET version=identity.profile_projection.version+1,
   deleted=EXCLUDED.deleted,updated_at=now();
 END IF;
 RETURN NULL;
END $$;
-- +goose StatementEnd
CREATE TRIGGER account_projection_insert AFTER INSERT ON identity.account FOR EACH ROW EXECUTE FUNCTION identity.queue_profile_projection();
CREATE TRIGGER account_projection_update AFTER UPDATE OF email,roles,active ON identity.account FOR EACH ROW EXECUTE FUNCTION identity.queue_profile_projection();
CREATE TRIGGER account_projection_delete AFTER DELETE ON identity.account FOR EACH ROW EXECUTE FUNCTION identity.queue_profile_projection();
CREATE TRIGGER staff_profile_projection AFTER INSERT OR UPDATE OF display_name,permission_overrides,data_scopes ON identity.staff_access FOR EACH ROW EXECUTE FUNCTION identity.queue_profile_projection();
INSERT INTO identity.profile_projection(realm,subject_id) SELECT realm,subject_id FROM identity.account WHERE realm='staff';

-- +goose Down
DROP TRIGGER staff_profile_projection ON identity.staff_access;
DROP TRIGGER account_projection_delete ON identity.account;
DROP TRIGGER account_projection_update ON identity.account;
DROP TRIGGER account_projection_insert ON identity.account;
DROP FUNCTION identity.queue_profile_projection();
DROP TABLE identity.profile_projection;
ALTER TABLE identity.staff_role DROP COLUMN revision;
