-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "pickupRiderId" TEXT,
ADD COLUMN "dropoffRiderId" TEXT;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pickupRiderId_fkey" FOREIGN KEY ("pickupRiderId") REFERENCES "rider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_dropoffRiderId_fkey" FOREIGN KEY ("dropoffRiderId") REFERENCES "rider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
