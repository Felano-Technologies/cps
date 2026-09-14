CREATE TYPE "PackageSize" AS ENUM ('small', 'medium', 'big');
CREATE TYPE "DeliveryType" AS ENUM ('doorstep', 'station');

ALTER TABLE "shipments"
  ADD COLUMN "packageSize" "PackageSize" NOT NULL DEFAULT 'medium',
  ADD COLUMN "deliveryType" "DeliveryType" NOT NULL DEFAULT 'doorstep',
  ADD COLUMN "stationLocation" TEXT,
  ADD COLUMN "stationDriverName" TEXT,
  ADD COLUMN "stationDriverNumber" TEXT,
  ADD COLUMN "stationCarNumber" TEXT,
  ADD COLUMN "stationReceiptUrl" TEXT,
  ADD COLUMN "stationHandoverAt" TIMESTAMP(3);
