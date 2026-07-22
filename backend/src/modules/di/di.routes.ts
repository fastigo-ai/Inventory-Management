import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { createDI, getDIs, getDIById, updateDIStatus, receiveDI, updateDI, importDIs, deleteDI } from './di.controller';

import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/dis/' });
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/import', uploadCsv.single('file'), importDIs);

router.route('/')
  .post(upload.fields([
    { name: 'diLetterCopyUrl', maxCount: 1 },
    { name: 'inspectionReportCopyUrl', maxCount: 1 }
  ]), createDI)
  .get(getDIs);

router.route('/:id')
  .get(getDIById)
  .put(upload.fields([
    { name: 'diLetterCopyUrl', maxCount: 1 },
    { name: 'inspectionReportCopyUrl', maxCount: 1 }
  ]), updateDI)
  .delete(deleteDI);

router.route('/:id/status')
  .patch(updateDIStatus);

router.route('/:id/receive')
  .post(receiveDI);

export default router;
