import { Router } from 'express';
import multer from 'multer';
import { createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById, exportPurchaseOrders, importPurchaseOrders } from './purchase.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

const upload = multer({ dest: 'uploads/purchases/' });
const uploadCsv = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all purchase routes
router.use(authenticate);

router.post('/orders/import', uploadCsv.single('file'), importPurchaseOrders);
router.get('/orders/export', exportPurchaseOrders);
router.post('/orders', upload.array('files', 10), createPurchaseOrder);
router.get('/orders', getPurchaseOrders);
router.get('/orders/:id', getPurchaseOrderById);

export default router;
