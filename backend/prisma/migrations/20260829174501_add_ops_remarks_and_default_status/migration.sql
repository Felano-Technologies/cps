-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "opsRemarks" TEXT,
ALTER COLUMN "status" SET DEFAULT 'awaiting_price';
