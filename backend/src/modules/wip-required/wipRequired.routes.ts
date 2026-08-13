import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
import {
  createWipRequired,
  getWipRequireds,
  getWipRequiredById,
  updateWipRequired,
  deleteWipRequired,
  uploadWipRequiredExcel
} from './wipRequired.controller';

const router = Router();

router.use(authenticate);

router.post('/upload', requireRole(['Admin', 'Site Manager']), upload.array('files'), uploadWipRequiredExcel);

router.route('/')
  .get(getWipRequireds)
  .post(requireRole(['Admin', 'Site Manager', 'Contractor']), createWipRequired);

router.route('/:id')
  .get(getWipRequiredById)
  .put(requireRole(['Admin', 'Site Manager']), updateWipRequired)
  .delete(requireRole(['Admin', 'Site Manager']), deleteWipRequired);

export default router;
