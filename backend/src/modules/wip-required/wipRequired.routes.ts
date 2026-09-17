import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

import os from 'os';

const uploadMemory = multer({ storage: multer.memoryStorage() });
const uploadDisk = multer({ dest: os.tmpdir() });
import {
  createWipRequired,
  getWipRequireds,
  getWipRequiredById,
  updateWipRequired,
  deleteWipRequired,
  uploadWipRequiredExcel
} from './wipRequired.controller';

import {
  uploadWipRequiredStaging,
  getStagingPreview,
  exportStagingErrors,
  commitStagingData
} from './wipRequiredStaging.controller';

const router = Router();

router.use(authenticate);

// Legacy memory-based upload (deprecated for bulk, kept for backwards compatibility if needed)
router.post('/upload', requireRole(['Admin', 'Site Manager']), uploadMemory.array('files'), uploadWipRequiredExcel);

// New Staging architecture (Disk-based)
router.post('/upload/staging', requireRole(['Admin', 'Site Manager']), uploadDisk.array('files'), uploadWipRequiredStaging);
router.get('/upload/staging/:sessionId', requireRole(['Admin', 'Site Manager']), getStagingPreview);
router.get('/upload/staging/:sessionId/export-errors', requireRole(['Admin', 'Site Manager']), exportStagingErrors);
router.post('/upload/commit/:sessionId', requireRole(['Admin', 'Site Manager']), commitStagingData);

router.route('/')
  .get(getWipRequireds)
  .post(requireRole(['Admin', 'Site Manager', 'Contractor']), uploadMemory.single('file'), createWipRequired);

router.route('/:id')
  .get(getWipRequiredById)
  .put(requireRole(['Admin', 'Site Manager', 'Contractor']), uploadMemory.single('file'), updateWipRequired)
  .delete(requireRole(['Admin', 'Site Manager']), deleteWipRequired);

export default router;
