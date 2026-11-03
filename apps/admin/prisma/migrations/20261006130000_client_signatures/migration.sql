-- CreateTable
CREATE TABLE "ClientSignature" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "recipientEmail" TEXT,
    "signerName" TEXT,
    "signerTitle" TEXT,
    "signatureData" TEXT,
    "signedFileUrl" TEXT,
    "termsText" TEXT,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "documentHash" TEXT,
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "signedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientSignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientSignature_tokenHash_key" ON "ClientSignature" ("tokenHash");

CREATE INDEX "ClientSignature_documentType_documentId_idx" ON "ClientSignature" ("documentType", "documentId");

CREATE INDEX "ClientSignature_status_idx" ON "ClientSignature" ("status");

ALTER TABLE "ClientSignature"
ADD CONSTRAINT "ClientSignature_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClientSignature"
ADD CONSTRAINT "ClientSignature_documentType_check" CHECK (
    "documentType" IN ('quotation', 'invoice')
);

ALTER TABLE "ClientSignature"
ADD CONSTRAINT "ClientSignature_method_check" CHECK (
    "method" IN ('link', 'upload')
);

ALTER TABLE "ClientSignature"
ADD CONSTRAINT "ClientSignature_status_check" CHECK (
    "status" IN (
        'pending',
        'signed',
        'revoked',
        'expired'
    )
);
-- A signed record always names who signed and when; a link always carries a token and an expiry.
ALTER TABLE "ClientSignature"
ADD CONSTRAINT "ClientSignature_signed_check" CHECK (
    "status" <> 'signed'
    OR (
        "signerName" IS NOT NULL
        AND "signedAt" IS NOT NULL
    )
);

ALTER TABLE "ClientSignature"
ADD CONSTRAINT "ClientSignature_link_check" CHECK (
    "method" <> 'link'
    OR (
        "tokenHash" IS NOT NULL
        AND "expiresAt" IS NOT NULL
    )
);
-- At most one signed acceptance per document.
CREATE UNIQUE INDEX "ClientSignature_one_signed_per_document" ON "ClientSignature" ("documentType", "documentId")
WHERE
    "status" = 'signed';