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

import { exportJmcExcel } from './jmc.export';

const router = Router();

router.use(authenticate);

const allRoles = ['Admin', 'Site Manager', 'Project Manager', 'Project Director', 'Store Manager', 'System Admin', 'Contractor'];

router.post('/upload', requireRole(allRoles), upload.array('files'), uploadJmcExcel);
router.get('/export/template', exportJmcExcel);

router.route('/')
  .get(getJmcs)
  .post(requireRole(allRoles), upload.single('file'), createJmc);

router.route('/:id')
  .get(getJmcById)
  .put(requireRole(allRoles), upload.single('file'), updateJmc)
  .delete(requireRole(['Admin', 'Site Manager']), deleteJmc);

export default router;
