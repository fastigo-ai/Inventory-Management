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

router.get('/context', requireRole(['Site Portal']), getContextData);
router.get('/sample-csv', requireRole(['Site Portal']), downloadSampleCSV);
router.post('/import', requireRole(['Site Portal']), upload.single('file'), importDemandNotes);

router.post('/', requireRole(['Site Portal']), upload.single('file'), createDemandNote);
router.get('/', getDemandNotes);
router.get('/:id', getDemandNoteById);
router.put('/:id', requireRole(['Site Portal', 'Project Manager Portal', 'Project Director Portal']), updateDemandNote);
router.delete('/:id', requireRole(['Site Portal']), deleteDemandNote);

export default router;
