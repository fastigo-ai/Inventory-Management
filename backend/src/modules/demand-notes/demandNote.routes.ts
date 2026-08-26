import express from 'express';
import {
  createDemandNote,
  getDemandNotes,
  getDemandNoteById,
  updateDemandNote,
  deleteDemandNote,
  getContextData,
  downloadSampleCSV,
  importDemandNotes
} from './demandNote.controller';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticate);

const allRoles = ['Admin', 'Site Manager', 'Project Manager', 'Project Director', 'Store Manager', 'System Admin'];

router.get('/context', requireRole(allRoles), getContextData);
router.get('/sample-csv', requireRole(allRoles), downloadSampleCSV);
router.post('/import', requireRole(allRoles), upload.single('file'), importDemandNotes);

router.post('/', requireRole(allRoles), upload.single('file'), createDemandNote);
router.get('/', getDemandNotes);
router.get('/:id', getDemandNoteById);
router.put('/:id', requireRole(allRoles), updateDemandNote);
router.delete('/:id', requireRole(['Admin', 'Site Manager']), deleteDemandNote);

export default router;
// Triggering reload

