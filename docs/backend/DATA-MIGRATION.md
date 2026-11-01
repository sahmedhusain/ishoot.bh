# Phase 2 data migration

The Prisma migration `20261101120000_move_uploads_to_files_service` transfers `UploadObject` into `files.upload_object`, renames columns, converts UTC timestamps to `timestamptz`, and removes the cross-domain user foreign key. If the service table already exists, it copies rows before dropping the old table. A conflicting file URL aborts the handoff and preserves the old table for reconciliation. The Go baseline migration then adds its cleanup index and schema-local goose/River tables.

## Existing installations

1. Stop application writes and take a database backup plus a copy of the old file storage. Keep the matching old application revision and environment securely.
2. Run `./run.sh env sync` and `./run.sh env secrets`. Existing values are preserved, so explicitly set `DATABASE_URL`, `DIRECT_URL` and `API_URL` for the target installation.
3. For an old local Supabase installation, `./run.sh services import-supabase` copies its public schema to the configured Compose database, applies migrations and copies file bytes. This replaces target data and asks for confirmation. Run it on a disposable copy first. Source storage is retained.
4. For other installations, restore the database copy, apply Prisma migrations, then run the files service's `migrate` command before starting the apps.
5. Copy bytes using `backend/tools/storage-copy`, with the target database/S3 environment. Use `-from-dir /absolute/old/uploads` or `-from-s3 <endpoint>` and source credentials. Run with `-dry-run` first. Existing destination objects are checked and skipped; missing source bytes or size mismatches must be resolved before cutover.
6. Verify both service readiness endpoints, file counts, private-download permissions, brand assets, a new upload and a receipt attachment. Switch traffic only after those checks pass.

The copy tool processes upload records; inventory any legacy objects that have no record separately before retiring source storage. Keep source backups until every domain reference has been checked.

## Rollback

There is no automated reverse handoff migration yet. The Go `Down` migration drops the service table and is **not** a safe rollback for transferred data. To roll back, stop writes and restore the pre-cutover database and storage backups with the old application revision. New writes after cutover require explicit reconciliation before restoring. Rehearse this restore on a disposable database before production migration.

## Current boundaries

Each service has its own database login owning only its schema (`backend/tools/db-roles`, run before the migrations locally and as a Helm hook in Kubernetes). A hand-off migration run by the apps' login leaves the moved table owned by that login until `db-roles` runs again, which happens on every start. Attachments stay in the business domain. File claims occur outside its Prisma transaction; a failed business write can leave a claimed file that needs reconciliation. Cross-service sagas and idempotent business retries remain part of the later migration work.
