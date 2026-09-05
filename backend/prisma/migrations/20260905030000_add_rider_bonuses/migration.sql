-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('pickup', 'dropoff');

-- CreateTable
CREATE TABLE "rider_bonuses" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" "BonusType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rider_bonuses_riderId_idx" ON "rider_bonuses"("riderId");

-- CreateIndex
CREATE INDEX "rider_bonuses_createdAt_idx" ON "rider_bonuses"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rider_bonuses_shipmentId_type_key" ON "rider_bonuses"("shipmentId", "type");

-- AddForeignKey
ALTER TABLE "rider_bonuses" ADD CONSTRAINT "rider_bonuses_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "rider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_bonuses" ADD CONSTRAINT "rider_bonuses_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
