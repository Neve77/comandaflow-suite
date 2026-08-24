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
  licenseId: z.string().uuid().optional(),
});
const idSchema = z.object({ id: z.string().uuid(), licenseId: z.string().uuid().optional() });
const uploadSchema = z.object({ token: z.string().uuid() });
const publicationSchema = z.object({
  product: z.enum(['client', 'manager']).default('client'),
  version: z.string().trim().regex(versionPattern, 'Use o formato 2.3.0.'),
  releaseNotes: z.string().trim().min(3).max(4000),
  mandatory: z.boolean().default(false),
  fileName: z.string().trim().min(5).max(255).refine((value) => value.toLowerCase().endsWith('.exe'), 'Selecione um arquivo .exe.'),
  size: z.number().int().min(2).max(500 * 1024 * 1024),
  rollout: z.enum(['pilot', 'all']).default('all'),
  pilotSubscriberIds: z.array(z.string().uuid()).max(500).optional().default([]),
}).superRefine((data, context) => {
  const expected = data.product === 'manager' ? `ComandaFlow-Gestor-Setup-${data.version}` : `ComandaFlow-Setup-${data.version}`;
  if (data.fileName.toLowerCase() !== `${expected}.exe`.toLowerCase()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fileName'], message: `Selecione o instalador ${expected}.exe.` });
  }
  if (data.product === 'client' && data.rollout === 'pilot' && !data.pilotSubscriberIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pilotSubscriberIds'], message: 'Selecione ao menos um cliente de teste.' });
  }
});
const publishedSchema = z.object({ product: z.enum(['client', 'manager']).default('client') });

// Endpoints consultados pela internet pelos aplicativos dos restaurantes.
router.get('/latest', managerOnly, validate(latestSchema), updatesController.latest);
router.get('/download/:id', managerOnly, validate(idSchema), updatesController.downloadPublished);

// Publicação protegida no painel do proprietário.
router.get('/published', managerOnly, authenticate, authorize.permission('updates:read'), validate(publishedSchema), updatesController.published);
router.post('/publish/start', managerOnly, authenticate, authorize('proprietario', 'administrador'), validate(publicationSchema), updatesController.startPublication);
router.put('/publish/:token', managerOnly, authenticate, authorize('proprietario', 'administrador'), validate(uploadSchema), updatesController.uploadPublication);
router.patch('/published/control', managerOnly, authenticate, authorize('proprietario', 'administrador'), validate(z.object({ action: z.enum(['pause', 'resume', 'withdraw', 'promote', 'pilot']), pilotSubscriberIds: z.array(z.string().uuid()).max(500).optional().default([]) })), updatesController.controlPublication);
router.get('/manager/status', managerOnly, authenticate, authorize.permission('updates:read'), updatesController.managerStatus);
router.post('/manager/install', managerOnly, authenticate, authorize('proprietario', 'administrador'), updatesController.installManager);

// Controles locais do aplicativo instalado no restaurante.
router.get('/status', clientOnly, authenticate, authorize('administrador'), updatesController.clientStatus);
router.post('/check', clientOnly, authenticate, authorize('administrador'), updatesController.check);
router.post('/download', clientOnly, authenticate, authorize('administrador'), updatesController.beginDownload);
router.post('/install', clientOnly, authenticate, authorize('administrador'), updatesController.install);

module.exports = router;
