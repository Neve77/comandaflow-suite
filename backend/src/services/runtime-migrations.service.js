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
  ];
  for (const [name, type] of additions) {
    if (!existing.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Subscriber" ADD COLUMN "${name}" ${type}`);
    }
  }
};

const ensureRuntimeSchema = async () => {
  await addMissingSubscriberColumns();
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
};

module.exports = ensureRuntimeSchema;
