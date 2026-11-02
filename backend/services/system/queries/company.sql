-- name: Company :one
SELECT * FROM system.company WHERE singleton;
-- name: LockCompany :one
SELECT * FROM system.company WHERE singleton FOR UPDATE;
-- name: SaveCompany :exec
INSERT INTO system.company(id,data,updated_by,updated_at) VALUES (@id,@data,@actor,@now)
ON CONFLICT(singleton) DO UPDATE SET data=EXCLUDED.data,revision=system.company.revision+1,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at;
-- name: LockCompanyCurrency :exec
UPDATE system.company SET currency_locked=true WHERE singleton;
-- name: DocumentSequences :many
SELECT * FROM system.document_sequence ORDER BY kind;
-- name: SaveDocumentSequence :exec
INSERT INTO system.document_sequence(kind,prefix,next_number) VALUES ($1,$2,$3)
ON CONFLICT(kind) DO UPDATE SET prefix=EXCLUDED.prefix,next_number=EXCLUDED.next_number;
-- name: ReserveDocumentNumber :one
UPDATE system.document_sequence SET next_number=next_number+1 WHERE kind=$1 AND next_number<2147483647 RETURNING prefix,next_number-1 AS allocated;
-- name: NumberReservation :one
SELECT * FROM system.number_reservation WHERE caller=$1 AND idempotency_key=$2;
-- name: SaveNumberReservation :exec
INSERT INTO system.number_reservation(caller,idempotency_key,kind,document_date,document_number) VALUES ($1,$2,$3,$4,$5);
-- name: CompanyAssets :many
SELECT * FROM system.company_asset ORDER BY asset_key;
-- name: CompanyAssetByURL :one
SELECT * FROM system.company_asset WHERE file_url=$1 LIMIT 1;
-- name: SaveCompanyAsset :exec
INSERT INTO system.company_asset(id,asset_key,title,file_url,mime_type,file_size,created_at,updated_at)
VALUES (@id,@asset_key,@title,@file_url,@mime_type,@file_size,@now,@now)
ON CONFLICT(asset_key) DO UPDATE SET title=EXCLUDED.title,file_url=EXCLUDED.file_url,mime_type=EXCLUDED.mime_type,file_size=EXCLUDED.file_size,updated_at=EXCLUDED.updated_at;
-- name: DeleteCompanyAsset :exec
DELETE FROM system.company_asset WHERE asset_key=$1;
