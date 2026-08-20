-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "sellersNotifyWebhookUrl" TEXT;
ALTER TABLE "campaign_contacts" ADD COLUMN "sellersGroupNotifiedAt" TIMESTAMP(3);
