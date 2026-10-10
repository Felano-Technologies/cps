-- CPS share per business, invoices for what businesses owe CPS
CREATE TYPE "InvoiceStatus" AS ENUM ('unpaid', 'paid', 'void');

ALTER TABLE "businesses" ADD COLUMN "cpsSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 85;

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "businessId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "deliveryCount" INTEGER NOT NULL,
    "totalFees" DECIMAL(12,2) NOT NULL,
    "cpsSharePercent" DECIMAL(5,2) NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_seq_key" ON "invoices"("seq");
CREATE INDEX "invoices_businessId_createdAt_idx" ON "invoices"("businessId", "createdAt");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipments" ADD COLUMN "invoiceId" TEXT;
CREATE INDEX "shipments_invoiceId_idx" ON "shipments"("invoiceId");
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
