-- Departments nest, have a deputy and a cost centre, and staff accounts belong to one.
ALTER TABLE "Department" ADD COLUMN "catalogueKey" TEXT;
ALTER TABLE "Department" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Department" ADD COLUMN "deputyId" TEXT;
ALTER TABLE "Department" ADD COLUMN "costCentre" TEXT;
ALTER TABLE "Department" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Department" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");

ALTER TABLE "User" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- A staff account linked to an employee belongs to the employee's department. The old free-text team name stays.
UPDATE "User" u SET "departmentId" = e."departmentId"
FROM "Employee" e WHERE e."userId" = u."id" AND e."departmentId" IS NOT NULL;
