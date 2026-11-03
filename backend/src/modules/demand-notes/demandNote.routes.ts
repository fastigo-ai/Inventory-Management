import express from 'express';
import {
  createDemandNote,
  getDemandNotes,
  getDemandNoteById,
  updateDemandNote,
  deleteDemandNote,
  getContextData,
  getContextDataBatch,
  downloadSampleCSV,
  importDemandNotes,
  revokeDemandNote,
  cancelDemandNote,
  getDemandNoteIssuanceStatus
} from './demandNote.controller';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticate);

const allRoles = ['Admin', 'Site Manager', 'Project Manager', 'Project Director', 'Store Manager', 'System Admin'];
const executiveRoles = ['Admin', 'Project Director', 'System Admin'];

router.get('/context', requireRole(allRoles), getContextData);
router.post('/context/batch', requireRole(allRoles), getContextDataBatch);
router.get('/sample-csv', requireRole(allRoles), downloadSampleCSV);
router.post('/import', requireRole(allRoles), upload.single('file'), importDemandNotes);

router.post('/', requireRole(allRoles), upload.single('file'), createDemandNote);
router.get('/', getDemandNotes);
router.get('/:id', getDemandNoteById);
router.get('/:id/issuance-status', requireRole(allRoles), getDemandNoteIssuanceStatus);
router.post('/:id/revoke', requireRole(executiveRoles), revokeDemandNote);
router.post('/:id/cancel', requireRole(executiveRoles), cancelDemandNote);
router.put('/:id', requireRole(allRoles), upload.single('file'), updateDemandNote);
router.delete('/:id', requireRole(['Admin', 'Site Manager']), deleteDemandNote);

export default router;
