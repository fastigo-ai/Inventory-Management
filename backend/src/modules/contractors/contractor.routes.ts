import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { 
  getContractors, 
  createContractor, 
  getAssignments, 
  createAssignment, 
  assignContractor, 
  getContractorById, 
  getAssignmentById,
  updateAssignment,
  cancelAssignment,
  updateContractor, 
  deleteContractor, 
  exportTemplate, 
  importContractors, 
  getContractorReturns, 
  createContractorReturn,
  getContractorReturnById,
  updateContractorReturn,
  deleteContractorReturn,
  bulkImportContractorReturns,
  importContractorAssignments,
  exportContractorAssignments,
  getContractorTransactions,
  getAssignmentSummary,
  getContractorAggregatedQuantities
} from './contractor.controller';

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

router.get('/assignments/summary', getAssignmentSummary);
router.get('/assignments/export', exportContractorAssignments);

router.route('/assignments/:id')
  .get(getAssignmentById)
  .put(updateAssignment);

router.patch('/assignments/:id/cancel', cancelAssignment);

router.post('/assignments/import', uploadCsv.single('file'), importContractorAssignments);

router.post('/returns/import', uploadCsv.single('file'), bulkImportContractorReturns);

router.route('/returns')
  .get(getContractorReturns)
  .post(createContractorReturn);

router.route('/returns/:id')
  .get(getContractorReturnById)
  .put(updateContractorReturn)
  .delete(deleteContractorReturn);

router.get('/:id/aggregated-quantities', getContractorAggregatedQuantities);

router.route('/:id')
  .get(getContractorById)
  .put(updateContractor)
  .delete(deleteContractor);

router.route('/:id/assign')
  .patch(assignContractor);

router.get('/:id/transactions', getContractorTransactions);

export default router;
