-- AlterTable
ALTER TABLE "CodSettlement" ADD COLUMN     "agencyId" TEXT,
ALTER COLUMN "driverId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "CourierAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integrity: a handover comes from exactly one driver or one agency.
ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_source_check" CHECK (("driverId" IS NULL) <> ("agencyId" IS NULL));
