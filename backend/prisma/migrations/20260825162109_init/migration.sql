-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'operations', 'admin', 'rider');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('motorbike', 'van', 'truck');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('available', 'en_route', 'loading', 'maintenance', 'offline');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ShipmentPriority" AS ENUM ('standard', 'high');

-- CreateEnum
CREATE TYPE "ShipmentSpeed" AS ENUM ('same_day', 'next_day', 'express');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('document', 'parcel', 'electronics', 'fragile', 'food', 'other');

-- CreateEnum
CREATE TYPE "PodMethod" AS ENUM ('signature', 'photo');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "vehicleType" "VehicleType",
    "currentStatus" "RiderStatus" NOT NULL DEFAULT 'offline',
    "currentLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "batchId" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'pending',
    "priority" "ShipmentPriority" NOT NULL DEFAULT 'standard',
    "speed" "ShipmentSpeed" NOT NULL DEFAULT 'next_day',
    "vehicleType" "VehicleType" NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "customerId" TEXT,
    "assignedRiderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderNumber" TEXT NOT NULL,
    "senderContact" TEXT,
    "pickupRegion" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "pickupDate" TEXT,
    "receiverName" TEXT NOT NULL,
    "receiverNumber" TEXT NOT NULL,
    "dropoffRegion" TEXT NOT NULL,
    "dropoffKumasiSubArea" TEXT,
    "dropoffLocation" TEXT NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL,
    "productFee" DECIMAL(10,2),
    "weightKg" DECIMAL(10,2),
    "podMethod" "PodMethod",
    "podRecipientName" TEXT,
    "additionalInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_status_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rider_profiles_userId_key" ON "rider_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_trackingCode_key" ON "shipments"("trackingCode");

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_assignedRiderId_fkey" FOREIGN KEY ("assignedRiderId") REFERENCES "rider_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_status_events" ADD CONSTRAINT "shipment_status_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
