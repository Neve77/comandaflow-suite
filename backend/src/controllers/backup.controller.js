const backupService = require('../services/backup.service');

const list = async (req, res, next) => {
  try {
    const backups = await backupService.listBackups();
    res.json({ backups });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const backup = await backupService.createBackup();
    res.status(201).json({ backup });
  } catch (error) {
    next(error);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await backupService.restoreBackup(req.validated.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, restore };
