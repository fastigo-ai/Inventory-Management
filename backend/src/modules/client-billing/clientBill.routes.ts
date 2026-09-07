import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import {
  createClientBill,
  getClientBills,
  getClientBillById,
  updateClientBillStatus,
  updateClientBill,
  getErectionReferences,
  getClientBillingLedger
} from './clientBill.controller';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/', upload.any(), createClientBill);
router.get('/ledger', getClientBillingLedger);
router.get('/erection-references', getErectionReferences);
router.get('/', getClientBills);
router.get('/:id', getClientBillById);
router.put('/:id', upload.any(), updateClientBill);
router.patch('/:id/status', updateClientBillStatus);

export default router;
