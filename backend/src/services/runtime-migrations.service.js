const prisma = require('../infra/prisma/client');

const addMissingSubscriberColumns = async () => {
  const columns = await prisma.$queryRawUnsafe("PRAGMA table_info('Subscriber')");
  if (!columns.length) return;
  const existing = new Set(columns.map((column) => column.name));
  const additions = [
    ['suspensionMode', 'TEXT'],
    ['accessUntil', 'DATETIME'],
    ['customerMessage', 'TEXT'],
    ['suspendedAt', 'DATETIME'],
    ['suspensionSource', 'TEXT'],
    ['recurringBillingEnabled', 'BOOLEAN NOT NULL DEFAULT false'],
    ['recurringAmount', 'DECIMAL'],
    ['billingCycleDays', 'INTEGER'],
    ['nextBillingDate', 'DATETIME'],
  ];
  for (const [name, type] of additions) {
    if (!existing.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Subscriber" ADD COLUMN "${name}" ${type}`);
    }
  }
};

const addMissingColumns = async (table, additions) => {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info('${table}')`);
  if (!columns.length) return;
  const existing = new Set(columns.map((column) => column.name));
  for (const [name, type] of additions) {
    if (!existing.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type}`);
    }
  }
};

const ensureRuntimeSchema = async () => {
  await addMissingSubscriberColumns();
  await addMissingColumns('User', [
    ['twoFactorEnabled', 'BOOLEAN NOT NULL DEFAULT false'],
    ['twoFactorSecret', 'TEXT'],
    ['twoFactorRecoveryCodes', 'TEXT'],
  ]);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthSession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "ip" TEXT,
      "device" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      "revokedAt" DATETIME,
      "revokeReason" TEXT,
      CONSTRAINT "AuthSession_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AuthSession_userId_revokedAt_lastSeenAt_idx" ON "AuthSession"("userId", "revokedAt", "lastSeenAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt")');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SystemSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LicenseInstallation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subscriptionId" TEXT NOT NULL,
      "installationId" TEXT NOT NULL,
      "deviceName" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastSeenAt" DATETIME NOT NULL,
      CONSTRAINT "LicenseInstallation_subscriptionId_fkey"
        FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "LicenseInstallation_subscriptionId_installationId_key" ON "LicenseInstallation"("subscriptionId", "installationId")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "LicenseInstallation_subscriptionId_active_idx" ON "LicenseInstallation"("subscriptionId", "active")');
  await addMissingColumns('LicenseInstallation', [
    ['appVersion', 'TEXT'],
    ['platform', 'TEXT'],
    ['ip', 'TEXT'],
  ]);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BillingCharge" (
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
      CONSTRAINT "BillingCharge_subscriberId_fkey"
        FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "BillingCharge_subscriptionId_fkey"
        FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BillingEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "chargeId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "fromStatus" TEXT,
      "toStatus" TEXT,
      "message" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BillingEvent_chargeId_fkey"
        FOREIGN KEY ("chargeId") REFERENCES "BillingCharge"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BillingCharge_subscriberId_dueDate_idx" ON "BillingCharge"("subscriberId", "dueDate")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BillingCharge_status_dueDate_idx" ON "BillingCharge"("status", "dueDate")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "BillingCharge_recurrenceKey_key" ON "BillingCharge"("recurrenceKey")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BillingEvent_chargeId_createdAt_idx" ON "BillingEvent"("chargeId", "createdAt")');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ManagerMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subscriberId" TEXT,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "severity" TEXT NOT NULL DEFAULT 'info',
      "active" BOOLEAN NOT NULL DEFAULT true,
      "expiresAt" DATETIME,
      "createdBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ManagerMessage_subscriberId_fkey"
        FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MessageReceipt" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "messageId" TEXT NOT NULL,
      "installationId" TEXT NOT NULL,
      "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MessageReceipt_messageId_fkey"
        FOREIGN KEY ("messageId") REFERENCES "ManagerMessage"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportTicket" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "subscriberId" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'aberto',
      "priority" TEXT NOT NULL DEFAULT 'normal',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "resolvedAt" DATETIME,
      CONSTRAINT "SupportTicket_subscriberId_fkey"
        FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SupportTicketComment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ticketId" TEXT NOT NULL,
      "authorName" TEXT,
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SupportTicketComment_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ManagerMessage_subscriberId_active_createdAt_idx" ON "ManagerMessage"("subscriberId", "active", "createdAt")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "MessageReceipt_messageId_installationId_key" ON "MessageReceipt"("messageId", "installationId")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SupportTicket_subscriberId_status_updatedAt_idx" ON "SupportTicket"("subscriberId", "status", "updatedAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SupportTicketComment_ticketId_createdAt_idx" ON "SupportTicketComment"("ticketId", "createdAt")');
};

module.exports = ensureRuntimeSchema;
