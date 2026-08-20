-- AlterTable
ALTER TABLE "campaign_contacts" ADD COLUMN "supervisorQueuedAt" TIMESTAMP(3);
ALTER TABLE "campaign_contacts" ADD COLUMN "supervisorQueuedById" TEXT;
ALTER TABLE "campaign_contacts" ADD COLUMN "supervisorQueueKind" TEXT;
ALTER TABLE "campaign_contacts" ADD COLUMN "supervisorQueueNote" TEXT;

-- AddForeignKey
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_supervisorQueuedById_fkey" FOREIGN KEY ("supervisorQueuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
