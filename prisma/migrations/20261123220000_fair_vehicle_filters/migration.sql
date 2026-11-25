ALTER TABLE "fair_vehicles" ADD COLUMN "condition" TEXT;
ALTER TABLE "fair_vehicles" ADD COLUMN "transmission" TEXT;
ALTER TABLE "fair_vehicles" ADD COLUMN "bodyType" TEXT;
ALTER TABLE "fair_vehicles" ADD COLUMN "mileageKm" INTEGER;
ALTER TABLE "fair_vehicles" ADD COLUMN "onPromotion" BOOLEAN NOT NULL DEFAULT false;
