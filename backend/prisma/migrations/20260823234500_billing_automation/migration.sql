ALTER TABLE "Subscriber" ADD COLUMN "suspensionSource" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN "recurringBillingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscriber" ADD COLUMN "recurringAmount" DECIMAL;
ALTER TABLE "Subscriber" ADD COLUMN "billingCycleDays" INTEGER;
ALTER TABLE "Subscriber" ADD COLUMN "nextBillingDate" DATETIME;

CREATE TABLE "BillingCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DECIMAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "description" TEXT,
    "recurrenceKey" TEXT,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingCharge_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillingCharge_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chargeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingEvent_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "BillingCharge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BillingCharge_subscriberId_dueDate_idx" ON "BillingCharge"("subscriberId", "dueDate");
CREATE INDEX "BillingCharge_status_dueDate_idx" ON "BillingCharge"("status", "dueDate");
CREATE UNIQUE INDEX "BillingCharge_recurrenceKey_key" ON "BillingCharge"("recurrenceKey");
CREATE INDEX "BillingEvent_chargeId_createdAt_idx" ON "BillingEvent"("chargeId", "createdAt");
