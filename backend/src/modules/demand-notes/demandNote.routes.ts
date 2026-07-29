import express from 'express';
import {
  createDemandNote,
  getDemandNotes,
  getDemandNoteById,
  updateDemandNote,
  deleteDemandNote,
  getContextData
} from './demandNote.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/context', authorize(['Site Portal']), getContextData);

router.post('/', authorize(['Site Portal']), createDemandNote);
router.get('/', authorize(['Site Portal']), getDemandNotes);
router.get('/:id', authorize(['Site Portal']), getDemandNoteById);
router.put('/:id', authorize(['Site Portal']), updateDemandNote);
router.delete('/:id', authorize(['Site Portal']), deleteDemandNote);

export default router;
