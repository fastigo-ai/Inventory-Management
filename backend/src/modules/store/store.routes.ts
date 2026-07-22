import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });
import {
  getPendingDIs,
  getDIPrefillData,
  getPurchaseInvoicePrefillData,
  createInwardEntry,
  updateInwardEntry,
  getInwardEntryById,
  queryInwardEntries,
  getAdminInwardEntries,
  getStockSummary,
  getAdminStockSummary,
  createStoreTransfer,
  getStoreTransfers,
  getStoreTransferById,
  updateStoreTransferStatus,
  dispatchStoreTransfer,
  receiveStoreTransfer,
  importInwardRegistrations
} from './store.controller';

const router = Router();

router.use(authenticate);

// Store Manager Routes
router.route('/di/pending').get(getPendingDIs);
router.route('/di/:diId/prefill').get(getDIPrefillData);
router.route('/pi/:invoiceId/prefill').get(getPurchaseInvoicePrefillData);

router.route('/inventory/inward')
  .post(createInwardEntry)
  .get(queryInwardEntries);

router.post('/inventory/inward/import', upload.single('file'), importInwardRegistrations);

router.route('/inventory/stock-summary').get(getStockSummary);

router.route('/inventory/inward/:id')
  .get(getInwardEntryById)
  .put(updateInwardEntry);

// Inter-Store Transfer Routes
router.route('/transfers')
  .post(createStoreTransfer)
  .get(getStoreTransfers);

router.route('/transfers/:id')
  .get(getStoreTransferById);

router.route('/transfers/:id/status')
  .put(updateStoreTransferStatus);

router.route('/transfers/:id/dispatch')
  .put(dispatchStoreTransfer);

router.route('/transfers/:id/receive')
  .put(receiveStoreTransfer);

// Admin Routes (Note: in a real app, you might secure these with an admin role check)
router.route('/admin/inventory/store-manager').get(getAdminInwardEntries);
router.route('/admin/inventory/stock-summary').get(getAdminStockSummary);

export default router;
