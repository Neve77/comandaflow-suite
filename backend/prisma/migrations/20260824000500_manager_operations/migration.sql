ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorRecoveryCodes" TEXT;

ALTER TABLE "LicenseInstallation" ADD COLUMN "appVersion" TEXT;
ALTER TABLE "LicenseInstallation" ADD COLUMN "platform" TEXT;
ALTER TABLE "LicenseInstallation" ADD COLUMN "ip" TEXT;

CREATE TABLE "ManagerMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagerMessage_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MessageReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ManagerMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "SupportTicket_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SupportTicketComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ManagerMessage_subscriberId_active_createdAt_idx" ON "ManagerMessage"("subscriberId", "active", "createdAt");
CREATE UNIQUE INDEX "MessageReceipt_messageId_installationId_key" ON "MessageReceipt"("messageId", "installationId");
CREATE INDEX "SupportTicket_subscriberId_status_updatedAt_idx" ON "SupportTicket"("subscriberId", "status", "updatedAt");
CREATE INDEX "SupportTicketComment_ticketId_createdAt_idx" ON "SupportTicketComment"("ticketId", "createdAt");
