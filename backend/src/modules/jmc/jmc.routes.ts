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
  uploadJmcExcel,
  sendJmcForApproval,
  approveJmc,
  rejectJmc
} from './jmc.controller';

import { exportJmcExcel } from './jmc.export';

const router = Router();

router.use(authenticate);

const allRoles = ['Admin', 'Site Manager', 'Project Manager', 'Project Director', 'Store Manager', 'System Admin', 'Contractor'];
const approvalRoles = ['Admin', 'Super Admin', 'Project Manager', 'Project Director', 'CEO'];

router.post('/upload', requireRole(allRoles), upload.array('files'), uploadJmcExcel);
router.get('/export/template', exportJmcExcel);

router.post('/:id/send-for-approval', requireRole(allRoles), sendJmcForApproval);
router.post('/:id/approve', requireRole(approvalRoles), approveJmc);
router.post('/:id/reject', requireRole(approvalRoles), rejectJmc);

router.route('/')
  .get(getJmcs)
  .post(requireRole(allRoles), upload.single('file'), createJmc);

router.route('/:id')
  .get(getJmcById)
  .put(requireRole(allRoles), upload.single('file'), updateJmc)
  .delete(requireRole(['Admin', 'Site Manager']), deleteJmc);

export default router;
