-- Multi-pickup deliveries: one rider collects from several nearby shops,
-- then makes one drop-off. Priced as the first pickup's normal fee plus a flat
-- fee for each extra shop, which must be within a radius of the first pickup.
-- Rate-card businesses (Shopyos) only.

ALTER TABLE "business_rate_cards" ADD COLUMN "extraPickupFee" DECIMAL(10,2) NOT NULL DEFAULT 15;
ALTER TABLE "business_rate_cards" ADD COLUMN "extraPickupRadiusKm" DECIMAL(6,2) NOT NULL DEFAULT 3;

ALTER TABLE "shipments" ADD COLUMN "extraPickupsFee" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN "pickupLatitude" DECIMAL(10,7);
ALTER TABLE "shipments" ADD COLUMN "pickupLongitude" DECIMAL(10,7);

-- The other shops on the trip. The first pickup stays on the shipment row.
CREATE TABLE "shipment_pickups" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "reference" TEXT,
    "pickedUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_pickups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shipment_pickups_shipmentId_sequence_key" ON "shipment_pickups"("shipmentId", "sequence");

ALTER TABLE "shipment_pickups" ADD CONSTRAINT "shipment_pickups_shipmentId_fkey"
    FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
