-- Each company keeps its own sales pipeline. Existing deals keep their stage ids: the stages they use today are
-- created here with their current order and win probability, and their names still come from the activity copy.
CREATE TABLE "DealPipelineStage" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameAr" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "kind" TEXT NOT NULL DEFAULT 'open',
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DealPipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealPipelineStage_sortOrder_idx" ON "DealPipelineStage" ("sortOrder");

INSERT INTO
    "DealPipelineStage" (
        "id",
        "sortOrder",
        "probability",
        "kind",
        "color",
        "isSystem",
        "updatedAt"
    )
VALUES (
        'lead',
        0,
        20,
        'open',
        '#3B82F6',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'proposal_sent',
        1,
        40,
        'open',
        '#F59E0B',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'contract_signed',
        2,
        70,
        'open',
        '#8B5CF6',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'production',
        3,
        80,
        'open',
        NULL,
        false,
        CURRENT_TIMESTAMP
    ),
    (
        'post_production',
        4,
        90,
        'open',
        '#A855F7',
        false,
        CURRENT_TIMESTAMP
    ),
    (
        'delivered',
        5,
        95,
        'open',
        '#10B981',
        false,
        CURRENT_TIMESTAMP
    ),
    (
        'invoiced',
        6,
        98,
        'open',
        '#0D9488',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'closed_won',
        7,
        100,
        'won',
        '#059669',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'closed_lost',
        8,
        0,
        'lost',
        '#E11D48',
        true,
        CURRENT_TIMESTAMP
    );

-- Any other stage value already stored stays visible on the board.
INSERT INTO "DealPipelineStage" ("id", "sortOrder", "probability", "updatedAt")
SELECT DISTINCT d."dealStage", 50, 50, CURRENT_TIMESTAMP FROM "CrmDeal" d
WHERE NOT EXISTS (SELECT 1 FROM "DealPipelineStage" s WHERE s."id" = d."dealStage");