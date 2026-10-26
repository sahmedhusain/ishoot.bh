ALTER TABLE "User"
ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mfaSecretEncrypted" TEXT,
ADD COLUMN "mfaPendingSecretEncrypted" TEXT,
ADD COLUMN "mfaPendingExpiresAt" TIMESTAMP(3),
ADD COLUMN "mfaLastStep" BIGINT;

CREATE TABLE "MfaRecoveryCode" (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode" ("codeHash");

CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode" ("userId");

ALTER TABLE "MfaRecoveryCode"
ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE ON UPDATE CASCADE;