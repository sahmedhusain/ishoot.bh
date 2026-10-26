-- Client profiles: individual, company (local with CR or foreign) or government; full address; several points of contact.
ALTER TABLE "CrmContact"
ADD COLUMN "clientKind" TEXT NOT NULL DEFAULT 'individual',
ADD COLUMN "companyOrigin" TEXT,
ADD COLUMN "companyNameAr" TEXT,
ADD COLUMN "legalForm" TEXT,
ADD COLUMN "crNumber" TEXT,
ADD COLUMN "crExpiryDate" DATE,
ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "registrationCountry" TEXT,
ADD COLUMN "governmentType" TEXT,
ADD COLUMN "supplierNumber" TEXT,
ADD COLUMN "requiresPurchaseOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nationality" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "preferredLanguage" TEXT,
ADD COLUMN "paymentTermsDays" INTEGER,
ADD COLUMN "addressCountry" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressArea" TEXT,
ADD COLUMN "addressBlock" TEXT,
ADD COLUMN "addressRoad" TEXT,
ADD COLUMN "addressBuilding" TEXT,
ADD COLUMN "addressUnit" TEXT,
ADD COLUMN "addressLine" TEXT,
ADD COLUMN "addressState" TEXT,
ADD COLUMN "addressPostalCode" TEXT,
ADD COLUMN "addressPoBox" TEXT;

-- Existing records with a company name are companies; their origin is unknown, so assume local.
UPDATE "CrmContact"
SET
    "clientKind" = 'company',
    "companyOrigin" = 'local',
    "registrationCountry" = 'BH'
WHERE
    NULLIF(BTRIM ("companyName"), '') IS NOT NULL;

ALTER TABLE "CrmContact"
ADD CONSTRAINT "CrmContact_clientKind_check" CHECK (
    "clientKind" IN (
        'individual',
        'company',
        'government'
    )
),
ADD CONSTRAINT "CrmContact_companyOrigin_check" CHECK (
    "companyOrigin" IS NULL
    OR (
        "clientKind" = 'company'
        AND "companyOrigin" IN ('local', 'foreign')
    )
),
ADD CONSTRAINT "CrmContact_preferredLanguage_check" CHECK (
    "preferredLanguage" IS NULL
    OR "preferredLanguage" IN ('ar', 'en')
),
ADD CONSTRAINT "CrmContact_paymentTermsDays_check" CHECK (
    "paymentTermsDays" IS NULL
    OR "paymentTermsDays" BETWEEN 0 AND 365
);

CREATE INDEX "CrmContact_clientKind_idx" ON "CrmContact" ("clientKind");

CREATE INDEX "CrmContact_crNumber_idx" ON "CrmContact" ("crNumber");

CREATE TABLE "ClientContactPerson" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "department" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientContactPerson_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClientContactPerson_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientContactPerson_fullName_check" CHECK (BTRIM ("fullName") <> '')
);

CREATE INDEX "ClientContactPerson_contactId_displayOrder_idx" ON "ClientContactPerson" ("contactId", "displayOrder");
-- At most one primary contact per client.
CREATE UNIQUE INDEX "ClientContactPerson_one_primary" ON "ClientContactPerson" ("contactId")
WHERE
    "isPrimary";

-- Each existing company keeps its current person as the primary point of contact.
INSERT INTO "ClientContactPerson" ("id", "contactId", "fullName", "position", "email", "phone", "isPrimary", "updatedAt")
SELECT gen_random_uuid()::text, c."id", BTRIM(CONCAT_WS(' ', c."firstName", c."lastName")), c."jobTitle", c."email", c."phone", true, CURRENT_TIMESTAMP
FROM "CrmContact" c
WHERE c."clientKind" = 'company' AND BTRIM(CONCAT_WS(' ', c."firstName", c."lastName")) <> '';