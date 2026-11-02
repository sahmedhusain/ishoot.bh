CREATE TABLE IF NOT EXISTS public."IdentityProjectionReceipt" (id text PRIMARY KEY, version bigint NOT NULL CHECK(version>0));
