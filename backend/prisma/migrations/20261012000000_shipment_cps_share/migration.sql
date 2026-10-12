-- Each business delivery keeps the CPS share agreed when it was booked, so
-- changing a business's share only affects deliveries booked afterwards.
ALTER TABLE "shipments" ADD COLUMN "cpsSharePercent" DECIMAL(5,2);

-- Existing business deliveries keep the share they were booked under:
-- the business's current share (all 85 today)...
UPDATE "shipments" s
SET "cpsSharePercent" = b."cpsSharePercent"
FROM "businesses" b
WHERE s."businessId" = b."id" AND s."cpsSharePercent" IS NULL;

-- ...or, if already invoiced, exactly the share on that invoice.
UPDATE "shipments" s
SET "cpsSharePercent" = i."cpsSharePercent"
FROM "invoices" i
WHERE s."invoiceId" = i."id";

-- Shopyos now pays CPS its full delivery price (Shopyos adds its own markup
-- for the buyer, which CPS never sees). Applies to deliveries booked from now
-- on; the deliveries stamped above keep 85%.
UPDATE "businesses" SET "cpsSharePercent" = 100 WHERE LOWER("name") LIKE '%shopyos%';
