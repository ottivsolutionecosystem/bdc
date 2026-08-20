-- AlterTable
ALTER TABLE "users" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaign_import_sessions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_import_sessions_campaignId_idx" ON "campaign_import_sessions"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_import_sessions_expiresAt_idx" ON "campaign_import_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "campaign_import_sessions" ADD CONSTRAINT "campaign_import_sessions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
