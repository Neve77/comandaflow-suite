const express = require('express');
const { z } = require('zod');
const updatesController = require('../../controllers/updates.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');
const clientOnly = require('../middleware/client.middleware');
const managerOnly = require('../middleware/manager.middleware');
const validate = require('../middleware/validate.middleware');

const router = express.Router();
const versionPattern = /^\d+\.\d+\.\d+$/;

const latestSchema = z.object({
  currentVersion: z.string().trim().regex(versionPattern, 'Versao atual invalida.'),
});
const idSchema = z.object({ id: z.string().uuid() });
const uploadSchema = z.object({ token: z.string().uuid() });
const publicationSchema = z.object({
  version: z.string().trim().regex(versionPattern, 'Use o formato 2.3.0.'),
  releaseNotes: z.string().trim().min(3).max(4000),
  mandatory: z.boolean().default(false),
  fileName: z.string().trim().min(5).max(255).refine((value) => value.toLowerCase().endsWith('.exe'), 'Selecione um arquivo .exe.'),
  size: z.number().int().min(2).max(500 * 1024 * 1024),
}).refine(
  (data) => data.fileName.includes(data.version),
  { path: ['fileName'], message: 'O nome do instalador deve conter a versao informada.' }
);

// Endpoints consultados pela internet pelos aplicativos dos restaurantes.
router.get('/latest', managerOnly, validate(latestSchema), updatesController.latest);
router.get('/download/:id', managerOnly, validate(idSchema), updatesController.downloadPublished);

// Publicação protegida no painel do proprietário.
router.get('/published', managerOnly, authenticate, authorize('proprietario'), updatesController.published);
router.post('/publish/start', managerOnly, authenticate, authorize('proprietario'), validate(publicationSchema), updatesController.startPublication);
router.put('/publish/:token', managerOnly, authenticate, authorize('proprietario'), validate(uploadSchema), updatesController.uploadPublication);

// Controles locais do aplicativo instalado no restaurante.
router.get('/status', clientOnly, authenticate, authorize('administrador'), updatesController.clientStatus);
router.post('/check', clientOnly, authenticate, authorize('administrador'), updatesController.check);
router.post('/download', clientOnly, authenticate, authorize('administrador'), updatesController.beginDownload);
router.post('/install', clientOnly, authenticate, authorize('administrador'), updatesController.install);

module.exports = router;
