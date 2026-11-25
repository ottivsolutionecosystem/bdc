-- CreateEnum
CREATE TYPE "FairEventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "FairVisitStage" AS ENUM ('WITH_SELLER', 'IN_APPRAISAL', 'WITH_FINANCE', 'AWAITING_DELIVERY', 'DELIVERED', 'LOST');

-- CreateEnum
CREATE TYPE "FairEntryChannel" AS ENUM ('WALK_IN', 'CAMPAIGN', 'RETURN');

-- CreateEnum
CREATE TYPE "FairAwarenessSource" AS ENUM ('INSTAGRAM', 'RADIO', 'REFERRAL', 'OUTDOOR', 'WHATSAPP', 'CALL_CAMPAIGN', 'PASSING_BY', 'OTHER');

-- CreateEnum
CREATE TYPE "FairArrivalMode" AS ENUM ('OWN_CAR', 'RIDESHARE', 'BUS', 'WALK', 'RIDE', 'OTHER');

-- CreateEnum
CREATE TYPE "FairAppraisalStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "FairDeliveryStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "fair_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "FairEventStatus" NOT NULL DEFAULT 'DRAFT',
    "campaignId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_vehicles" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "year" INTEGER,
    "plate" TEXT,
    "color" TEXT,
    "priceCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_visits" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "receptionistId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "financeUserId" TEXT,
    "deliveryUserId" TEXT,
    "companionCount" INTEGER NOT NULL DEFAULT 0,
    "entryChannel" "FairEntryChannel" NOT NULL,
    "awarenessSource" "FairAwarenessSource" NOT NULL,
    "arrivalMode" "FairArrivalMode" NOT NULL,
    "stage" "FairVisitStage" NOT NULL DEFAULT 'WITH_SELLER',
    "notes" TEXT,
    "lostReason" TEXT,
    "bankName" TEXT,
    "originCampaignId" TEXT,
    "originOpportunityId" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appraisalRequestedAt" TIMESTAMP(3),
    "transferredToFinanceAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deliveryRequestedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_visit_interests" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fair_visit_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_appraisals" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "appraiserId" TEXT,
    "status" "FairAppraisalStatus" NOT NULL DEFAULT 'REQUESTED',
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "fipeValueCents" INTEGER,
    "offerValueCents" INTEGER,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_appraisal_photos" (
    "id" TEXT NOT NULL,
    "appraisalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fair_appraisal_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_deliveries" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" "FairDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "fair_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fair_events_status_idx" ON "fair_events"("status");

-- CreateIndex
CREATE INDEX "fair_vehicles_eventId_active_idx" ON "fair_vehicles"("eventId", "active");

-- CreateIndex
CREATE INDEX "fair_visits_eventId_stage_idx" ON "fair_visits"("eventId", "stage");

-- CreateIndex
CREATE INDEX "fair_visits_sellerId_stage_idx" ON "fair_visits"("sellerId", "stage");

-- CreateIndex
CREATE INDEX "fair_visits_customerId_idx" ON "fair_visits"("customerId");

-- CreateIndex
CREATE INDEX "fair_visit_interests_visitId_idx" ON "fair_visit_interests"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "fair_visit_interests_visitId_vehicleId_key" ON "fair_visit_interests"("visitId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "fair_appraisals_visitId_key" ON "fair_appraisals"("visitId");

-- CreateIndex
CREATE INDEX "fair_appraisals_status_idx" ON "fair_appraisals"("status");

-- CreateIndex
CREATE INDEX "fair_appraisal_photos_appraisalId_idx" ON "fair_appraisal_photos"("appraisalId");

-- CreateIndex
CREATE UNIQUE INDEX "fair_deliveries_visitId_key" ON "fair_deliveries"("visitId");

-- CreateIndex
CREATE INDEX "fair_deliveries_status_idx" ON "fair_deliveries"("status");

-- AddForeignKey
ALTER TABLE "fair_events" ADD CONSTRAINT "fair_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_events" ADD CONSTRAINT "fair_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_vehicles" ADD CONSTRAINT "fair_vehicles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fair_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fair_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_receptionistId_fkey" FOREIGN KEY ("receptionistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_financeUserId_fkey" FOREIGN KEY ("financeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_deliveryUserId_fkey" FOREIGN KEY ("deliveryUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visits" ADD CONSTRAINT "fair_visits_originOpportunityId_fkey" FOREIGN KEY ("originOpportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visit_interests" ADD CONSTRAINT "fair_visit_interests_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "fair_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_visit_interests" ADD CONSTRAINT "fair_visit_interests_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fair_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_appraisals" ADD CONSTRAINT "fair_appraisals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "fair_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_appraisals" ADD CONSTRAINT "fair_appraisals_appraiserId_fkey" FOREIGN KEY ("appraiserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_appraisal_photos" ADD CONSTRAINT "fair_appraisal_photos_appraisalId_fkey" FOREIGN KEY ("appraisalId") REFERENCES "fair_appraisals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_deliveries" ADD CONSTRAINT "fair_deliveries_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "fair_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_deliveries" ADD CONSTRAINT "fair_deliveries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "fair_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_deliveries" ADD CONSTRAINT "fair_deliveries_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
