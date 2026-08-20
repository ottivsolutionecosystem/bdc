-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'AGENT', 'SELLER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DispositionCategory" AS ENUM ('POSITIVE', 'CONVERSION', 'FOLLOW_UP', 'NO_INTEREST', 'NOT_REACHED');

-- CreateEnum
CREATE TYPE "ContactTemperature" AS ENUM ('HOT', 'WARM', 'FOLLOW_UP', 'COLD', 'NOT_REACHED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('UNTREATED', 'ATTEMPTING', 'FOLLOW_UP', 'TREATED', 'CONVERTED', 'NOT_REACHED');

-- CreateEnum
CREATE TYPE "PurchaseTimeline" AS ENUM ('NOW', 'WITHIN_30D', 'D60_90', 'NO_FORECAST');

-- CreateEnum
CREATE TYPE "EventInterest" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "AssignmentChangeReason" AS ENUM ('IMPORT', 'REDISTRIBUTE', 'MANUAL', 'AGENT_REMOVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "document" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "originCampaignId" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "originCampaignContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_agents" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_dispositions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "DispositionCategory" NOT NULL,
    "requiresNextContact" BOOLEAN NOT NULL DEFAULT false,
    "defaultTemperature" "ContactTemperature" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_dispositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_contacts" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "lastVehicle" TEXT,
    "lastPurchaseDate" TIMESTAMP(3),
    "assignedAgentId" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'UNTREATED',
    "temperature" "ContactTemperature" NOT NULL DEFAULT 'COLD',
    "temperatureManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextContactAt" TIMESTAMP(3),
    "finalDispositionId" TEXT,
    "notes" TEXT,
    "interestedInEvent" "EventInterest",
    "interestedInTrade" BOOLEAN,
    "currentVehicle" TEXT,
    "purchaseTimeline" "PurchaseTimeline",
    "transferredToSales" BOOLEAN NOT NULL DEFAULT false,
    "lockedByUserId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_contact_attempts" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "dispositionId" TEXT NOT NULL,
    "statusAfterAttempt" "ContactStatus" NOT NULL,
    "notes" TEXT,
    "contacted" BOOLEAN NOT NULL,
    "nextContactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_contact_assignment_history" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "fromAgentId" TEXT,
    "toAgentId" TEXT,
    "reason" "AssignmentChangeReason" NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_contact_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_imports" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL,
    "ignored" INTEGER NOT NULL,
    "invalid" INTEGER NOT NULL,
    "duplicated" INTEGER NOT NULL,
    "columnMapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_transfers" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "dispositionId" TEXT,
    "notes" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_distribution_state" (
    "campaignId" TEXT NOT NULL,
    "lastAgentId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_distribution_state_pkey" PRIMARY KEY ("campaignId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "opportunities_customerId_idx" ON "opportunities"("customerId");

-- CreateIndex
CREATE INDEX "opportunities_sellerId_idx" ON "opportunities"("sellerId");

-- CreateIndex
CREATE INDEX "opportunities_originCampaignId_idx" ON "opportunities"("originCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_originCampaignContactId_key" ON "appointments"("originCampaignContactId");

-- CreateIndex
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");

-- CreateIndex
CREATE INDEX "appointments_sellerId_idx" ON "appointments"("sellerId");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_idx" ON "appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_agents_campaignId_active_idx" ON "campaign_agents"("campaignId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_agents_campaignId_userId_key" ON "campaign_agents"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "campaign_dispositions_category_idx" ON "campaign_dispositions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_dispositions_campaignId_code_key" ON "campaign_dispositions"("campaignId", "code");

-- CreateIndex
CREATE INDEX "campaign_contacts_campaignId_assignedAgentId_status_idx" ON "campaign_contacts"("campaignId", "assignedAgentId", "status");

-- CreateIndex
CREATE INDEX "campaign_contacts_campaignId_nextContactAt_idx" ON "campaign_contacts"("campaignId", "nextContactAt");

-- CreateIndex
CREATE INDEX "campaign_contacts_campaignId_status_idx" ON "campaign_contacts"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_contacts_phoneNormalized_idx" ON "campaign_contacts"("phoneNormalized");

-- CreateIndex
CREATE INDEX "campaign_contacts_finalDispositionId_idx" ON "campaign_contacts"("finalDispositionId");

-- CreateIndex
CREATE INDEX "campaign_contacts_lockExpiresAt_idx" ON "campaign_contacts"("lockExpiresAt");

-- CreateIndex
CREATE INDEX "campaign_contact_attempts_contactId_attemptNumber_idx" ON "campaign_contact_attempts"("contactId", "attemptNumber");

-- CreateIndex
CREATE INDEX "campaign_contact_attempts_campaignId_agentId_idx" ON "campaign_contact_attempts"("campaignId", "agentId");

-- CreateIndex
CREATE INDEX "campaign_contact_assignment_history_contactId_idx" ON "campaign_contact_assignment_history"("contactId");

-- CreateIndex
CREATE INDEX "campaign_imports_campaignId_idx" ON "campaign_imports"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_transfers_contactId_idx" ON "campaign_transfers"("contactId");

-- CreateIndex
CREATE INDEX "campaign_transfers_sellerId_idx" ON "campaign_transfers"("sellerId");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_originCampaignId_fkey" FOREIGN KEY ("originCampaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_originCampaignContactId_fkey" FOREIGN KEY ("originCampaignContactId") REFERENCES "campaign_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_agents" ADD CONSTRAINT "campaign_agents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_agents" ADD CONSTRAINT "campaign_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_dispositions" ADD CONSTRAINT "campaign_dispositions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_finalDispositionId_fkey" FOREIGN KEY ("finalDispositionId") REFERENCES "campaign_dispositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_attempts" ADD CONSTRAINT "campaign_contact_attempts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "campaign_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_attempts" ADD CONSTRAINT "campaign_contact_attempts_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_attempts" ADD CONSTRAINT "campaign_contact_attempts_dispositionId_fkey" FOREIGN KEY ("dispositionId") REFERENCES "campaign_dispositions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_assignment_history" ADD CONSTRAINT "campaign_contact_assignment_history_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "campaign_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_assignment_history" ADD CONSTRAINT "campaign_contact_assignment_history_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_assignment_history" ADD CONSTRAINT "campaign_contact_assignment_history_toAgentId_fkey" FOREIGN KEY ("toAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contact_assignment_history" ADD CONSTRAINT "campaign_contact_assignment_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_imports" ADD CONSTRAINT "campaign_imports_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_imports" ADD CONSTRAINT "campaign_imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_transfers" ADD CONSTRAINT "campaign_transfers_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "campaign_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_transfers" ADD CONSTRAINT "campaign_transfers_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_transfers" ADD CONSTRAINT "campaign_transfers_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_transfers" ADD CONSTRAINT "campaign_transfers_dispositionId_fkey" FOREIGN KEY ("dispositionId") REFERENCES "campaign_dispositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_transfers" ADD CONSTRAINT "campaign_transfers_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_distribution_state" ADD CONSTRAINT "campaign_distribution_state_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
