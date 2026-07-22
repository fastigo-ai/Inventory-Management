import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { createDI, getDIs, getDIById, updateDIStatus, receiveDI, updateDI, exportDIs, importDIs } from './di.controller';

import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/dis/' });

router.use(authenticate);

router.route('/')
  .post(upload.array('files', 10), createDI)
  .get(getDIs);

router.get('/export', exportDIs);
router.post('/import', upload.single('file'), importDIs);

router.route('/:id')
  .get(getDIById)
  .put(upload.array('files', 10), updateDI);

router.route('/:id/status')
  .patch(updateDIStatus);

router.route('/:id/receive')
  .post(receiveDI);

export default router;
