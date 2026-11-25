-- CreateEnum
CREATE TYPE "FairTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "FairTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "fair_events" ADD COLUMN "vehicleGoal" INTEGER,
ADD COLUMN "budgetCents" INTEGER,
ADD COLUMN "captureGoalCents" INTEGER,
ADD COLUMN "capturedCents" INTEGER;

-- CreateTable
CREATE TABLE "fair_tasks" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT,
    "assigneeId" TEXT,
    "startsOn" DATE,
    "dueOn" DATE,
    "priority" "FairTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "FairTaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_expenses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "plannedCents" INTEGER,
    "actualCents" INTEGER,
    "spentOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fair_tasks_eventId_status_idx" ON "fair_tasks"("eventId", "status");

-- CreateIndex
CREATE INDEX "fair_tasks_eventId_dueOn_idx" ON "fair_tasks"("eventId", "dueOn");

-- CreateIndex
CREATE INDEX "fair_expenses_eventId_idx" ON "fair_expenses"("eventId");

-- AddForeignKey
ALTER TABLE "fair_tasks" ADD CONSTRAINT "fair_tasks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fair_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_tasks" ADD CONSTRAINT "fair_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_expenses" ADD CONSTRAINT "fair_expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fair_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
