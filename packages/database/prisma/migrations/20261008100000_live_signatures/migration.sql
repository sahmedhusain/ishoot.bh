-- Signatures drawn at the moment of signing, signing policies per document, and one-time signing links for staff.

-- An approver's signature drawn when they approved (documents whose policy requires signing on the spot).
ALTER TABLE "ApprovalDecision" ADD COLUMN "signatureData" TEXT;

-- Per document: "stored" applies the person's approved saved signature, "live" requires drawing it at that moment.
CREATE TABLE "SignaturePolicy" (
    "documentType" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'stored',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignaturePolicy_pkey" PRIMARY KEY ("documentType"),
    CONSTRAINT "SignaturePolicy_mode_check" CHECK ("mode" IN ('stored', 'live'))
);

INSERT INTO
    "SignaturePolicy" ("documentType", "mode")
VALUES ('quotation', 'stored'),
    ('invoice', 'stored'),
    ('receipt', 'stored'),
    ('salary_document', 'stored'),
    ('mom', 'stored'),
    ('asset_handover', 'live'),
    ('employee_handover', 'live'),
    ('final_settlement', 'live'),
    ('official_letter', 'live'),
    ('announcement', 'stored') ON CONFLICT ("documentType") DO NOTHING;

-- A time-limited link a person opens to sign a document on their own device (the token is stored hashed).
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "signerName" TEXT,
    "signatureData" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "viewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SignatureRequest_status_check" CHECK (
        "status" IN (
            'pending',
            'signed',
            'revoked',
            'expired'
        )
    ),
    CONSTRAINT "SignatureRequest_signed_check" CHECK (
        "status" <> 'signed'
        OR (
            "signatureData" IS NOT NULL
            AND "signedAt" IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX "SignatureRequest_tokenHash_key" ON "SignatureRequest" ("tokenHash");

CREATE INDEX "SignatureRequest_documentType_documentId_idx" ON "SignatureRequest" ("documentType", "documentId");
-- At most one usable link per document.
CREATE UNIQUE INDEX "SignatureRequest_one_pending" ON "SignatureRequest" ("documentType", "documentId")
WHERE
    "status" = 'pending';