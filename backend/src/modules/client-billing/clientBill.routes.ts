import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import {
  createClientBill,
  getClientBills,
  getClientBillById,
  updateClientBillStatus,
  updateClientBill
} from './clientBill.controller';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/', upload.any(), createClientBill);
router.put('/:id', upload.any(), updateClientBill); // Needs to be created
router.get('/', getClientBills);
router.get('/:id', getClientBillById);
router.patch('/:id/status', updateClientBillStatus);

export default router;
