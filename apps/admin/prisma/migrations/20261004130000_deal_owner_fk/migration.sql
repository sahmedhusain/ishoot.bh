-- Historical unresolved owners must be reconciled explicitly before this migration.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "CrmDeal" d LEFT JOIN "User" u ON u.id = d."assignedTo" WHERE d."assignedTo" IS NOT NULL AND u.id IS NULL) THEN
    RAISE EXCEPTION 'Unresolved deal owners: reconcile CrmDeal.assignedTo before migrating';
  END IF;
END $$;

CREATE INDEX "CrmDeal_assignedTo_idx" ON "CrmDeal" ("assignedTo");

ALTER TABLE "CrmDeal"
ADD CONSTRAINT "CrmDeal_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;