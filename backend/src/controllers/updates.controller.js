const updateService = require('../services/app-update.service');

const latest = async (req, res, next) => {
  try {
    return res.json(await updateService.getLatest(req.validated.currentVersion));
  } catch (error) { return next(error); }
};

const downloadPublished = async (req, res, next) => {
  try {
    const published = await updateService.getPublishedFile(req.validated.id);
    if (!published) return res.status(404).json({ message: 'Atualizacao nao encontrada.' });
    res.set('Cache-Control', 'private, no-store');
    return res.download(published.filePath, published.manifest.fileName);
  } catch (error) { return next(error); }
};

const published = async (req, res, next) => {
  try {
    const current = await updateService.getPublished();
    return res.json({ published: current ? { manifest: current.manifest, signature: current.signature } : null });
  } catch (error) { return next(error); }
};

const startPublication = async (req, res, next) => {
  try {
    return res.status(201).json(updateService.startPublication(req.validated));
  } catch (error) { return next(error); }
};

const uploadPublication = async (req, res, next) => {
  try {
    if (!String(req.headers['content-type'] || '').startsWith('application/octet-stream')) {
      return res.status(415).json({ message: 'Envie o instalador como application/octet-stream.' });
    }
    const result = await updateService.receivePublication(req, req.validated.token);
    return res.status(201).json({ ...result, message: 'Atualizacao publicada para os restaurantes.' });
  } catch (error) { return next(error); }
};

const clientStatus = (req, res) => res.json(updateService.getClientState());

const check = async (req, res, next) => {
  try { return res.json(await updateService.checkNow()); } catch (error) { return next(error); }
};

const beginDownload = async (req, res, next) => {
  try { return res.status(202).json(await updateService.beginDownload()); } catch (error) { return next(error); }
};

const install = async (req, res, next) => {
  try { return res.json(await updateService.installDownloaded()); } catch (error) { return next(error); }
};

module.exports = {
  beginDownload,
  check,
  clientStatus,
  downloadPublished,
  install,
  latest,
  published,
  startPublication,
  uploadPublication,
};
