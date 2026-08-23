const fs = require('fs/promises');
const path = require('path');
const prisma = require('../infra/prisma/client');

const getDatabasePath = () => {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  const filePath = url.replace(/^file:/, '').replace(/^"|"$/g, '');
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(__dirname, '..', '..', 'prisma', filePath);
};

const getBackupDir = () => path.resolve(__dirname, '..', '..', 'backups');

const createBackup = async () => {
  const dbPath = getDatabasePath();
  const backupDir = getBackupDir();
  await fs.mkdir(backupDir, { recursive: true });

  // Consolida o WAL para garantir que a cópia do SQLite contenha as últimas transações.
  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');

  const filename = `comandaflow-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const destination = path.join(backupDir, filename);
  await fs.copyFile(dbPath, destination);
  const stat = await fs.stat(destination);

  return prisma.backupRecord.create({
    data: {
      filename,
      path: destination,
      size: stat.size
    }
  });
};

const listBackups = async () => {
  return prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' } });
};

const restoreBackup = async (id) => {
  const backup = await prisma.backupRecord.findUnique({ where: { id } });
  if (!backup) {
    const error = new Error('Backup nao encontrado');
    error.status = 404;
    throw error;
  }

  const backupDir = getBackupDir();
  const resolvedBackup = path.resolve(backup.path);
  if (!resolvedBackup.startsWith(backupDir)) {
    const error = new Error('Caminho de backup invalido');
    error.status = 400;
    throw error;
  }

  await fs.copyFile(resolvedBackup, getDatabasePath());
  return { restored: true, backup };
};

module.exports = { createBackup, listBackups, restoreBackup };
