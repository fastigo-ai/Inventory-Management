import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });
import {
  createMhrov,
  updateMhrov,
  getMhrovs,
  exportMhrovs,
  importMhrovs,
  getMhrovById,
  getMhrovDashboardData,
  getPendingDIs,
  getDIPrefillData,
  getPurchaseInvoicePrefillData,
  createInwardEntry,
  updateInwardEntry,
  voidInwardEntry,
  getInwardEntryById,
  queryInwardEntries,
  getInwardFilterOptions,
  getAdminInwardEntries,
  getStockSummary,
  getAdminStockSummary,
  createStoreTransfer,
  getStoreTransfers,
  getStoreTransferById,
  updateStoreTransfer,
  deleteStoreTransfer,
  updateStoreTransferStatus,
  dispatchStoreTransfer,
  receiveStoreTransfer,
  importInwardRegistrations,
  getPendingStoreReceipts,
  getInwardRegister,
  approveStoreReceipt,
  importStoreTransfers,
  bulkImportInwardEntries,
  getStoreReceiptFilterOptions,
  importReceivedStoreTransfers,
  queryDILineItemsForMhrov
} from './store.controller';

const router = Router();

router.use(authenticate);

// Store Manager Routes
router.route('/di/pending').get(getPendingDIs);
router.route('/di/:diId/prefill').get(getDIPrefillData);
router.route('/pi/:invoiceId/prefill').get(getPurchaseInvoicePrefillData);

router.get('/receipts/filter-options', getStoreReceiptFilterOptions);
router.get('/receipts/pending', getPendingStoreReceipts);
router.get('/receipts/register', getInwardRegister);
router.put('/receipts/:id/approve', approveStoreReceipt);

router.route('/inventory/inward')
  .post(createInwardEntry)
  .get(queryInwardEntries);

router.get('/inventory/inward/filter-options', getInwardFilterOptions);

router.route('/inventory/inward/bulk-import').post(bulkImportInwardEntries);

router.post('/inventory/inward/import', upload.single('file'), importInwardRegistrations);

router.route('/inventory/stock-summary').get(getStockSummary);

router.route('/inventory/inward/:id')
  .get(getInwardEntryById)
  .put(updateInwardEntry)
  .delete(voidInwardEntry);

// Inter-Store Transfer Routes
router.route('/transfers')
  .post(createStoreTransfer)
  .get(getStoreTransfers);

router.route('/transfers/:id')
  .get(getStoreTransferById)
  .put(updateStoreTransfer)
  .delete(deleteStoreTransfer);

router.route('/transfers/:id/status')
  .put(updateStoreTransferStatus);

router.route('/transfers/:id/dispatch')
  .put(dispatchStoreTransfer);

router.route('/transfers/:id/receive')
  .put(receiveStoreTransfer);

router.post('/transfers/outward/import', upload.single('file'), importStoreTransfers);
router.post('/transfers/inward/import', upload.single('file'), importReceivedStoreTransfers);

// Admin Routes (Note: in a real app, you might secure these with an admin role check)
router.route('/admin/inventory/store-manager').get(getAdminInwardEntries);
router.route('/admin/inventory/stock-summary').get(getAdminStockSummary);


// MHROV Routes
router.get('/mhrov/di-items', queryDILineItemsForMhrov);
router.post('/mhrov', upload.single('document'), createMhrov);
router.get('/mhrov', getMhrovs);
router.get('/mhrov/export', exportMhrovs);
router.post('/mhrov/import', upload.single('file'), importMhrovs);
router.get('/mhrov/dashboard/data', getMhrovDashboardData);
router.route('/mhrov/:id').get(getMhrovById).put(upload.single('document'), updateMhrov);

export default router;
