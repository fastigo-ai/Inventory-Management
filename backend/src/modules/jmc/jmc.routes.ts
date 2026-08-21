import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
import {
  createJmc,
  getJmcs,
  getJmcById,
  updateJmc,
  deleteJmc,
  uploadJmcExcel
} from './jmc.controller';

const router = Router();

router.use(authenticate);

router.post('/upload', requireRole(['Admin', 'Site Manager']), upload.array('files'), uploadJmcExcel);

router.route('/')
  .get(getJmcs)
  .post(requireRole(['Admin', 'Site Manager', 'Contractor']), createJmc);

router.route('/:id')
  .get(getJmcById)
  .put(requireRole(['Admin', 'Site Manager', 'Contractor']), updateJmc)
  .delete(requireRole(['Admin', 'Site Manager', 'Contractor']), deleteJmc);

export default router;
