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
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticate);

router.get('/context', authorize(['Site Portal']), getContextData);
router.get('/sample-csv', authorize(['Site Portal']), downloadSampleCSV);
router.post('/import', authorize(['Site Portal']), upload.single('file'), importDemandNotes);

router.post('/', authorize(['Site Portal']), upload.single('file'), createDemandNote);
router.get('/', authorize(['Site Portal']), getDemandNotes);
router.get('/:id', authorize(['Site Portal']), getDemandNoteById);
router.put('/:id', authorize(['Site Portal']), updateDemandNote);
router.delete('/:id', authorize(['Site Portal']), deleteDemandNote);

export default router;
