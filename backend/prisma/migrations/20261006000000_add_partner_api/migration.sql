-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'approved', 'suspended');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'business';

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "businessId" TEXT,
ADD COLUMN     "deliveryCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryCodeHash" TEXT,
ADD COLUMN     "deliveryCodeOverrideNote" TEXT,
ADD COLUMN     "deliveryCodeVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "prepaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'pending',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sequence" SERIAL NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_ownerUserId_key" ON "businesses"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_businessId_idx" ON "api_keys"("businessId");

-- CreateIndex
CREATE INDEX "webhook_events_deliveredAt_failedAt_nextAttemptAt_idx" ON "webhook_events"("deliveredAt", "failedAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "webhook_events_businessId_createdAt_idx" ON "webhook_events"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "shipments_businessId_updatedAt_idx" ON "shipments"("businessId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_businessId_externalReference_key" ON "shipments"("businessId", "externalReference");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

