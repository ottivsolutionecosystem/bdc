-- CreateEnum
CREATE TYPE "FairPhotoSlot" AS ENUM ('FRONT', 'RIGHT', 'LEFT', 'REAR', 'DASHBOARD', 'DAMAGE');

-- CreateEnum
CREATE TYPE "TireCondition" AS ENUM ('GOOD', 'HALF', 'REPLACE');

-- AlterTable
ALTER TABLE "fair_appraisals" ADD COLUMN "preparationCostCents" INTEGER,
ADD COLUMN "tireFrontLeft" "TireCondition",
ADD COLUMN "tireFrontRight" "TireCondition",
ADD COLUMN "tireRearLeft" "TireCondition",
ADD COLUMN "tireRearRight" "TireCondition";

-- AlterTable
ALTER TABLE "fair_appraisal_photos" ADD COLUMN "slot" "FairPhotoSlot" NOT NULL DEFAULT 'DAMAGE';
