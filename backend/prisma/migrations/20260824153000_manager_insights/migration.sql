CREATE TABLE "SubscriberOnboardingStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubscriberOnboardingStep_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SubscriberOnboardingStep_subscriberId_key_key" ON "SubscriberOnboardingStep"("subscriberId", "key");
CREATE INDEX "SubscriberOnboardingStep_subscriberId_completed_idx" ON "SubscriberOnboardingStep"("subscriberId", "completed");
