-- Business rate cards: custom pricing (parcel sizes, outer-area surcharge,
-- express) for one business. Businesses without one keep standard prices.
CREATE TABLE "business_rate_cards" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mediumKumasiPrice" DECIMAL(10,2) NOT NULL DEFAULT 70,
    "bigKumasiPrice" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "bigPlusKumasiPrice" DECIMAL(10,2) NOT NULL DEFAULT 150,
    "roundTo" DECIMAL(10,2) NOT NULL DEFAULT 5,
    "outskirtsFee" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "outskirtsAreas" JSONB NOT NULL DEFAULT '[]',
    "expressMultiplier" DECIMAL(6,3) NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_rate_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_rate_cards_businessId_key" ON "business_rate_cards"("businessId");

ALTER TABLE "business_rate_cards" ADD CONSTRAINT "business_rate_cards_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- How each rate-card delivery's fee was worked out.
ALTER TABLE "shipments" ADD COLUMN "sizeCategory" TEXT;
ALTER TABLE "shipments" ADD COLUMN "baseFee" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN "outskirtsFee" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN "rateCardTerms" JSONB;
ALTER TABLE "shipments" ADD COLUMN "originalFee" DECIMAL(10,2);
ALTER TABLE "shipments" ADD COLUMN "sizeCorrectedAt" TIMESTAMP(3);

-- Shopyos gets the rate card. Outer areas start empty: ops add each one
-- (centre pin + radius) once its edges are confirmed. Until Shopyos sends a
-- size or express, its prices are unchanged.
INSERT INTO "business_rate_cards" ("id", "businessId", "updatedAt")
SELECT 'rc_' || "id", "id", CURRENT_TIMESTAMP FROM "businesses" WHERE LOWER("name") LIKE '%shopyos%'
ON CONFLICT ("businessId") DO NOTHING;
