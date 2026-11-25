-- CreateEnum
CREATE TYPE "FairAppraisalCostKind" AS ENUM ('DAMAGE', 'MECHANICAL');

-- CreateTable
CREATE TABLE "fair_appraisal_costs" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "kind" "FairAppraisalCostKind" NOT NULL,
    "label" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fair_appraisal_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fair_appraisal_costs_appraisalId_idx" ON "fair_appraisal_costs"("appraisalId");

-- AddForeignKey
ALTER TABLE "fair_appraisal_costs" ADD CONSTRAINT "fair_appraisal_costs_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "fair_appraisals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
