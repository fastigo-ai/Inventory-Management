import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
import {
  createWip,
  getWips,
  getWipById,
  updateWip,
  deleteWip,
  uploadWipExcel
} from './wip.controller';

const router = Router();

router.use(authenticate);

router.post('/upload', requireRole(['Admin', 'Site Manager']), upload.array('files'), uploadWipExcel);

router.route('/')
  .get(getWips)
  .post(requireRole(['Admin', 'Site Manager', 'Contractor']), createWip);

router.route('/:id')
  .get(getWipById)
  .put(requireRole(['Admin', 'Site Manager']), updateWip)
  .delete(requireRole(['Admin', 'Site Manager']), deleteWip);

export default router;
