-- Hands "UploadObject" over to the files service (docs/adr/0002, 0009). The table moves, with its data, to the
-- files schema under the names the service uses (backend/services/files/migrations/00001_upload_object.sql).
-- Times move from UTC "timestamp" to "timestamptz"; the owner stays a plain ID without a foreign key, since
-- services never reference each other's tables. If the files service already created its table, the rows are
-- copied into it instead.
CREATE SCHEMA IF NOT EXISTS files;

DO $$
BEGIN
  IF to_regclass('public."UploadObject"') IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('files.upload_object') IS NOT NULL THEN
    -- Never discard legacy ownership/claim metadata on a URL collision. The operator must reconcile it
    -- before retrying; this DO block rolls back and leaves the legacy table intact.
    IF EXISTS (
      SELECT 1 FROM public."UploadObject" legacy
      JOIN files.upload_object target ON target.file_url = legacy."fileUrl"
    ) THEN
      RAISE EXCEPTION 'UploadObject handoff has conflicting file URLs; reconcile target records before retrying';
    END IF;
    INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)
    SELECT id, "fileUrl", "ownerId", "fileName", "fileSize", "mimeType", "isPublic",
           "claimedAt" AT TIME ZONE 'UTC', "expiresAt" AT TIME ZONE 'UTC', "createdAt" AT TIME ZONE 'UTC'
    FROM public."UploadObject";
    DROP TABLE public."UploadObject";
    RETURN;
  END IF;

  ALTER TABLE public."UploadObject" DROP CONSTRAINT IF EXISTS "UploadObject_ownerId_fkey";
  ALTER TABLE public."UploadObject" SET SCHEMA files;
  ALTER TABLE files."UploadObject" RENAME TO upload_object;
  ALTER TABLE files.upload_object RENAME COLUMN "fileUrl" TO file_url;
  ALTER TABLE files.upload_object RENAME COLUMN "ownerId" TO owner_id;
  ALTER TABLE files.upload_object RENAME COLUMN "fileName" TO file_name;
  ALTER TABLE files.upload_object RENAME COLUMN "fileSize" TO file_size;
  ALTER TABLE files.upload_object RENAME COLUMN "mimeType" TO mime_type;
  ALTER TABLE files.upload_object RENAME COLUMN "isPublic" TO is_public;
  ALTER TABLE files.upload_object RENAME COLUMN "claimedAt" TO claimed_at;
  ALTER TABLE files.upload_object RENAME COLUMN "expiresAt" TO expires_at;
  ALTER TABLE files.upload_object RENAME COLUMN "createdAt" TO created_at;
  ALTER TABLE files.upload_object
    ALTER COLUMN owner_id DROP NOT NULL,
    ALTER COLUMN file_size TYPE bigint,
    ALTER COLUMN claimed_at TYPE timestamptz USING claimed_at AT TIME ZONE 'UTC',
    ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE files.upload_object RENAME CONSTRAINT "UploadObject_pkey" TO upload_object_pkey;
  ALTER INDEX files."UploadObject_fileUrl_key" RENAME TO upload_object_file_url_key;
  ALTER INDEX files."UploadObject_ownerId_expiresAt_idx" RENAME TO upload_object_owner_id_expires_at_idx;
END $$;
