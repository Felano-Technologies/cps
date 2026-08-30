-- CreateTable
CREATE TABLE "rider_deductions" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "shipmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_deductions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rider_deductions" ADD CONSTRAINT "rider_deductions_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "rider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
