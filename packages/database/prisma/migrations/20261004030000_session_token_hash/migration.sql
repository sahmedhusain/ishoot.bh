-- Coordinate this migration with the application release; token values are now SHA-256 digests.
-- JWT cookies remain unchanged. Already-hashed rows are retained for retry/rolling preparation.
UPDATE "Session" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex') WHERE "token" !~ '^[0-9a-f]{64}$';
