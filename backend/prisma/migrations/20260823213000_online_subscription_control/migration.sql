ALTER TABLE "Subscriber" ADD COLUMN "suspensionMode" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN "accessUntil" DATETIME;
ALTER TABLE "Subscriber" ADD COLUMN "customerMessage" TEXT;
ALTER TABLE "Subscriber" ADD COLUMN "suspendedAt" DATETIME;

CREATE TABLE "LicenseInstallation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "deviceName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    CONSTRAINT "LicenseInstallation_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "LicenseInstallation_subscriptionId_installationId_key" ON "LicenseInstallation"("subscriptionId", "installationId");
CREATE INDEX "LicenseInstallation_subscriptionId_active_idx" ON "LicenseInstallation"("subscriptionId", "active");
