import express from 'express';
import {
  createDemandNote,
  getDemandNotes,
  getDemandNoteById,
  updateDemandNote,
  deleteDemandNote,
  getContextData
} from './demandNote.controller';
import { requireAuth } from '../../core/middlewares/requireAuth';
import { requirePermission } from '../../core/middlewares/requirePermission';

const router = express.Router();

router.use(requireAuth);

router.get('/context', requirePermission('Site Portal'), getContextData);

router.post('/', requirePermission('Site Portal'), createDemandNote);
router.get('/', requirePermission('Site Portal'), getDemandNotes);
router.get('/:id', requirePermission('Site Portal'), getDemandNoteById);
router.put('/:id', requirePermission('Site Portal'), updateDemandNote);
router.delete('/:id', requirePermission('Site Portal'), deleteDemandNote);

export default router;
