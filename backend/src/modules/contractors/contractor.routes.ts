import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { getContractors, createContractor, getAssignments, createAssignment, assignContractor, getContractorById, updateContractor, deleteContractor, exportTemplate, importContractors, getContractorReturns, createContractorReturn, importContractorAssignments } from './contractor.controller';

const router = Router();
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/template', exportTemplate);
router.post('/import', uploadCsv.single('file'), importContractors);

router.route('/')
  .get(getContractors)
  .post(createContractor);

router.route('/assignments')
  .get(getAssignments)
  .post(createAssignment);

router.post('/assignments/import', uploadCsv.single('file'), importContractorAssignments);

router.route('/returns')
  .get(getContractorReturns)
  .post(createContractorReturn);

router.route('/:id')
  .get(getContractorById)
  .put(updateContractor)
  .delete(deleteContractor);

router.route('/:id/assign')
  .patch(assignContractor);

export default router;
